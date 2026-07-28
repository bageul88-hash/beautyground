import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard,
  IconPackage,
  IconVideo,
  IconShoppingCart,
  IconCash,
  IconUser,
  IconLogout,
  IconBell,
  IconMenu2,
  IconX,
  IconHome,
  IconClipboardCheck,
  IconUsers,
  IconAward,
  IconCashBanknote,
} from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { getMyPartner } from '../../lib/partner'
import { useIsAdmin } from '../../lib/useIsAdmin'
import type { Partner } from '../../lib/types'

const NAV_ITEMS = [
  { label: '대시보드', to: '/partner/dashboard', icon: IconLayoutDashboard },
  { label: '상품 관리', to: '/partner/products', icon: IconPackage },
  { label: '라이브 관리', to: '/partner/live', icon: IconVideo },
  { label: '주문 관리', to: '/partner/orders', icon: IconShoppingCart },
  { label: '정산 관리', to: '/partner/settlement', icon: IconCash },
  { label: '프로필 설정', to: '/partner/profile', icon: IconUser },
]

// 관리자(is_admin) 계정에게만 사이드바에 추가로 노출되는 회사 관리 메뉴
const ADMIN_NAV_ITEMS = [
  { label: '홈 화면 관리', to: '/admin/home', icon: IconHome },
  { label: '파트너 신청 관리', to: '/admin/applications', icon: IconClipboardCheck },
  { label: '진행자 관리', to: '/admin/hosts', icon: IconUsers },
  { label: '수수료 등급 관리', to: '/admin/commission-tiers', icon: IconAward },
  { label: '진행자 정산 관리', to: '/admin/host-settlements', icon: IconCashBanknote },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: 'bg-[#E1F5EE]', text: 'text-[#085041]', label: '승인완료' },
  suspended: { bg: 'bg-[#FAECE7]', text: 'text-[#712B13]', label: '정지됨' },
  pending:   { bg: 'bg-[#FAEEDA]', text: 'text-[#633806]', label: '심사중' },
}

export default function PartnerLayout() {
  const navigate = useNavigate()
  const [partner, setPartner] = useState<Partner | null>(null)
  // 모바일: 사이드바를 드로어로 — 기본 닫힘, 햄버거로 열기
  const [menuOpen, setMenuOpen] = useState(false)
  // 관리자 계정이면 사이드바에 '회사 관리' 메뉴를 추가로 노출
  const { isAdmin } = useIsAdmin()

  useEffect(() => {
    getMyPartner().then((p) => setPartner(p))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/partner/login')
  }

  const badge = STATUS_BADGE[partner?.status ?? 'pending']
  const initials = partner?.brand_name?.slice(0, 2) ?? 'PA'

  return (
    <div className="flex min-h-screen bg-[#f7f8fa]">
      {/* 모바일에서 드로어 열렸을 때 배경 오버레이 */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 — PC: 고정, 모바일: 드로어 (밝은 톤: 흰 배경 + 옅은 경계선) */}
      <aside
        className={`w-[240px] min-h-screen bg-white border-r border-[#eaebee] flex flex-col fixed left-0 top-0 z-40 transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 모바일 닫기 버튼 */}
        <button
          onClick={() => setMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-[#9ca3af] hover:text-[#111]"
          aria-label="메뉴 닫기"
        >
          <IconX size={20} />
        </button>
        {/* 로고 */}
        <div className="px-6 pt-8 pb-6 border-b border-[#eaebee]">
          <Link to="/" className="block">
            <p className="text-[#111] text-[18px] font-bold tracking-tight hover:text-[#3B5BDB] transition-colors">
              뷰티그라운드
            </p>
            <p className="text-[#9ca3af] text-[11px] mt-0.5 tracking-widest uppercase">Partner Center</p>
          </Link>
        </div>

        {/* 브랜드 정보 */}
        <div className="px-6 py-4 border-b border-[#eaebee]">
          <p className="text-[#111] text-[13px] font-semibold">{partner?.brand_name ?? '-'}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        {/* 네비게이션 — 활성 항목: 파란색 통짜 알약형 배경(참고 이미지 그대로) */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/partner/dashboard'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mb-0.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3B5BDB] text-white'
                    : 'text-[#374151] hover:bg-[#EBF1FE] hover:text-[#3B5BDB]'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* 관리자 전용: 회사 관리 메뉴 */}
          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-[#eaebee]">
              <p className="px-3 pb-1 text-[10.5px] tracking-widest uppercase text-[#9ca3af]">회사 관리</p>
              {ADMIN_NAV_ITEMS.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 mb-0.5 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#3B5BDB] text-white'
                        : 'text-[#374151] hover:bg-[#EBF1FE] hover:text-[#3B5BDB]'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* 로그아웃 */}
        <div className="px-6 py-6 border-t border-[#eaebee]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[#9ca3af] hover:text-[#111] text-[13px] transition-colors"
          >
            <IconLogout size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 ml-0 lg:ml-[240px] flex flex-col min-h-screen">
        {/* 헤더 */}
        <header className="h-[60px] bg-white border-b border-[#eaebee] flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden text-[#555] hover:text-[#111]"
              aria-label="메뉴 열기"
            >
              <IconMenu2 size={22} />
            </button>
            <p className="text-[15px] font-semibold text-[#111] truncate">
              {partner?.brand_name ?? '파트너 센터'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-[#9a9080] hover:text-[#111] transition-colors" aria-label="알림">
              <IconBell size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#3B5BDB] text-white text-[12px] font-bold flex items-center justify-center">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
