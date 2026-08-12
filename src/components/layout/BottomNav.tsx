import { Link, useLocation } from 'react-router-dom'
import { IconHome, IconGrid, IconCart, IconUser } from '../common/Icon'

// 2026-08-12: /live 페이지를 롤백하면서 '라이브' 탭도 임시로 제거 — 갈 곳이 없어서 '홈'과
// 경로가 겹쳐 두 탭이 동시에 활성화되는 버그가 있었음(대표님 지적). 목업에서 실데이터 연결을
// 마치고 /live를 다시 만들면 그때 이 탭도 복원.
const NAV_ITEMS = [
  { path: '/app/home', Icon: IconHome, label: '홈' },
  { path: '/app/category', Icon: IconGrid, label: '카테고리' },
  { path: '/app/cart', Icon: IconCart, label: '장바구니' },
  { path: '/app/mypage', Icon: IconUser, label: '마이' },
]

// 2026-08-12: 목업(live-commerce-new) 하단 네비와 색까지 완전히 통일 — 활성 탭에 brand-pink 사용
// (기존엔 accent 그린이었으나 대표님 지시로 라이브 메인 톤이 앱 전체 최우선). 카테고리 아이콘도
// 돋보기(IconSearch, 실제 검색과 혼동) 대신 목업의 그리드 아이콘(IconGrid)으로 교체.
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
                  isActive ? 'text-brand-pink' : 'text-ink-faint'
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
