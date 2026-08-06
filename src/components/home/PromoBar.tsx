import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// 상단 프로모션 배너 — 카카오톡 채널추가(5,000원)와 신규가입 혜택(3,000원+쿠폰3종)을
// 한 줄에서 번갈아 보여준다. 예전엔 KakaoPromoBar+SignupBonusBar를 각각 따로 쌓아 모바일에서
// 노란 배너 두 개가 겹쳐 보였고, 데스크톱엔 카카오채널 배너가 아예 없어 혜택이 기기별로
// 달라지는 문제가 있었음 — 하나로 합쳐 모바일·데스크톱 동일하게 노출(2026-08-06).
const KAKAO_CHANNEL_ADD_URL = 'http://pf.kakao.com/_vnwfX/friend'
const ROTATE_MS = 4000

interface PromoItem {
  key: string
  message: string
  href: string
  external?: boolean
}

const ITEMS: PromoItem[] = [
  { key: 'signup', message: '회원가입하면 적립금 3,000원 + 첫구매 쿠폰 3종 받아가세요', href: '/app/signup' },
  { key: 'kakao', message: '카카오톡 채널 추가하면 지금 친구추가하고 5,000원 받아가세요', href: KAKAO_CHANNEL_ADD_URL, external: true },
]

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

export default function PromoBar() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % ITEMS.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [])

  const item = ITEMS[idx]
  const content = (
    <span key={item.key} className="flex items-center gap-2 text-[12.5px] font-bold text-ink animate-fade-in">
      {item.key === 'kakao' && <KakaoBubble />}
      {content_message(item)}
      <span aria-hidden="true" className="text-ink shrink-0">→</span>
      <span className="flex items-center gap-1 ml-1" aria-hidden="true">
        {ITEMS.map((it) => (
          <span
            key={it.key}
            className={`w-1 h-1 rounded-full ${it.key === item.key ? 'bg-ink' : 'bg-ink/25'}`}
          />
        ))}
      </span>
    </span>
  )

  const className = 'flex items-center justify-center gap-2 h-[34px] px-4 bg-[#FEE500] overflow-hidden'

  return item.external ? (
    <a href={item.href} target="_blank" rel="noreferrer" className={className} aria-label={item.message}>
      {content}
    </a>
  ) : (
    <Link to={item.href} className={className} aria-label={item.message}>
      {content}
    </Link>
  )
}

function content_message(item: PromoItem) {
  return <span className="text-center truncate">{item.message}</span>
}
