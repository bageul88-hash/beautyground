import { Link } from 'react-router-dom'

// 신규가입 혜택 배너 — 카카오톡 채널추가 배너(KakaoPromoBar)와는 별개 캠페인.
// 실제 지급 로직: supabase/signup_bonus.sql(auth.users INSERT 트리거) — 가입 경로(카카오/이메일) 무관 전체 지급.
// 2026-08-06 대표님 지시로 고정 문구(반복 스크롤 없음) + 카카오 브랜드 옐로(#FEE500) 배경으로 변경.
const MESSAGE = '회원가입하면 적립금 3,000원 + 첫구매 쿠폰 3종 받아가세요'

export default function SignupBonusBar() {
  return (
    <Link
      to="/app/signup"
      className="flex items-center justify-center gap-2 h-[34px] px-4 bg-[#FEE500]"
      aria-label="회원가입하고 적립금 3,000원과 첫구매 쿠폰 3종 받기"
    >
      <span className="text-[12.5px] font-bold text-ink text-center truncate">{MESSAGE}</span>
      <span aria-hidden="true" className="text-ink shrink-0">→</span>
    </Link>
  )
}
