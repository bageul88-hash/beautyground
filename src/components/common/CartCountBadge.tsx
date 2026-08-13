import { useCartCount } from '../../hooks/useCartCount'

// 장바구니 아이콘 우측 상단에 붙이는 빨간 수량 배지. 부모 요소는 relative여야 함.
export default function CartCountBadge() {
  const count = useCartCount()
  if (count <= 0) return null

  return (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-signal-red text-paper text-[10px] font-bold leading-[16px] text-center pointer-events-none"
      aria-hidden="true"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
