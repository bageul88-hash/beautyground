// 상단 카카오톡 채널 추가 프로모션 배너 — 좌측 스크롤, 클릭 시 채널 추가.
// 채널: 뷰티그라운드(@bg_라이브커머스, 공개 ID _vnwfX)
//
// 흰 바탕 + 작은 노랑 칩. 전에는 화면 폭 전체를 노랑으로 채웠는데, 이 배너가
// 세션 내내 떠 있는 페이지 최상단이라 "조건부 혜택 신호는 아주 가끔만 켠다"는
// 이 시스템의 규칙과 정면으로 어긋났다(신호가 아니라 사실상 페이지 색이 됨).
// 노랑은 "5,000원" 사실 하나를 가리키는 작은 면으로만 남기고 나머지는 흰 바탕으로 되돌린다.
const KAKAO_CHANNEL_ADD_URL = 'http://pf.kakao.com/_vnwfX/friend'
const MESSAGE = '카카오톡 채널 추가하면 지금 친구추가하고 받아가세요'

// 카카오톡 말풍선 심볼 (브랜드 다크브라운 — 카카오 고유 심볼이라 이 시스템 팔레트 예외)
function KakaoBubble() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="inline-block shrink-0">
      <path
        fill="#3C1E1E"
        d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.79 5 4.5 6.34-.2.72-.72 2.62-.82 3.03-.13.5.18.5.39.36.16-.11 2.53-1.72 3.56-2.42.44.06.9.09 1.37.09 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5Z"
      />
    </svg>
  )
}

export default function KakaoPromoBar() {
  // 좌측 무한 스크롤(animate-marquee: translateX 0 → -50%)을 위해 동일 문구를 두 벌 이어붙임
  const items = Array.from({ length: 8 })

  return (
    <a
      href={KAKAO_CHANNEL_ADD_URL}
      target="_blank"
      rel="noreferrer"
      className="block h-[34px] overflow-hidden bg-paper border-b border-rule"
      aria-label="카카오톡 채널 추가하고 5,000원 적립금 받기"
    >
      <div className="flex items-center gap-8 whitespace-nowrap px-4 h-full animate-marquee">
        {[...items, ...items].map((_, i) => (
          <span key={i} className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
            <KakaoBubble />
            {/* 노랑은 "5,000원"이라는 사실 하나에만 — 작은 칩으로 제한 */}
            <span className="bg-signal-yellow px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink">
              5,000원
            </span>
            {MESSAGE}
            <span aria-hidden="true" className="text-ink-faint">→</span>
          </span>
        ))}
      </div>
    </a>
  )
}
