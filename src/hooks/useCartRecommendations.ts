import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ShopProduct } from './useShopProducts'

interface Row {
  id: string
  name: string
  price: number
  sale_price: number | null
  thumbnail_url: string | null
  category: string | null
  partner_id: string | null
  review_summary: { count: number; avg: number | null } | null
  season_tags: string[] | null
}

const LIMIT = 4

// 장바구니 하단 "이 상품과 함께 많이 담는 상품" — 담긴 상품들과 같은 카테고리에서,
// 이미 장바구니에 있는 상품은 제외하고 최신순 4개를 보여준다.
export function useCartRecommendations(categories: string[], excludeIds: string[]) {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const catKey = [...new Set(categories)].sort().join('|')
  const excludeKey = [...new Set(excludeIds)].sort().join('|')

  useEffect(() => {
    const cats = catKey ? catKey.split('|') : []
    if (cats.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      setLoading(true)
      let query = supabase
        .from('products')
        .select('id,name,price,sale_price,thumbnail_url,category,partner_id,review_summary,season_tags')
        .eq('status', 'on_sale')
        .in('category', cats)
        .order('created_at', { ascending: false })
        .limit(LIMIT + excludeIds.length)
      const { data } = await query
      if (!active) return

      const excludeSet = new Set(excludeKey ? excludeKey.split('|') : [])
      const rows = ((data ?? []) as Row[]).filter((r) => !excludeSet.has(r.id)).slice(0, LIMIT)

      const partnerIds = [...new Set(rows.map((r) => r.partner_id).filter((v): v is string => !!v))]
      const brandMap = new Map<string, string>()
      if (partnerIds.length > 0) {
        const { data: brands } = await supabase.from('partner_brands').select('id,brand_name').in('id', partnerIds)
        for (const b of (brands ?? []) as { id: string; brand_name: string }[]) brandMap.set(b.id, b.brand_name)
      }
      if (!active) return

      setProducts(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          price: r.price,
          sale_price: r.sale_price,
          thumbnail_url: r.thumbnail_url,
          category: r.category,
          brand_name: r.partner_id ? brandMap.get(r.partner_id) ?? null : null,
          reviewCount: r.review_summary?.count ?? 0,
          reviewAvg: r.review_summary?.avg ?? null,
          seasonTags: r.season_tags ?? [],
        }))
      )
      setLoading(false)
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catKey, excludeKey])

  return { products, loading }
}
