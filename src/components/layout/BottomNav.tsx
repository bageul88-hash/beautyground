import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconSearch, IconLive, IconCart, IconUser } from '../common/Icon'

// 2026-07-29엔 온라인몰·라이브커머스를 분리한다며 '라이브' 탭을 빼고 '찜'을 넣었었으나,
// 2026-08-11 대표님 지시로 재변경 — '찜' 대신 '라이브' 진입점을 넣고, '홈'도 /app/live로
// 연결(온라인 메인 /app/home 대신 라이브 메인이 기본 진입점). 온라인 메인은 상단 헤더
// "환영합니다,...님" 링크로 여전히 접근 가능.
const NAV_ITEMS = [
  { path: '/app/live', Icon: IconHome, label: '홈' },
  { path: '/app/category', Icon: IconSearch, label: '카테고리' },
  { path: '/app/live', Icon: IconLive, label: '라이브' },
  { path: '/app/cart', Icon: IconCart, label: '장바구니' },
  { path: '/app/mypage', Icon: IconUser, label: '마이' },
]

// 2026-08-11: 목업(live-commerce-new) 하단 네비와 통일 — 활성 탭에 accent(브랜드) 색 사용.
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
                key={label}
                to={path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 focus:outline-none focus-visible:shadow-ring ${
                  isActive ? 'text-accent' : 'text-ink-faint'
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
