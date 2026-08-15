import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getMyDeptAccount } from '../../lib/deptAccount'
import type { DeptAccount, Live } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import DeptHeader from '../../components/dept/DeptHeader'

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(20,25,60,.06)',
  padding: 22,
}

const STATUS_BADGE: Record<Live['status'], { label: string; bg: string; text: string }> = {
  scheduled: { label: '예정', bg: '#EEEDFE', text: '#3C3489' },
  live: { label: '진행중', bg: '#FBEAF0', text: '#993556' },
  ended: { label: '종료', bg: '#F1F2F4', text: '#555' },
}

// 백화점 담당자용 방송 목록 — 판매실적(dept_live_sales_view, 판매 있는 방송만)과 달리
// 자기 백화점 태그가 붙은 방송을 판매 0건인 것까지 전부 보여준다(2026-08-15, 대표님 지시).
export default function DeptLives() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<DeptAccount | null>(null)
  const [lives, setLives] = useState<Live[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      const acc = await getMyDeptAccount()
      if (!active) return
      if (!acc) { setAccount(null); setLoading(false); return }
      setAccount(acc)

      const { data } = await supabase
        .from('lives')
        .select('*')
        .eq('dept_key', acc.dept_key)
        .order('scheduled_at', { ascending: false })
      if (!active) return
      setLives((data ?? []) as Live[])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f9', color: '#8b90ad', fontSize: 14 }}>
        불러오는 중…
      </div>
    )
  }

  if (!account) {
    navigate('/dept/login')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f9' }}>
      <DeptHeader account={account} active="lives" />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 28 }}>
        {lives.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '64px 22px', color: '#8b90ad', fontSize: 14 }}>
            아직 등록된 방송이 없습니다.
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eceef5' }}>
                    {['방송', '방송일시', '상태', '최고 시청자'].map((col) => (
                      <th key={col} style={{ padding: '14px 18px', color: '#8b90ad', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lives.map((l) => {
                    const badge = STATUS_BADGE[l.status]
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid #eceef5' }}>
                        <td style={{ padding: '14px 18px', color: '#1a1e36', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</td>
                        <td style={{ padding: '14px 18px', color: '#666', whiteSpace: 'nowrap' }}>{formatDateTime(l.scheduled_at)}</td>
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: badge.bg, color: badge.text }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: '#666', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{l.peak_viewers ?? 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
