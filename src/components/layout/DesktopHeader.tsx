import { Link } from 'react-router-dom'
import { IconHeart, IconCart } from '../common/Icon'
import { CATEGORIES } from '../../constants'

// PC 전용 공용 헤더 — 지금까지 Desktop*.tsx 14개가 각자 비슷한 헤더를 따로
// 들고 있어 화면마다 미묘하게 달랐던 문제를 여기 하나로 통일한다(2026-08-05).
// 2단 구성(로고+아이콘 / 카테고리탭+바로가기 칩)은 대형몰 헤더의 위치·크기 배치를
// 참고했지만 색·폰트·이미지는 전부 이 시스템 규칙(ink/paper, 각진 4px, 무이모지) 그대로.
const QUICK_LINKS = [
  { href: '/app/mypage', label: '마이페이지' },
  { href: '/app/wishlist', label: '찜한 상품' },
  { href: '/app/orders', label: '주문내역' },
]

export default function DesktopHeader() {
  return (
    <header className="bg-paper border-b border-rule sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/app/home" className="text-[19px] font-bold text-ink tracking-[-0.01em]">
          뷰티그라운드
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/app/wishlist" aria-label="찜" className="text-ink">
            <IconHeart className="w-[20px] h-[20px]" />
          </Link>
          <Link to="/app/cart" aria-label="장바구니" className="text-ink">
            <IconCart className="w-[20px] h-[20px]" />
          </Link>
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="max-w-[1280px] mx-auto px-6 h-11 flex items-center justify-between">
          <nav className="flex items-center gap-6" aria-label="카테고리">
            <Link to="/app/category/all" className="text-[13px] font-bold text-ink-soft hover:text-ink transition-colors">
              전체
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                to={`/app/category/${c.id}`}
                className="text-[13px] font-bold text-ink-soft hover:text-ink transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.href}
                to={q.href}
                className="text-[12px] font-bold text-ink-soft border border-rule rounded-control px-3 py-1.5 hover:border-ink hover:text-ink transition-colors"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
