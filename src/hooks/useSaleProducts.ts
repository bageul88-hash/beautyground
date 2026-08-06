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
}

// 홈 "지금 할인중" 레일 — 실제 sale_price가 걸린 상품을 할인율 높은 순으로.
// 기획전 섹션이 없다는 지적(2026-08-06)에 대한 대응이지만, 실제 캠페인 데이터가 없는 상태에서
// 지어낸 "이벤트"를 만들지 않고 이미 존재하는 실제 할인 데이터로 채운다.
export function useSaleProducts(limit = 10) {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('products')
        .select('id,name,price,sale_price,thumbnail_url,category,partner_id,review_summary')
        .eq('status', 'on_sale')
        .not('sale_price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!active) return
      const rows = (data ?? []) as Row[]

      const ids = [...new Set(rows.map((r) => r.partner_id).filter((v): v is string => !!v))]
      const brandMap = new Map<string, string>()
      if (ids.length > 0) {
        const { data: brands } = await supabase.from('partner_brands').select('id,brand_name').in('id', ids)
        for (const b of (brands ?? []) as { id: string; brand_name: string }[]) brandMap.set(b.id, b.brand_name)
      }
      if (!active) return

      const withRate = rows
        .filter((r) => r.sale_price != null && r.sale_price < r.price)
        .map((r) => ({
          rate: 1 - r.sale_price! / r.price,
          product: {
            id: r.id,
            name: r.name,
            price: r.price,
            sale_price: r.sale_price,
            thumbnail_url: r.thumbnail_url,
            category: r.category,
            brand_name: r.partner_id ? brandMap.get(r.partner_id) ?? null : null,
            reviewCount: r.review_summary?.count ?? 0,
            reviewAvg: r.review_summary?.avg ?? null,
          } as ShopProduct,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, limit)
        .map((x) => x.product)

      setProducts(withRate)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [limit])

  return { products, loading }
}
