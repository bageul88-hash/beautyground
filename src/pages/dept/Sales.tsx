import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getMyDeptAccount, DEPT_NAMES } from '../../lib/deptAccount'
import type { DeptAccount, DeptSaleRow } from '../../lib/types'
import { comma, formatDateTime } from '../../lib/format'

// beautyground-erp(매장관리 시스템)와 같은 톤 — 옅은 라벤더그레이 배경, 흰 rounded-16 카드,
// 네이비(#1a1e36) 강조, 뮤트 라벤더그레이(#8b90ad) 보조텍스트.
const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(20,25,60,.06)',
  padding: 22,
}

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', color: '#8b90ad', fontSize: 14 }}>
        불러오는 중…
      </div>
    )
  }

  if (!account) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', padding: 20 }}>
        <div style={{ ...card, maxWidth: 360, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1e36', marginBottom: 8 }}>담당자 계정을 찾을 수 없습니다</p>
          <p style={{ fontSize: 13.5, color: '#8b90ad' }}>뷰티그라운드 담당자에게 문의해 주세요.</p>
        </div>
      </div>
    )
  }

  const totalAmount = rows.reduce((sum, r) => sum + r.total_amount, 0)
  const totalQuantity = rows.reduce((sum, r) => sum + r.total_quantity, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f9' }}>
      <header style={{ background: '#fff', boxShadow: '0 1px 3px rgba(20,25,60,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/images/bg-logo-gold-wordmark.png" alt="뷰티그라운드" style={{ height: 52, display: 'block' }} />
          <div style={{ borderLeft: '1px solid #eceef5', paddingLeft: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1e36' }}>{account.display_name}</p>
            <p style={{ fontSize: 12, color: '#8b90ad', marginTop: 2 }}>{DEPT_NAMES[account.dept_key]} 판매 실적</p>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          style={{ fontSize: 13, fontWeight: 600, color: '#8b90ad', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          로그아웃
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={card}>
            <p style={{ fontSize: 13, color: '#8b90ad', marginBottom: 6 }}>총 판매금액</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1a1e36', fontVariantNumeric: 'tabular-nums' }}>{comma(totalAmount)}원</p>
          </div>
          <div style={card}>
            <p style={{ fontSize: 13, color: '#8b90ad', marginBottom: 6 }}>총 판매수량</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#1a1e36', fontVariantNumeric: 'tabular-nums' }}>{comma(totalQuantity)}개</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px 22px', color: '#8b90ad', fontSize: 14 }}>
            아직 집계된 판매가 없습니다.
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eceef5' }}>
                    {['방송', '방송일시', '판매수량', '판매금액'].map((col) => (
                      <th key={col} style={{ padding: '14px 18px', color: '#8b90ad', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.live_id} style={{ borderBottom: '1px solid #eceef5' }}>
                      <td style={{ padding: '14px 18px', color: '#1a1e36', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.live_title}</td>
                      <td style={{ padding: '14px 18px', color: '#666', whiteSpace: 'nowrap' }}>{formatDateTime(r.live_scheduled_at)}</td>
                      <td style={{ padding: '14px 18px', color: '#666', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{comma(r.total_quantity)}개</td>
                      <td style={{ padding: '14px 18px', color: '#1a1e36', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{comma(r.total_amount)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
