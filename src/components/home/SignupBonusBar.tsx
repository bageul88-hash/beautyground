import { Link } from 'react-router-dom'

// 신규가입 혜택 배너 — 카카오톡 채널추가 배너(KakaoPromoBar)와는 별개 캠페인.
// 실제 지급 로직: supabase/signup_bonus.sql(auth.users INSERT 트리거) — 가입 경로(카카오/이메일) 무관 전체 지급.
// 디자인은 KakaoPromoBar와 동일 원칙: 흰 바탕 + 조건부 혜택 신호(노랑 칩)는 숫자 하나에만 국한.
const MESSAGE = '회원가입하면 적립금 3,000원 + 첫구매 쿠폰 3종 받아가세요'

export default function SignupBonusBar() {
  const items = Array.from({ length: 8 })

  return (
    <Link
      to="/app/signup"
      className="block h-[34px] overflow-hidden bg-paper border-b border-rule"
      aria-label="회원가입하고 적립금 3,000원과 첫구매 쿠폰 3종 받기"
    >
      <div className="flex items-center gap-8 whitespace-nowrap px-4 h-full animate-marquee">
        {[...items, ...items].map((_, i) => (
          <span key={i} className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
            <span className="bg-signal-yellow px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink">
              3,000원
            </span>
            {MESSAGE}
            <span aria-hidden="true" className="text-ink-faint">→</span>
          </span>
        ))}
      </div>
    </Link>
  )
}
