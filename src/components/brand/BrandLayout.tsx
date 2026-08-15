import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconVideo,
  IconCash,
  IconLogout,
  IconMenu2,
  IconX,
} from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { getMyPartner } from '../../lib/partner'
import type { Partner, Settlement } from '../../lib/types'

const NAV_ITEMS = [
  { label: '대시보드', to: '/brand/dashboard', icon: IconLayoutDashboard },
  { label: '판매내역', to: '/brand/sales', icon: IconVideo },
  { label: '정산내역', to: '/brand/settlement', icon: IconCash },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: 'bg-[#E1F5EE]', text: 'text-[#085041]', label: '이용중' },
  suspended: { bg: 'bg-[#FAECE7]', text: 'text-[#712B13]', label: '정지됨' },
}

export default function BrandLayout() {
  const navigate = useNavigate()
  const [partner, setPartner] = useState<Partner | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // 지급 대기 중인 정산 건수 — "새 정산이 생성됐다"는 신호로 정산내역 메뉴에 배지 표시.
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    getMyPartner().then((p) => {
      setPartner(p)
      if (!p) return
      supabase
        .from('settlements')
        .select('id, status')
        .eq('partner_id', p.id)
        .eq('status', 'pending')
        .then(({ data }) => setPendingCount(((data ?? []) as Pick<Settlement, 'id' | 'status'>[]).length))
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/brand/login')
  }

  const badge = STATUS_BADGE[partner?.status ?? 'active']

  return (
    <div className="flex min-h-screen bg-[#f7f4ef]">
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-[240px] min-h-screen bg-[#0e0c08] flex flex-col fixed left-0 top-0 z-40 transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-[#888] hover:text-white"
          aria-label="메뉴 닫기"
        >
          <IconX size={20} />
        </button>
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <Link to="/" className="block">
            <p className="text-[#b8924a] font-serif text-[20px] font-bold tracking-wide hover:text-[#d4aa6a] transition-colors">
              뷰티그라운드
            </p>
            <p className="text-[#555] text-[11px] mt-0.5 tracking-widest uppercase">Brand Center</p>
          </Link>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-white text-[13px] font-semibold">{partner?.brand_name ?? '-'}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-[13px] transition-colors ${
                  isActive
                    ? 'text-[#b8924a] bg-[rgba(184,146,74,0.1)] border-l-[3px] border-[#b8924a] pl-[17px]'
                    : 'text-[#888] hover:text-white border-l-[3px] border-transparent pl-[17px]'
                }`
              }
            >
              <Icon size={18} />
              {label}
              {to === '/brand/settlement' && pendingCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#d64550] text-white text-[10.5px] font-bold">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#555] hover:text-white text-[13px] transition-colors"
          >
            <IconLogout size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-0 lg:ml-[240px] flex flex-col min-h-screen">
        <header className="h-[60px] bg-white border-b border-[#eee] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden text-[#555] hover:text-[#111]"
              aria-label="메뉴 열기"
            >
              <IconMenu2 size={22} />
            </button>
            <p className="text-[15px] font-semibold text-[#111] truncate">
              {partner?.brand_name ?? '브랜드 센터'}
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
