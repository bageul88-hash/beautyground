import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { comma, formatDateTime } from '../lib/format'

const DEPT_INFO: Record<string, { name: string; code: string }> = {
  hyundai: { name: '현대백화점', code: '4821' },
  ak: { name: 'AK플라자', code: '7936' },
}

const UNLOCK_PREFIX = 'bg_dept_unlock_'

interface DeptSaleRow {
  live_id: string
  live_title: string
  live_scheduled_at: string | null
  dept_key: string
  total_amount: number
  total_quantity: number
  order_count: number
}

// 백화점 지역 담당자용 — 정식 로그인 계정 없이 백화점별 코드로만 들어와 그 백화점 태그가 붙은
// 방송들의 판매수량/금액을 본다(LiveGate.tsx와 동일한 수준의 클라이언트 코드-게이트).
export default function DeptSalesPage() {
  const { key } = useParams<{ key: string }>()
  const info = key ? DEPT_INFO[key] : undefined

  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [rows, setRows] = useState<DeptSaleRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key) return
    setUnlocked(sessionStorage.getItem(UNLOCK_PREFIX + key) === DEPT_INFO[key]?.code)
  }, [key])

  useEffect(() => {
    if (!unlocked || !key) return
    let active = true
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('dept_live_sales_view')
        .select('*')
        .eq('dept_key', key)
        .order('live_scheduled_at', { ascending: false })
      if (!active) return
      setRows((data ?? []) as DeptSaleRow[])
      setLoading(false)
    })()
    return () => { active = false }
  }, [unlocked, key])

  if (!info) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-ink-faint text-[14px]">
        존재하지 않는 페이지입니다.
      </div>
    )
  }

  if (!unlocked) {
    const submit = (e: React.FormEvent) => {
      e.preventDefault()
      if (code === info.code) {
        sessionStorage.setItem(UNLOCK_PREFIX + key!, code)
        setUnlocked(true)
      } else {
        setError(true)
      }
    }
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <form onSubmit={submit} className="w-full max-w-[320px] text-center">
          <p className="text-[15px] font-bold text-ink mb-1">{info.name} 판매 실적</p>
          <p className="text-[13px] text-ink-faint mb-4">담당자 코드를 입력하세요</p>
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false) }}
            autoFocus
            className="w-full border border-rule rounded-md px-4 py-3 text-center text-[16px] tracking-[0.2em] focus:outline-none"
          />
          {error && <p className="mt-2 text-[12.5px] text-signal-red">코드가 올바르지 않습니다</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-pill bg-ink text-paper text-[14px] font-medium py-3"
          >
            확인
          </button>
        </form>
      </div>
    )
  }

  const totalAmount = rows.reduce((sum, r) => sum + r.total_amount, 0)
  const totalQuantity = rows.reduce((sum, r) => sum + r.total_quantity, 0)

  return (
    <div className="min-h-screen bg-white">
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-6">
        <p className="text-[15px] font-semibold text-ink">{info.name} 판매 실적</p>
      </header>

      <main className="max-w-[900px] mx-auto p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-paper border border-rule rounded-md p-5">
            <p className="text-[12px] text-ink-faint mb-1">총 판매금액</p>
            <p className="text-[22px] font-bold text-ink tabular-nums">{comma(totalAmount)}원</p>
          </div>
          <div className="bg-paper border border-rule rounded-md p-5">
            <p className="text-[12px] text-ink-faint mb-1">총 판매수량</p>
            <p className="text-[22px] font-bold text-ink tabular-nums">{comma(totalQuantity)}개</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">아직 집계된 판매가 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">방송</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">방송일시</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">판매수량</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">판매금액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.live_id} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-3 text-ink max-w-[280px] truncate">{r.live_title}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(r.live_scheduled_at)}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap tabular-nums">{comma(r.total_quantity)}개</td>
                    <td className="px-4 py-3 text-ink font-bold whitespace-nowrap tabular-nums">{comma(r.total_amount)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
