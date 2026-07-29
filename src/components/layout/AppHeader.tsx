import { Link } from 'react-router-dom'
import { IconHeart, IconCart } from '../common/Icon'

// 소비자 앱 공통 상단바: 한글 워드마크(뷰티그라운드) + 우측 아이콘 2개(찜/장바구니).
// 온라인몰과 라이브커머스를 당분간 분리하기로 해(대표님 지시 2026-07-29) 로고 이미지와
// "LIVE COMMERCE" 영문 표기를 뺐다 — 이 화면은 라이브 얘기를 하지 않는다.
export default function AppHeader() {
  return (
    <header className="bg-paper flex items-center justify-between px-4 h-14 border-b border-rule sticky top-0 z-50">
      <Link to="/app/home" className="flex items-center min-w-0">
        <span className="font-sans text-[19px] font-bold text-ink tracking-[-0.01em]">뷰티그라운드</span>
      </Link>
      <div className="flex items-center gap-1">
        <Link
          to="/app/wishlist"
          aria-label="찜"
          className="w-11 h-11 flex items-center justify-center text-ink focus:outline-none focus-visible:shadow-ring"
        >
          <IconHeart />
        </Link>
        <Link
          to="/app/cart"
          aria-label="장바구니"
          className="w-11 h-11 flex items-center justify-center text-ink focus:outline-none focus-visible:shadow-ring"
        >
          <IconCart />
        </Link>
      </div>
    </header>
  )
}
