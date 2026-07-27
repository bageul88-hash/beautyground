// 상단 카카오톡 채널 추가 프로모션 배너 — 노란색(카카오 컬러), 좌측 스크롤, 클릭 시 채널 추가.
// 채널: 뷰티그라운드(@bg_라이브커머스, 공개 ID _vnwfX)
const KAKAO_CHANNEL_ADD_URL = 'http://pf.kakao.com/_vnwfX/friend'
const MESSAGE = '카카오톡 채널 추가하면 5,000원 적립금 지급!  지금 친구추가하고 받아가세요'

// 카카오톡 말풍선 심볼 (브랜드 다크브라운)
function KakaoBubble() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className="inline-block shrink-0">
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
      className="block h-[34px] overflow-hidden"
      style={{ backgroundColor: '#FEE500' }}
      aria-label="카카오톡 채널 추가하고 5,000원 적립금 받기"
    >
      <div className="flex items-center gap-8 whitespace-nowrap px-4 h-full animate-marquee">
        {[...items, ...items].map((_, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 text-[12.5px] font-bold"
            style={{ color: 'rgba(0,0,0,0.85)' }}
          >
            <KakaoBubble />
            {MESSAGE}
            <span aria-hidden="true" className="opacity-70">→</span>
          </span>
        ))}
      </div>
    </a>
  )
}
