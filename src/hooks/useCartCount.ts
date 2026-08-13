import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { guestCartCount } from '../lib/cart'

// 헤더/하단바 장바구니 아이콘의 빨간 배지 숫자. 로그인 여부와 무관하게 항상 최신 담긴 수량 합을 반영.
// cart.ts의 담기/수량변경/삭제 함수들이 'bg-cart-changed' 이벤트를 쏘면 즉시 재조회한다.
export function useCartCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true

    async function refresh() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const { data } = await supabase
          .from('cart_items')
          .select('quantity')
          .eq('user_id', session.user.id)
        const sum = ((data ?? []) as { quantity: number }[]).reduce((s, r) => s + r.quantity, 0)
        if (active) setCount(sum)
      } else if (active) {
        setCount(guestCartCount())
      }
    }

    refresh()
    window.addEventListener('bg-cart-changed', refresh)
    const { data: authSub } = supabase.auth.onAuthStateChange(() => refresh())

    return () => {
      active = false
      window.removeEventListener('bg-cart-changed', refresh)
      authSub.subscription.unsubscribe()
    }
  }, [])

  return count
}
