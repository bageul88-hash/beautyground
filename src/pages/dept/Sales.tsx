import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconLogout } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { getMyDeptAccount, DEPT_NAMES } from '../../lib/deptAccount'
import type { DeptAccount, DeptSaleRow } from '../../lib/types'
import { comma, formatDateTime } from '../../lib/format'

export default function DeptSales() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<DeptAccount | null>(null)
  const [rows, setRows] = useState<DeptSaleRow[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      const acc = await getMyDeptAccount()
      if (!active) return
      if (!acc) { setAccount(null); setLoading(false); return }
      setAccount(acc)

      const { data } = await supabase
        .from('dept_live_sales_view')
        .select('*')
        .order('live_scheduled_at', { ascending: false })
      if (!active) return
      setRows((data ?? []) as DeptSaleRow[])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/dept/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-faint text-[14px]">
        불러오는 중…
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-[16px] font-semibold text-ink mb-2">담당자 계정을 찾을 수 없습니다</p>
          <p className="text-[14px] text-ink-faint">뷰티그라운드 담당자에게 문의해 주세요.</p>
        </div>
      </div>
    )
  }

  const totalAmount = rows.reduce((sum, r) => sum + r.total_amount, 0)
  const totalQuantity = rows.reduce((sum, r) => sum + r.total_quantity, 0)

  return (
    <div className="min-h-screen bg-white">
      <header className="h-[60px] bg-paper border-b border-rule flex items-center justify-between px-6">
        <div>
          <p className="text-[15px] font-semibold text-ink">{account.display_name}</p>
          <p className="text-[11px] text-ink-faint">{DEPT_NAMES[account.dept_key]} 판매 실적</p>
        </div>
        <button
          onClick={() => void handleLogout()}
          className="flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors"
        >
          <IconLogout size={16} />
          로그아웃
        </button>
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

        {rows.length === 0 ? (
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
