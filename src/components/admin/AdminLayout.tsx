import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  IconHome,
  IconLogout,
  IconUsers,
  IconAward,
  IconCashBanknote,
  IconAddressBook,
  IconShoppingBag,
  IconBox,
  IconBroadcast,
  IconTicket,
  IconPalette,
  IconSpeakerphone,
  IconBuildingStore,
  IconWorld,
  IconTargetArrow,
} from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'

// 온라인몰과 라이브커머스를 당분간 분리 운영하기로 한 방침(2026-07-31)을 관리자 메뉴에도 그대로
// 반영 — 채널별로 묶어서 한눈에 훑을 수 있게 소제목으로 나눈다(2026-08-08).
// 매입 후 직접 판매하는 구조라 브랜드사가 상품/방송을 직접 등록하는 파트너센터는 없음(2026-08-08 폐지).
// 단 브랜드가 자기 라이브 판매실적·정산을 읽기 전용으로 보는 /brand/* 포털은 2026-08-15 추가 —
// 계정 연결·수수료율 관리는 아래 "브랜드" 메뉴에서.
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
    title: '브랜드',
    items: [
      { label: '브랜드 관리', to: '/admin/partners', icon: IconBuildingStore },
      { label: '브랜드 정산 관리', to: '/admin/partner-settlements', icon: IconCashBanknote },
    ],
  },
  {
    title: '백화점',
    items: [
      { label: '백화점 계정 관리', to: '/admin/dept-accounts', icon: IconBuildingStore },
    ],
  },
  {
    // beautyground가 직접 수출자(재판매자)로서 보유 브랜드를 해외 바이어에게 제안하는 채널
    // (/export 페이지) 문의 관리(2026-08-15)
    title: '해외',
    items: [
      { label: '해외 바이어 문의', to: '/admin/export-inquiries', icon: IconWorld },
      { label: '해외 바이어 타겟관리', to: '/admin/export-buyers', icon: IconTargetArrow },
    ],
  },
  {
    title: '회원',
    items: [
      { label: '회원 관리', to: '/admin/members', icon: IconAddressBook },
    ],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/app/home')
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

        <nav className="flex-1 py-4 pb-10 overflow-y-auto">
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
