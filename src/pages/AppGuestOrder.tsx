import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import { supabase } from '../lib/supabase'

// 비회원 주문 조회 (2026-08-18) — 주문번호 + 주문 시 입력한 연락처로 조회.
// 서버 RPC(guest_order_lookup, security definer)가 두 값이 모두 일치할 때만 주문행을 돌려준다.

interface GuestOrderRow {
  order_name: string | null
  quantity: number
  amount: number
  status: string
  created_at: string
  delivery_memo: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  preparing: '상품 준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  cancelled: '취소됨',
  failed: '결제 실패',
}

const field =
  'w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring'

export default function AppGuestOrder() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [orderNo, setOrderNo] = useState(params.get('no') ?? '')
  const [phone, setPhone] = useState('')
  const [rows, setRows] = useState<GuestOrderRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const lookup = async () => {
    const no = orderNo.trim()
    const ph = phone.trim()
    if (!no || !ph) {
      setMessage('주문번호와 연락처를 모두 입력해 주세요.')
      return
    }
    setLoading(true)
    setMessage('')
    setRows(null)
    const { data, error } = await supabase.rpc('guest_order_lookup', { p_payment_id: no, p_phone: ph })
    setLoading(false)
    if (error) {
      setMessage('조회에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    const list = (data ?? []) as GuestOrderRow[]
    if (list.length === 0) {
      setMessage('일치하는 주문이 없습니다. 주문번호와 연락처를 확인해 주세요.')
      return
    }
    setRows(list)
  }

  // 주문 완료 화면에서 주문번호를 들고 넘어온 경우 안내만 — 연락처는 직접 입력해야 조회됨
  useEffect(() => {
    if (params.get('no')) setMessage('주문 시 입력한 연락처를 입력하면 주문 내역이 표시됩니다.')
  }, [params])

  const total = (rows ?? []).reduce((s, r) => s + r.amount, 0)

  return (
    <AppFrame>
      <BackHeader title="비회원 주문 조회" />
      <div className="px-5 py-6 space-y-3">
        <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="주문번호 (order_...)" className={field} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="주문 시 입력한 연락처 (010-0000-0000)" className={field} />
        <button
          onClick={() => void lookup()}
          disabled={loading}
          className="w-full rounded-control bg-ink text-paper font-bold text-[15px] py-4 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring"
        >
          {loading ? '조회 중…' : '주문 조회'}
        </button>
        {message && <p className="text-[13px] text-ink-soft leading-relaxed">{message}</p>}

        {rows && (
          <div className="border border-rule mt-2">
            <div className="px-4 py-3 border-b border-rule bg-quiet">
              <p className="text-[12px] text-ink-faint">주문일 {new Date(rows[0].created_at).toLocaleString('ko-KR')}</p>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="px-4 py-3 border-b border-rule last:border-b-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink truncate">{r.order_name ?? '주문 상품'}</p>
                  <p className="text-[12px] text-ink-soft mt-0.5">수량 {r.quantity} · {STATUS_LABEL[r.status] ?? r.status}</p>
                </div>
                <p className="text-[13.5px] font-bold tabular-nums text-ink shrink-0">{r.amount.toLocaleString('ko-KR')}원</p>
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-between bg-quiet">
              <span className="text-[13px] font-bold text-ink">합계</span>
              <span className="text-[14px] font-bold tabular-nums text-ink">{total.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        )}

        <p className="text-[12px] text-ink-faint leading-relaxed pt-2">
          문의: 02-897-8287 · beautyground.official@gmail.com{' '}
          <button onClick={() => navigate('/app/login')} className="text-ink underline underline-offset-2 focus:outline-none">
            회원 로그인
          </button>
        </p>
      </div>
    </AppFrame>
  )
}
