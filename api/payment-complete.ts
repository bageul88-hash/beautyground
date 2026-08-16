import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 서버 전용 값 (Vercel 환경변수). 클라이언트로 절대 반환 금지.
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const PORTONE_SECRET = process.env.PORTONE_V2_API_SECRET
const RESEND_API_KEY = process.env.RESEND_API_KEY
const MAIL_FROM = process.env.ORDER_MAIL_FROM || 'onboarding@resend.dev'

// 배송정책 상수 — src/constants/index.ts 와 동일하게 유지할 것(불일치 시 정상결제가 거부되는 방향이라 안전).
// 2026-08-12 대표님 지시: 배송비 3,000원 · 3만원 이상 무료
const SHIPPING_FEE = 3000
const FREE_SHIPPING_THRESHOLD = 30000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'POST 요청만 허용됩니다.' })
    return
  }
  if (!SERVICE_ROLE || !PORTONE_SECRET) {
    res.status(500).json({
      ok: false,
      reason:
        '서버 환경변수 누락: SUPABASE_SERVICE_ROLE_KEY / PORTONE_V2_API_SECRET 를 Vercel 에 추가하세요.',
    })
    return
  }

  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  // 두 경로 지원: ①결제 직후 브라우저가 호출({paymentId}) ②포트원 V2 웹훅({type, data:{paymentId}})
  // 웹훅은 사용자가 결제창 닫고 이탈해도 서버가 직접 통보받아 주문확정·재고차감이 누락되지 않게 하는 안전망.
  // 위변조 걱정 없음 — 어느 경로든 아래에서 포트원 API로 실제 결제 상태·금액을 재조회해 검증함.
  const webhookType = (body as { type?: string } | null)?.type
  const paymentId =
    (body as { paymentId?: string } | null)?.paymentId ??
    (body as { data?: { paymentId?: string } } | null)?.data?.paymentId
  if (webhookType && webhookType !== 'Transaction.Paid') {
    // 결제완료 외 웹훅(Ready/Failed/Cancelled 등)은 주문 상태를 건드리지 않고 응답만
    res.status(200).json({ ok: true, skipped: webhookType })
    return
  }
  if (!paymentId) {
    res.status(400).json({ ok: false, reason: 'paymentId 가 필요합니다.' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 1) 이 결제(payment_id)에 속한 주문행 전부 조회 (장바구니 다건 주문은 상품별로 여러 행)
  const { data: orderRows, error: selErr } = await supabase
    .from('orders')
    .select('id, product_id, quantity, amount, status, order_name, buyer_name, buyer_email, live_id, products(name, price, sale_price)')
    .eq('payment_id', paymentId)

  if (selErr || !orderRows || orderRows.length === 0) {
    // 웹훅 경로는 200으로 응답 — 포트원 콘솔 '호출 테스트'(가짜 결제ID)와 재전송 폭주 방지.
    // 브라우저 검증 경로는 기존대로 404 유지(클라이언트가 실패를 알아야 함).
    res.status(webhookType ? 200 : 404).json({ ok: false, reason: '주문을 찾을 수 없습니다.' })
    return
  }
  if (orderRows[0].status === 'paid') {
    // 이미 처리된 결제(중복 콜백) — 성공으로 응답만
    res.status(200).json({ ok: true })
    return
  }
  // ⚠️ 결제 금액 위변조 방지 — 클라이언트가 orders.amount 에 써넣은 값을 절대 신뢰하지 않고,
  // 서버가 DB의 실제 상품가격(products.sale_price ?? price)·배송비·쿠폰으로 기대금액을 직접 재산출한다.
  // (예전엔 orderRows 의 amount 를 그대로 합산해, 손님이 30만원 상품을 100원으로 주문·결제할 수 있었음)
  type JoinedRow = {
    product_id: string | null
    quantity: number
    live_id?: string | null
    products?: { price?: number; sale_price?: number | null } | null
  }
  const rows = orderRows as unknown as JoinedRow[]

  // 1) 상품 소계 = Σ (실제 판매가 × 수량). product_id 없는 행(배송비/쿠폰 행)은 서버가 별도 재계산하므로 무시.
  let authoritativeSubtotal = 0
  for (const r of rows) {
    if (!r.product_id || !r.products) continue
    const unit = r.products.sale_price ?? r.products.price ?? 0
    authoritativeSubtotal += unit * (r.quantity as number)
  }

  // 2) 배송비 = 소계 기준 재계산 (클라이언트 배송비 행 무시)
  const shippingFee =
    authoritativeSubtotal > 0 && authoritativeSubtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0

  // 3) 라이브 쿠폰 할인 = DB 쿠폰으로 재계산 (활성·최소구매액 충족 시에만). 클라이언트 쿠폰 행 무시.
  let couponDiscount = 0
  const liveId = rows.find((r) => r.live_id)?.live_id ?? null
  if (liveId) {
    const { data: coupon } = await supabase
      .from('live_coupons')
      .select('discount_type, discount_value, min_purchase, active')
      .eq('live_id', liveId)
      .eq('active', true)
      .maybeSingle()
    const c = coupon as { discount_type?: string; discount_value?: number; min_purchase?: number } | null
    if (c && c.discount_value && authoritativeSubtotal >= (c.min_purchase ?? 0)) {
      const raw =
        c.discount_type === 'percent'
          ? Math.round((authoritativeSubtotal * c.discount_value) / 100)
          : c.discount_value
      couponDiscount = Math.min(raw, authoritativeSubtotal)
    }
  }

  // 4) 적립금 사용액 = 결제 직전 redeem_points RPC로 이미 원자 확정된 값을 그대로 신뢰(라이브쿠폰과 동일 관례 —
  //    클라이언트가 만든 order 행이 아니라 point_transactions 원장 자체를 조회).
  const { data: pointRows } = await supabase
    .from('point_transactions')
    .select('amount')
    .eq('payment_id', paymentId)
    .lt('amount', 0)
  const pointsDiscount = (pointRows ?? []).reduce((s, r) => s + Math.abs((r as { amount: number }).amount), 0)

  // 5) 가입 쿠폰(첫구매 등) 사용분 = user_coupons에서 이 결제로 확정된 쿠폰을 조회해 서버가 직접 재계산(클라이언트 금액 불신).
  const { data: usedCoupon } = await supabase
    .from('user_coupons')
    .select('id, coupon_templates(discount_type, discount_value, max_discount, min_order_amount)')
    .eq('payment_id', paymentId)
    .not('used_at', 'is', null)
    .maybeSingle()
  type CouponTemplate = { discount_type: string; discount_value: number; max_discount: number | null; min_order_amount: number }
  // supabase-js 타입 추론이 조인 결과를 배열로 보는 것과 실제 단일 객체 응답이 어긋나 unknown 경유 캐스팅(런타임 동작 동일)
  const ct = (usedCoupon as unknown as { coupon_templates?: CouponTemplate | null } | null)?.coupon_templates ?? null
  let signupCouponDiscount = 0
  let signupFreeShip = false
  if (ct && authoritativeSubtotal >= ct.min_order_amount) {
    if (ct.discount_type === 'free_shipping') {
      signupFreeShip = true
    } else if (ct.discount_type === 'percent') {
      const raw = Math.round((authoritativeSubtotal * ct.discount_value) / 100)
      signupCouponDiscount = Math.min(raw, ct.max_discount ?? raw, authoritativeSubtotal)
    } else {
      signupCouponDiscount = Math.min(ct.discount_value, authoritativeSubtotal)
    }
  }
  const finalShippingFee = signupFreeShip ? 0 : shippingFee

  const expectedAmount = authoritativeSubtotal + finalShippingFee - couponDiscount - pointsDiscount - signupCouponDiscount

  // 결제 실패/금액불일치 시 적립금·쿠폰 사용을 되돌리는 헬퍼(사용자가 손해보지 않게)
  const releaseRewards = async () => {
    if (pointsDiscount > 0) await supabase.from('point_transactions').delete().eq('payment_id', paymentId).lt('amount', 0)
    if (usedCoupon) await supabase.from('user_coupons').update({ used_at: null, payment_id: null }).eq('payment_id', paymentId)
  }

  // 2) 포트원 실제 결제 조회
  let payment: {
    status?: string
    amount?: { total?: number }
    pgTxId?: string
    transactionId?: string
  }
  try {
    const r = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${PORTONE_SECRET}` } }
    )
    if (!r.ok) {
      const text = await r.text()
      console.error('[payment-complete] portone lookup failed', r.status, text)
      res.status(200).json({ ok: false, reason: `포트원 결제 조회 실패 (${r.status})` })
      return
    }
    payment = await r.json()
  } catch (e) {
    console.error('[payment-complete] portone request error', e)
    res.status(200).json({ ok: false, reason: '포트원 결제 조회 요청에 실패했습니다.' })
    return
  }

  const paidStatus = payment?.status
  const paidAmount = payment?.amount?.total
  const pgTxId = payment?.pgTxId ?? payment?.transactionId ?? null

  // 3) 검증: 결제완료 + 금액 일치 (위변조 방지, 여러 상품행의 합계와 비교)
  if (paidStatus !== 'PAID') {
    await supabase.from('orders').update({ status: 'failed' }).eq('payment_id', paymentId)
    await releaseRewards()
    res.status(200).json({ ok: false, reason: `결제 상태가 PAID 가 아닙니다. (${paidStatus ?? '알수없음'})` })
    return
  }
  if (paidAmount !== expectedAmount) {
    await supabase.from('orders').update({ status: 'failed' }).eq('payment_id', paymentId)
    await releaseRewards()
    res
      .status(200)
      .json({ ok: false, reason: `결제 금액 불일치 (기대 ${expectedAmount}, 실제 ${paidAmount})` })
    return
  }

  // 4) 성공 → 주문 확정
  const { error: updErr } = await supabase
    .from('orders')
    .update({ status: 'paid', pg_tx_id: pgTxId })
    .eq('payment_id', paymentId)

  if (updErr) {
    console.error('[payment-complete] order update failed', updErr)
    res.status(200).json({ ok: false, reason: '주문 상태 업데이트에 실패했습니다.' })
    return
  }

  // 5) 재고 차감 (배송비 행은 product_id 가 없으므로 제외)
  for (const row of orderRows) {
    if (!row.product_id) continue
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', row.product_id)
      .single()
    if (!product) continue
    const nextStock = Math.max(0, (product.stock as number) - (row.quantity as number))
    await supabase
      .from('products')
      .update({ stock: nextStock, ...(nextStock === 0 ? { status: 'sold_out' } : {}) })
      .eq('id', row.product_id)
  }

  // 6) 주문 확인 이메일 발송 (RESEND_API_KEY 없으면 조용히 건너뜀 — 결제 성공 응답을 막지 않음)
  const buyerEmail = orderRows.find((r) => r.buyer_email)?.buyer_email as string | undefined
  if (RESEND_API_KEY && buyerEmail) {
    try {
      const buyerName = (orderRows.find((r) => r.buyer_name)?.buyer_name as string | undefined) ?? '고객'
      const orderName = (orderRows[0].order_name as string | undefined) ?? '주문 상품'
      const itemLines = orderRows
        .map((r) => {
          const productName = (r as unknown as { products?: { name?: string } | null }).products?.name ?? r.order_name
          return `<tr><td style="padding:8px 0;">${productName}</td><td style="padding:8px 0;text-align:center;">${r.quantity}</td><td style="padding:8px 0;text-align:right;">${(r.amount as number).toLocaleString('ko-KR')}원</td></tr>`
        })
        .join('')
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `뷰티그라운드 <${MAIL_FROM}>`,
          to: [buyerEmail],
          subject: `[뷰티그라운드] 주문이 완료되었습니다 - ${orderName}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#b8924a;">주문이 완료되었습니다</h2>
              <p>${buyerName}님, 주문해 주셔서 감사합니다.</p>
              <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <thead><tr style="border-bottom:1px solid #e5e0d8;"><th style="text-align:left;padding:8px 0;">상품</th><th style="padding:8px 0;">수량</th><th style="text-align:right;padding:8px 0;">금액</th></tr></thead>
                <tbody>${itemLines}</tbody>
                <tfoot><tr style="border-top:1px solid #e5e0d8;font-weight:bold;"><td style="padding:8px 0;" colspan="2">총 결제금액</td><td style="text-align:right;padding:8px 0;">${expectedAmount.toLocaleString('ko-KR')}원</td></tr></tfoot>
              </table>
              <p style="color:#888;font-size:13px;margin-top:24px;">문의: beautyground.official@gmail.com</p>
            </div>
          `,
        }),
      })
    } catch (e) {
      console.error('[payment-complete] order email send failed', e)
      // 이메일 실패는 결제 성공 응답에 영향 주지 않음
    }
  }

  res.status(200).json({ ok: true })
}
