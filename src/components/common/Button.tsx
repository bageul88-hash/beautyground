interface ButtonProps {
  variant?: 'gold' | 'ghost' | 'outline' | 'cancel' | 'ink' | 'inkOutline' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  label: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
}

const variantClasses = {
  gold: 'bg-gold text-white hover:bg-gold-light active:bg-gold-dim',
  ghost: 'bg-transparent border border-[#333] text-[#bbb] hover:border-[#555]',
  outline: 'bg-transparent border border-gold text-gold hover:bg-gold/10',
  cancel: 'bg-cream-3 text-text-sub hover:bg-cream-2',
  // 새 월드(화이트+블랙) — admin 섹션 전용. gold/cancel은 아직 미전환 화면(web/partner/host)이 쓰므로 그대로 둔다.
  ink: 'bg-ink text-paper hover:opacity-90 active:opacity-80',
  inkOutline: 'bg-paper border border-rule text-ink-soft hover:border-ink-faint hover:text-ink',
  // 강조는 원색 1개(signal-blue)만 — "확정된 정보·행동"(DESIGN.md). 여러 색을 쓰면 지저분해 보인다는
  // 대표님 지시로 admin의 모든 1차 액션 버튼은 이 파랑 하나로 통일. 삭제 등 파괴적 액션만 예외로 danger(red).
  accent: 'bg-signal-blue text-paper hover:opacity-90 active:opacity-80',
  danger: 'bg-signal-red text-paper hover:opacity-90 active:opacity-80',
}

const sizeClasses = {
  sm: 'text-[13px] px-4 py-2',
  md: 'text-[14px] px-6 py-3',
  lg: 'text-[15px] px-8 py-4',
}

export default function Button({
  variant = 'gold',
  size = 'md',
  label,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        // shrink-0 + whitespace-nowrap: 옆에 가변폭 요소(select 등)와 한 줄에 있을 때
        // 폭이 부족하다고 알약 버튼 자체가 찌그러들며 글자가 줄바꿈되는 것을 막는다
        // (좁아져야 하는 건 항상 옆의 가변폭 요소이지, 라벨 있는 버튼이 아니다).
        'rounded-pill font-sans font-medium transition-colors duration-200 shrink-0 whitespace-nowrap focus:outline-none focus:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {label}
    </button>
  )
}
