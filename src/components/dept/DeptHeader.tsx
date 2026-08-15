import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEPT_NAMES } from '../../lib/deptAccount'
import type { DeptAccount } from '../../lib/types'

const NAV_ITEMS = [
  { label: '판매실적', to: '/dept/sales' },
  { label: '방송목록', to: '/dept/lives' },
]

// 백화점 포털 공용 헤더 — 로고+지점명 옆에 탭 네비게이션(판매실적/방송목록).
export default function DeptHeader({ account, active }: { account: DeptAccount; active: 'sales' | 'lives' }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/dept/login')
  }

  return (
    <header style={{ background: '#fff', boxShadow: '0 1px 3px rgba(20,25,60,.06)', padding: '14px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/images/bg-logo-gold-wordmark.png" alt="뷰티그라운드" style={{ height: 52, display: 'block' }} />
          <div style={{ borderLeft: '1px solid #eceef5', paddingLeft: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1e36' }}>{account.display_name}</p>
            <p style={{ fontSize: 12, color: '#8b90ad', marginTop: 2 }}>{DEPT_NAMES[account.dept_key]}</p>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          style={{ fontSize: 13, fontWeight: 600, color: '#8b90ad', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          로그아웃
        </button>
      </div>
      <nav style={{ display: 'flex', gap: 4, marginTop: 16 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = (item.to === '/dept/sales' && active === 'sales') || (item.to === '/dept/lives' && active === 'lives')
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                fontSize: 13.5, fontWeight: 700, padding: '8px 4px', marginRight: 20,
                color: isActive ? '#1a1e36' : '#8b90ad',
                borderBottom: isActive ? '2px solid #1a1e36' : '2px solid transparent',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
