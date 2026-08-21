import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUCT_CATEGORIES } from '../lib/types'

// 소비자 목록 카테고리 탭용: 판매중(on_sale) 상품이 1개 이상 있는 실제 category 값만 반환.
// PRODUCT_CATEGORIES 순서를 유지하고, 상품 0개인 카테고리는 제외한다.
export function useShopCategories() {
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // 카테고리당 1번씩(예전엔 8번) 왕복하는 대신, category 컬럼만 한 번에 받아
      // 어떤 카테고리에 상품이 1개 이상 있는지 클라이언트에서 판별한다 — 정확한 개수는
      // 필요 없고 "0개인지 아닌지"만 필요하므로 이걸로 충분하다(2026-08-21 모바일 로딩속도 개선).
      const { data } = await supabase
        .from('products')
        .select('category')
        .eq('status', 'on_sale')
      if (cancelled) return
      const present = new Set((data ?? []).map((r) => r.category).filter(Boolean))
      setCategories(PRODUCT_CATEGORIES.filter((cat) => present.has(cat)))
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading }
}
