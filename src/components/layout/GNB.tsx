import { Link } from 'react-router-dom'

// 회사소개/이용약관/개인정보처리방침은 이미 Footer(LEGAL_LINKS)에 있어 상단엔 중복 노출하지
// 않는다 — 예전엔 #success/#solution/career 같은 존재하지 않는 라우트였던 잔재를 지운 뒤
// 실제 페이지로 바꿨었지만, 어차피 하단에 있는 걸 상단에 또 넣을 필요는 없다는 지적으로
// 상단 메뉴 자체를 비움(2026-08-15).
export default function GNB() {
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

        <div className="flex items-center gap-3">
          <Link to="/app/home" className="text-[13px] text-ink-soft hover:text-ink transition-colors">
            앱 보기
          </Link>
        </div>
      </div>
    </header>
  )
}
