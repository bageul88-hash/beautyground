// 소비자 앱 아이콘 — 「생방송 슬레이트」 월드의 단색 선 아이콘.
// 이모지를 쓰지 않는 이유: 이모지는 기기마다 제 색(보라 하트, 빨간 집)을 들고 들어와
// "색은 사실을 말할 때만 켜진다"는 이 시스템의 규칙을 매번 깬다. 아이콘은 currentColor만 따른다.
type IconProps = { className?: string; strokeWidth?: number }

const base = (className?: string) => `shrink-0 ${className ?? 'w-[22px] h-[22px]'}`

function Svg({ children, className, strokeWidth = 1.6 }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={base(className)}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function IconDesktop(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4.5" width="18" height="12" rx="1" />
      <path d="M9 20.5h6M12 16.5v4" />
    </Svg>
  )
}

export function IconMobile(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="3" width="10" height="18" rx="1.5" />
      <path d="M11 18h2" />
    </Svg>
  )
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5v10h13v-10" />
    </Svg>
  )
}

// 라이브 = 방송 모니터. 이 앱의 성격을 드러내는 아이콘이라 화면 하나에 하나만 쓴다.
export function IconLive(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6.5" width="18" height="12.5" rx="1" />
      <path d="M8.5 3.5 12 6.5l3.5-3" />
      <path d="M10.5 10.5v4.5l4-2.25z" />
    </Svg>
  )
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4 4" />
    </Svg>
  )
}

// filled: 찜한 상태 — 색을 새로 쓰지 않고 채움 여부로만 상태를 구분한다(잉크 단색 유지).
export function IconHeart({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={p.strokeWidth ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${p.className ?? 'w-[22px] h-[22px]'}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 19.5S4 14.6 4 9.6A4.1 4.1 0 0 1 12 7.9a4.1 4.1 0 0 1 8 1.7c0 5-8 9.9-8 9.9Z" />
    </svg>
  )
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.6-3.7 3.6-5.8 7.2-5.8s6.6 2.1 7.2 5.8" />
    </Svg>
  )
}

export function IconCart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.2 4.5h2.3l2.3 10.2h9.5l2-7.3H6.4" />
      <circle cx="9.3" cy="19" r="1.4" />
      <circle cx="16.8" cy="19" r="1.4" />
    </Svg>
  )
}

export function IconBack(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 5 8 12l6.5 7" />
    </Svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  )
}

export function IconMinus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  )
}
