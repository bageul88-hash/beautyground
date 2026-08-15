import { useState } from 'react'
import { Link } from 'react-router-dom'

// 실존하지 않는 라우트(#success, #solution, /partnership, /career)로 연결되던 잔재를
// 실제 존재하는 페이지로 교체 — 뷰티그라운드는 채용/B2B SaaS가 아니라 K-Beauty 커머스 회사(2026-08-15).
const NAV_LINKS = [
  { href: '/company', label: '회사소개' },
  { href: '/terms', label: '이용약관' },
  { href: '/privacy', label: '개인정보처리방침' },
]

export default function GNB() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 border-b border-rule"
      style={{
        backgroundColor: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="text-[22px] font-bold text-ink" aria-label="뷰티그라운드 홈">
          뷰티그라운드
        </Link>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className="text-[14px] text-ink-soft font-medium hover:text-ink transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/app/home" className="hidden md:block text-[13px] text-ink-soft hover:text-ink transition-colors">
            앱 보기
          </Link>

          {/* 모바일 햄버거 */}
          <button
            className="md:hidden p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
          >
            <span className="text-xl" aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* 모바일 드로어 */}
      {menuOpen && (
        <nav
          className="md:hidden bg-paper border-t border-rule px-6 py-4"
          aria-label="모바일 메뉴"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className="block py-3 text-[15px] text-ink border-b border-rule last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
