import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconHome,
  IconClipboardCheck,
  IconLogout,
  IconUsers,
  IconAward,
  IconCashBanknote,
  IconPackage,
  IconVideo,
  IconShoppingCart,
  IconCash,
  IconAddressBook,
  IconShoppingBag,
  IconBox,
  IconBuildingStore,
  IconReceipt2,
  IconBroadcast,
  IconTicket,
  IconPalette,
  IconSpeakerphone,
} from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'

// 온라인몰과 라이브커머스를 당분간 분리 운영하기로 한 방침(2026-07-31)을 관리자 메뉴에도 그대로
// 반영 — 평평한 15개 목록 대신 채널별로 묶어서 한눈에 훑을 수 있게 소제목으로 나눈다(2026-08-08).
const NAV_GROUPS = [
  {
    title: '쇼핑몰',
    items: [
      { label: '홈 화면 관리', to: '/admin/home', icon: IconHome },
      { label: '홈 테마 설정', to: '/admin/theme', icon: IconPalette },
      { label: '마케팅 센터', to: '/admin/marketing', icon: IconSpeakerphone },
      { label: '전체 주문 관리', to: '/admin/orders', icon: IconShoppingBag },
      { label: '전체 상품 관리', to: '/admin/products', icon: IconBox },
    ],
  },
  {
    title: '라이브커머스',
    items: [
      { label: '라이브 방송 관리', to: '/admin/lives', icon: IconBroadcast },
      { label: '쿠폰 현황', to: '/admin/coupons', icon: IconTicket },
      { label: '진행자 관리', to: '/admin/hosts', icon: IconUsers },
      { label: '수수료 등급 관리', to: '/admin/commission-tiers', icon: IconAward },
      { label: '진행자 정산 관리', to: '/admin/host-settlements', icon: IconCashBanknote },
    ],
  },
  {
    title: '회원·파트너',
    items: [
      { label: '회원 관리', to: '/admin/members', icon: IconAddressBook },
      { label: '파트너 관리', to: '/admin/partners', icon: IconBuildingStore },
      { label: '파트너 정산 관리', to: '/admin/settlements', icon: IconReceipt2 },
      { label: '파트너 신청 관리', to: '/admin/applications', icon: IconClipboardCheck },
    ],
  },
]

// 판매자 센터(상품/주문/정산)로 바로 이동 — 관리자도 상품 업로드 등을 한 곳에서 오갈 수 있게
const SELLER_NAV_ITEMS = [
  { label: '상품 관리', to: '/partner/products', icon: IconPackage },
  { label: '라이브 관리', to: '/partner/live', icon: IconVideo },
  { label: '주문 관리', to: '/partner/orders', icon: IconShoppingCart },
  { label: '정산 관리', to: '/partner/settlement', icon: IconCash },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/partner/login')
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* 사이드바 — 화이트+블랙 텍스트(새 월드). 진한 배경색·골드 강조 없이 얇은 선과 잉크 농도로만 상태 구분. */}
      <aside className="w-[240px] min-h-screen bg-paper border-r border-rule flex flex-col fixed left-0 top-0 z-30">
        <div className="px-6 pt-8 pb-6 border-b border-rule">
          <Link to="/" className="block">
            <p className="text-ink text-[20px] font-bold tracking-wide">
              뷰티그라운드
            </p>
            <p className="text-ink-faint text-[11px] mt-0.5 tracking-widest uppercase">Admin Center</p>
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.title} className={i > 0 ? 'mt-3 pt-3 border-t border-rule' : ''}>
              <p className="px-5 pb-1 text-[10.5px] tracking-widest uppercase text-ink-faint">{group.title}</p>
              {group.items.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 text-[13px] transition-colors ${
                      isActive
                        ? 'text-ink font-bold bg-quiet border-l-[3px] border-ink pl-[17px]'
                        : 'text-ink-soft hover:text-ink border-l-[3px] border-transparent pl-[17px]'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}

          {/* 판매자 센터 바로가기 */}
          <div className="mt-3 pt-3 border-t border-rule">
            <p className="px-5 pb-1 text-[10.5px] tracking-widest uppercase text-ink-faint">판매자 관리</p>
            {SELLER_NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-[13px] transition-colors ${
                    isActive
                      ? 'text-ink font-bold bg-quiet border-l-[3px] border-ink pl-[17px]'
                      : 'text-ink-soft hover:text-ink border-l-[3px] border-transparent pl-[17px]'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="px-6 py-6 border-t border-rule">
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 text-ink-faint hover:text-ink text-[13px] transition-colors"
          >
            <IconLogout size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 ml-[240px] min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
