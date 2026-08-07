import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconSearch, IconHeart, IconCart, IconUser } from '../common/Icon'

// 온라인몰과 라이브커머스를 당분간 분리하기로 해(대표님 지시 2026-07-29)
// '라이브' 탭을 뺐다 — 온라인몰 상시 네비게이션에 라이브 진입점을 두지 않는다.
// 장바구니는 기존에 상단 헤더에 있었는데, 헤더를 인사말+검색 전용으로 바꾸며 하단 탭으로 이동.
const NAV_ITEMS = [
  { path: '/app/home', Icon: IconHome, label: '홈' },
  { path: '/app/category', Icon: IconSearch, label: '카테고리' },
  { path: '/app/wishlist', Icon: IconHeart, label: '찜' },
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
