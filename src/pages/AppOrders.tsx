import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import { supabase } from '../lib/supabase'
import type { Order } from '../lib/types'
import ImagePlaceholder from '../components/common/ImagePlaceholder'

// 주문내역 — 같은 결제(payment_id) 단위로 묶어 보여준다.
// 결제 미완료(pending/failed) 행은 잔재이므로 표시하지 않는다.

interface OrderRow extends Order {
  products?: { name: string | null; thumbnail_url: string | null } | null
}

interface OrderGroup {
  paymentId: string
  createdAt: string
  status: Order['status']
  items: OrderRow[] // 배송비 행 제외
  shippingFee: number
  total: number
  trackingNumber: string | null
  trackingCarrier: string | null
}

// 배송 진행 상태는 전부 잉크(중립)로 — 지금 처리해야 할 것만(취소 요청) 신호색을 쓴다.
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  paid: { label: '결제완료', cls: 'bg-ink text-paper' },
  shipped: { label: '배송중', cls: 'bg-ink text-paper' },
  done: { label: '배송완료', cls: 'bg-quiet text-ink-soft' },
  cancelled: { label: '취소됨', cls: 'bg-quiet text-ink-faint' },
  cancel_requested: { label: '취소 요청됨', cls: 'bg-paper text-signal-red border border-signal-red' },
}
const VISIBLE_STATUSES = new Set(Object.keys(STATUS_BADGE))

function groupOrders(rows: OrderRow[]): OrderGroup[] {
  const byPayment = new Map<string, OrderRow[]>()
  for (const r of rows) {
    if (!VISIBLE_STATUSES.has(r.status)) continue
    const key = r.payment_id ?? r.id
    if (!byPayment.has(key)) byPayment.set(key, [])
    byPayment.get(key)!.push(r)
  }
  const groups: OrderGroup[] = []
  for (const [paymentId, list] of byPayment) {
    const items = list.filter((r) => r.order_name !== '배송비' && r.product_id)
    const shippingFee = list
      .filter((r) => r.order_name === '배송비' || !r.product_id)
      .reduce((s, r) => s + r.amount, 0)
    const total = list.reduce((s, r) => s + r.amount, 0)
    const first = items[0] ?? list[0]
    const tracked = list.find((r) => r.tracking_number)
    groups.push({
      paymentId,
      createdAt: first.created_at,
      status: first.status,
      items,
      shippingFee,
      total,
      trackingNumber: tracked?.tracking_number ?? null,
      trackingCarrier: tracked?.tracking_carrier ?? null,
    })
  }
  groups.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return groups
}

export default function AppOrders() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [groups, setGroups] = useState<OrderGroup[]>([])
  const [msg, setMsg] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoggedIn(false); setLoading(false); return }
    const { data } = await supabase
      .from('orders')
      .select('*, products(name, thumbnail_url)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(300)
    setGroups(groupOrders((data ?? []) as OrderRow[]))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const requestCancel = async (g: OrderGroup) => {
    if (!window.confirm('이 주문의 취소를 요청할까요?\n확인 후 취소가 확정됩니다.')) return
    setCancelling(g.paymentId)
    setMsg('')
    const { data, error } = await supabase.rpc('request_order_cancel', { p_payment_id: g.paymentId })
    setCancelling(null)
    if (error || !data) {
      setMsg('취소 요청에 실패했습니다. 고객센터(02-897-8287)로 연락해 주세요.')
      return
    }
    setGroups((prev) => prev.map((x) => (x.paymentId === g.paymentId ? { ...x, status: 'cancel_requested' } : x)))
  }

  if (loading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center text-ink-faint text-[14px]">불러오는 중...</div>
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-paper">
        <BackHeader title="주문 내역" />
        <div className="flex flex-col items-center justify-center px-8 pt-28 text-center">
          <p className="text-[15px] text-ink mb-2 font-bold">로그인이 필요해요</p>
          <p className="text-[13px] text-ink-faint mb-6">주문 내역은 로그인 후 확인할 수 있어요.</p>
          <button onClick={() => navigate('/app/login')} className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3.5 focus:outline-none focus-visible:shadow-ring">
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper pb-16">
      <BackHeader title="주문 내역" />

      {msg && (
        <div className="mx-4 mt-3 bg-paper border border-signal-red text-signal-red text-[12.5px] rounded-control px-4 py-3">{msg}</div>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 pt-28 text-center">
          <p className="text-[15px] text-ink font-bold mb-2">아직 주문 내역이 없어요</p>
          <p className="text-[13px] text-ink-faint mb-6">마음에 드는 상품을 찾아보세요.</p>
          <button onClick={() => navigate('/app/home')} className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3.5 focus:outline-none focus-visible:shadow-ring">
            쇼핑하러 가기
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-4">
          {groups.map((g) => {
            const badge = STATUS_BADGE[g.status] ?? STATUS_BADGE.paid
            const d = new Date(g.createdAt)
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
            return (
              <div key={g.paymentId} className="bg-paper border border-rule overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
                  <span className="text-[12.5px] text-ink-faint">{dateStr} 주문</span>
                  <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-control ${badge.cls}`}>{badge.label}</span>
                </div>

                <div className="divide-y divide-rule">
                  {g.items.map((it) => (
                    <Link
                      key={it.id}
                      to={it.product_id ? `/app/product/${it.product_id}` : '#'}
                      className="flex items-center gap-3 px-4 py-3 focus:outline-none focus-visible:shadow-ring"
                    >
                      <div className="w-14 h-14 bg-quiet overflow-hidden shrink-0">
                        {it.products?.thumbnail_url ? (
                          <img src={it.products.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <ImagePlaceholder />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] text-ink truncate">{it.products?.name ?? it.order_name ?? '상품'}</p>
                        <p className="text-[12px] text-ink-faint mt-0.5 tabular-nums">
                          {it.quantity}개 · {it.amount.toLocaleString('ko-KR')}원
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="px-4 py-3 bg-quiet border-t border-rule">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-ink-faint">
                      {g.shippingFee > 0 ? `배송비 ${g.shippingFee.toLocaleString('ko-KR')}원 포함` : '무료배송'}
                    </span>
                    <span className="text-[14.5px] font-bold tabular-nums text-ink">
                      총 {g.total.toLocaleString('ko-KR')}원
                    </span>
                  </div>

                  {g.trackingNumber && (
                    <p className="mt-2 text-[12.5px] text-ink-soft">
                      {g.trackingCarrier ? `${g.trackingCarrier} ` : ''}운송장 <b className="select-all">{g.trackingNumber}</b>
                    </p>
                  )}

                  {g.status === 'paid' && (
                    <button
                      onClick={() => requestCancel(g)}
                      disabled={cancelling === g.paymentId}
                      className="mt-3 w-full text-[13px] text-ink-soft rounded-control border border-rule py-2.5 bg-paper disabled:opacity-50 focus:outline-none focus-visible:shadow-ring"
                    >
                      {cancelling === g.paymentId ? '요청 중...' : '주문 취소 요청'}
                    </button>
                  )}
                  {g.status === 'cancel_requested' && (
                    <p className="mt-2 text-[12px] text-signal-red">확인 후 취소가 확정됩니다.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
