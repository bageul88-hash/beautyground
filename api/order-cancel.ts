import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 주문 취소 확정(환불) — 포트원 실취소 → 주문 상태 cancelled → 재고 복구까지 한 번에 처리.
// 호출 주체 3가지:
//  1) 관리자 / 2) 해당 주문 상품의 판매 파트너 — 상태 제한 없이 취소 확정 가능
//  3) 구매자 본인 — 배송 전(paid/cancel_requested)만 즉시 환불(2026-09-01).
//     회원은 Bearer 토큰의 user_id 일치로, 비회원은 주문번호 + 주문 시 입력한 연락처 일치로 확인한다.
//     배송이 시작된 뒤(shipped/done)에는 구매자가 직접 취소할 수 없고 취소 '요청'만 남긴다.
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const PORTONE_SECRET = process.env.PORTONE_V2_API_SECRET
const ADMIN_EMAILS = ['beautyground.official@gmail.com']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'POST 요청만 허용됩니다.' })
    return
  }
  if (!SERVICE_ROLE || !PORTONE_SECRET) {
    res.status(500).json({ ok: false, reason: '서버 환경변수 누락 (SUPABASE_SERVICE_ROLE_KEY / PORTONE_V2_API_SECRET)' })
    return
  }

  let body: unknown = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const paymentId = (body as { paymentId?: string } | null)?.paymentId
  const phone = (body as { phone?: string } | null)?.phone
  if (!paymentId) {
    res.status(400).json({ ok: false, reason: 'paymentId 가 필요합니다.' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: orderRows, error: selErr } = await supabase
    .from('orders')
    .select('id, product_id, partner_id, quantity, status, user_id, buyer_phone')
    .eq('payment_id', paymentId)
  if (selErr || !orderRows || orderRows.length === 0) {
    res.status(404).json({ ok: false, reason: '주문을 찾을 수 없습니다.' })
    return
  }

  const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  // 'seller' = 관리자·파트너(상태 제한 없음), 'buyer' = 구매자 본인(배송 전만)
  let role: 'seller' | 'buyer'

  if (token) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user) {
      res.status(401).json({ ok: false, reason: '인증에 실패했습니다.' })
      return
    }
    if (ADMIN_EMAILS.includes(user.email ?? '')) {
      role = 'seller'
    } else {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      const pid = partner?.id
      const owns = !!pid && orderRows.some((r) => r.partner_id === pid)
      const foreign = orderRows.some((r) => r.partner_id && r.partner_id !== pid)
      if (owns && !foreign) {
        role = 'seller'
      } else if (orderRows.every((r) => r.user_id === user.id)) {
        role = 'buyer' // 구매자 본인(회원)
      } else {
        res.status(403).json({ ok: false, reason: '이 주문을 취소할 권한이 없습니다.' })
        return
      }
    }
  } else {
    // 비회원 구매자 — 주문번호 + 주문 시 입력한 연락처가 모두 일치해야 한다
    const ph = digits(phone)
    const isGuestOrder = orderRows.every((r) => !r.user_id)
    const phoneMatch = ph.length >= 10 && orderRows.some((r) => digits(r.buyer_phone) === ph)
    if (!isGuestOrder || !phoneMatch) {
      res.status(403).json({ ok: false, reason: '주문번호 또는 연락처가 일치하지 않습니다.' })
      return
    }
    role = 'buyer'
  }

  // 구매자 본인은 배송 전에만 즉시 취소(환불)할 수 있다 — 배송 후에는 고객센터 접수
  if (role === 'buyer' && !orderRows.every((r) => ['paid', 'cancel_requested'].includes(r.status))) {
    res.status(200).json({
      ok: false,
      reason: '배송이 시작된 주문은 바로 취소할 수 없습니다. 고객센터(02-897-8287)로 문의해 주세요.',
    })
    return
  }

  if (orderRows.every((r) => r.status === 'cancelled')) {
    res.status(200).json({ ok: true, already: true })
    return
  }

  // 실결제가 있었던 주문이면 포트원 취소(환불) — pending/failed 는 결제 자체가 없으므로 상태만 변경
  const hadPayment = orderRows.some((r) => ['paid', 'cancel_requested', 'shipped', 'done'].includes(r.status))
  if (hadPayment) {
    try {
      const r = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
        method: 'POST',
        headers: { Authorization: `PortOne ${PORTONE_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: role === 'buyer' ? '구매자 취소 요청' : '판매자 취소 승인' }),
      })
      if (!r.ok) {
        const text = await r.text()
        // 이미 전액 취소된 결제면 그대로 진행 (멱등)
        if (!/ALREADY_CANCELLED|CANCELLED_PAYMENT/i.test(text)) {
          console.error('[order-cancel] portone cancel failed', r.status, text)
          res.status(200).json({ ok: false, reason: `포트원 환불에 실패했습니다 (${r.status}). 잠시 후 다시 시도해주세요.` })
          return
        }
      }
    } catch (e) {
      console.error('[order-cancel] portone request error', e)
      res.status(200).json({ ok: false, reason: '포트원 환불 요청에 실패했습니다.' })
      return
    }
  }

  const { error: updErr } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('payment_id', paymentId)
  if (updErr) {
    console.error('[order-cancel] order update failed', updErr)
    res.status(200).json({ ok: false, reason: '환불은 됐지만 주문 상태 변경에 실패했습니다. 새로고침 후 확인해주세요.' })
    return
  }

  // 재고 복구 — 결제 시 차감됐던 수량을 되돌린다 (배송비 행 등 product_id 없는 행 제외)
  if (hadPayment) {
    for (const row of orderRows) {
      if (!row.product_id) continue
      const { data: product } = await supabase
        .from('products')
        .select('stock, status')
        .eq('id', row.product_id)
        .single()
      if (!product) continue
      const nextStock = (product.stock as number) + (row.quantity as number)
      await supabase
        .from('products')
        .update({ stock: nextStock, ...(product.status === 'sold_out' && nextStock > 0 ? { status: 'on_sale' } : {}) })
        .eq('id', row.product_id)
    }
  }

  res.status(200).json({ ok: true })
}
