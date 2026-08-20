import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 직원 전용 구매 링크(/staff) 주문 접수 — 몰 orders 기록 + ERP erp_sales·재고차감을 한 번에 처리.
// ERP 쪽은 [직원가-포스제외|정상가:NNNN] 태그로 남겨서, 정산 시(server/config/settlementMethods.js)
// 브랜드는 정상가 기준으로 정확히 정산받고 AK수수료 계산에서만 제외되게 한다(오프라인 직원가와 동일 원리).
// 온라인 주문은 특정 매장 픽업이 아니므로 재고·정산은 광명점 기준으로 고정한다.
const MALL_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const MALL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ERP_URL = process.env.ERP_SUPABASE_URL || 'https://ndhxicsfgaeqduxtqmmj.supabase.co'
const ERP_KEY = process.env.ERP_SUPABASE_SECRET_KEY
const ERP_STORE = '광명'

interface StaffOrderItem {
  product_id: string
  partner_id: string | null
  name: string
  brand_name: string
  qty: number
  employee_price: number
  normal_price: number
}

function kstDateParts() {
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())}`
  const time = `${pad(kst.getHours())}:${pad(kst.getMinutes())}`
  return `${date} (${days[kst.getDay()]}) ${time}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'POST 요청만 허용됩니다.' })
    return
  }
  if (!MALL_KEY || !ERP_KEY) {
    res.status(500).json({ ok: false, reason: '서버 환경변수 누락 (SUPABASE_SERVICE_ROLE_KEY 또는 ERP_SUPABASE_SECRET_KEY)' })
    return
  }

  const { items, name, phone, address, addressDetail, memo } = req.body as {
    items: StaffOrderItem[]
    name: string
    phone: string
    address: string
    addressDetail?: string
    memo?: string
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ ok: false, reason: '품목이 없습니다.' })
    return
  }
  if (!name?.trim() || !phone?.trim() || !address?.trim()) {
    res.status(400).json({ ok: false, reason: '이름·연락처·배송지를 모두 입력해 주세요.' })
    return
  }

  const mall = createClient(MALL_URL, MALL_KEY)
  const erp = createClient(ERP_URL, ERP_KEY)

  const total = items.reduce((s, i) => s + i.employee_price * i.qty, 0)
  const paymentId = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const orderName = items.length > 1 ? `[직원가] ${items[0].name} 외 ${items.length - 1}건` : `[직원가] ${items[0].name}`
  const fullMemo = `배송지: ${address} ${addressDetail || ''}`.trim() + (memo?.trim() ? `\n${memo.trim()}` : '')

  const orderRows = items.map((i) => ({
    payment_id: paymentId,
    order_name: orderName,
    product_id: i.product_id,
    partner_id: i.partner_id,
    live_id: null,
    quantity: i.qty,
    amount: i.employee_price * i.qty,
    buyer_name: name.trim(),
    buyer_phone: phone.trim(),
    buyer_email: null,
    status: 'pending' as const,
    user_id: null,
    delivery_memo: fullMemo,
  }))

  const { error: orderErr } = await mall.from('orders').insert(orderRows)
  if (orderErr) {
    res.status(500).json({ ok: false, reason: `주문 접수 실패: ${orderErr.message}` })
    return
  }

  // ERP 판매기록·재고차감 — 실패해도 주문 자체는 이미 접수됐으니 로그만 남기고 계속 진행
  let erpOk = true
  for (const i of items) {
    try {
      const note = `[직원가-포스제외|정상가:${Math.round(i.normal_price)}]`
      const lineTotal = i.employee_price * i.qty
      const { data: lastRows } = await erp.from('erp_sales').select('no').order('no', { ascending: false }).limit(1)
      const no = (lastRows?.[0]?.no || 0) + 1

      const { error: saleErr } = await erp.from('erp_sales').insert([
        {
          no,
          date: kstDateParts(),
          brand: i.brand_name,
          name: i.name,
          qty: i.qty,
          price: i.employee_price,
          total: lineTotal,
          pay_method: '계좌이체',
          note,
          customer_name: '',
          phone: '',
          point_used: 0,
          point_earned: 0,
          final_pay: lineTotal,
          staff: '온라인(직원링크)',
          store: ERP_STORE,
          gender: '',
          age_group: '',
        },
      ])
      if (saleErr) { erpOk = false; console.error('[staff-order] erp_sales insert failed', i.name, saleErr.message); continue }

      const { data: prodRows } = await erp
        .from('erp_products')
        .select('id,name,stock')
        .eq('store', ERP_STORE)
        .eq('brand', i.brand_name)
      const hit = prodRows?.find((r) => String(r.name || '').trim() === i.name.trim())
      if (hit) {
        const before = parseInt(String(hit.stock ?? '').trim(), 10)
        if (!isNaN(before)) {
          await erp.from('erp_products').update({ stock: String(Math.max(0, before - i.qty)) }).eq('id', hit.id)
        }
      }
    } catch (e) {
      erpOk = false
      console.error('[staff-order] ERP sync exception', i.name, e)
    }
  }

  res.status(200).json({ ok: true, total, erpSynced: erpOk })
}
