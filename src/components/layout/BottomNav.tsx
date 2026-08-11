import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconSearch, IconLive, IconCart, IconUser } from '../common/Icon'

// 2026-07-29엔 온라인몰·라이브커머스를 분리한다며 '라이브' 탭을 빼고 '찜'을 넣었었으나,
// 2026-08-11 대표님 지시로 재변경 — 라이브 목업(live-commerce-new) 하단 네비와 통일해
// '찜' 대신 '라이브'(/app/live) 진입점을 상시 노출한다.
const NAV_ITEMS = [
  { path: '/app/home', Icon: IconHome, label: '홈' },
  { path: '/app/category', Icon: IconSearch, label: '카테고리' },
  { path: '/app/live', Icon: IconLive, label: '라이브' },
  { path: '/app/cart', Icon: IconCart, label: '장바구니' },
  { path: '/app/mypage', Icon: IconUser, label: '마이' },
]

// 선택 표시에 원색을 쓰지 않는다 — 신호색(빨강·파랑·노랑)은 사실을 말할 때만 켜지고,
// 탭 선택 같은 상시 상태에 색을 소모하면 온에어 신호가 묻힌다. 굵기와 잉크 농도로만 구분.
export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-[480px] mx-auto bg-paper border-t border-rule pb-safe">
        <div className="flex items-stretch h-14">
          {NAV_ITEMS.map(({ path, Icon, label }) => {
            const isActive = pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 focus:outline-none focus-visible:shadow-ring ${
                  isActive ? 'text-ink' : 'text-ink-faint'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-[21px] h-[21px]" strokeWidth={isActive ? 2 : 1.6} />
                <span className={`text-[11px] leading-none ${isActive ? 'font-bold' : ''}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
