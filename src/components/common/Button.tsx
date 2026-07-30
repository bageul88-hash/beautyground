interface ButtonProps {
  variant?: 'gold' | 'ghost' | 'outline' | 'cancel'
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
