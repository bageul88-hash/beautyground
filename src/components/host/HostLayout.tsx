import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconVideo,
  IconCash,
  IconUser,
  IconLogout,
  IconMenu2,
  IconX,
} from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { getMyHost } from '../../lib/host'
import type { Host } from '../../lib/types'

const NAV_ITEMS = [
  { label: '대시보드', to: '/host/dashboard', icon: IconLayoutDashboard },
  { label: '내 방송', to: '/host/lives', icon: IconVideo },
  { label: '정산 내역', to: '/host/settlement', icon: IconCash },
  { label: '프로필 설정', to: '/host/profile', icon: IconUser },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: 'bg-[#E1F5EE]', text: 'text-[#085041]', label: '승인완료' },
  suspended: { bg: 'bg-[#FAECE7]', text: 'text-[#712B13]', label: '정지됨' },
  pending:   { bg: 'bg-[#FAEEDA]', text: 'text-[#633806]', label: '심사중' },
}

// ERP(beautyground-erp) 사이드바와 동일한 남색 그라데이션 알약 버튼(2026-08-26 대표님 지시)
const NAV_GRADIENT = 'linear-gradient(135deg, #1e4fd8 0%, #2b6cf0 35%, #4a8bf7 70%, #1e4fd8 100%)'
const NAV_GRADIENT_ACTIVE = 'linear-gradient(135deg, #dfe3f0 0%, #ffffff 40%, #f2f4fb 70%, #d8dceb 100%)'
const LOGOUT_GRADIENT = 'linear-gradient(135deg, #dc2626 0%, #ef4444 30%, #f87171 65%, #b91c1c 100%)'
const navShadow = 'box-shadow:0 10px 24px rgba(30,79,216,.45),inset 0 2px 2px rgba(255,255,255,.7),inset 0 -4px 8px rgba(0,0,0,.3)'
const navShadowActive = 'box-shadow:0 10px 24px rgba(30,40,90,.28),inset 0 2px 2px rgba(255,255,255,.95),inset 0 -4px 8px rgba(0,0,0,.12)'

export default function HostLayout() {
  const navigate = useNavigate()
  const [host, setHost] = useState<Host | null>(null)
  // 모바일: 사이드바를 드로어로 — 기본 닫힘, 햄버거로 열기
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    getMyHost().then((h) => setHost(h))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/host/login')
  }

  const badge = STATUS_BADGE[host?.status ?? 'pending']

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
        className={`w-[240px] min-h-screen bg-white flex flex-col fixed left-0 top-0 z-40 transition-transform duration-200 lg:translate-x-0 shadow-[2px_0_18px_rgba(30,40,90,.08)] ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-ink-faint hover:text-ink"
          aria-label="메뉴 닫기"
        >
          <IconX size={20} />
        </button>
        <div className="px-6 pt-8 pb-6 border-b border-rule">
          <Link to="/" className="block">
            <p className="text-ink font-serif text-[20px] font-bold tracking-wide hover:opacity-80 transition-colors">
              뷰티그라운드
            </p>
            <p className="text-ink-faint text-[11px] mt-0.5 tracking-widest uppercase">Host Center</p>
          </Link>
        </div>

        <div className="px-6 py-4 border-b border-rule">
          <p className="text-ink text-[13px] font-semibold">{host?.name ?? '-'}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-2">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[13.5px] font-semibold transition-transform border ${
                  isActive ? 'text-ink border-white/95 hover:-translate-y-0.5' : 'text-white border-white/65 hover:-translate-y-0.5'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? NAV_GRADIENT_ACTIVE : NAV_GRADIENT,
                cssText: isActive ? navShadowActive : navShadow,
              })}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-6 pt-3 border-t border-rule">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[13px] font-semibold text-white border border-white/65 hover:-translate-y-0.5 transition-transform"
            style={{ background: LOGOUT_GRADIENT, boxShadow: '0 10px 24px rgba(220,38,38,.5), inset 0 2px 2px rgba(255,255,255,.7), inset 0 -4px 8px rgba(0,0,0,.28)' }}
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
              {host?.name ?? '진행자 센터'}
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
