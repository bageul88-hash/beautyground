import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ShopProduct } from './useShopProducts'
import { capPerBrand } from '../lib/curateProducts'

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

const PER_CATEGORY = 4
// 최근 등록이 한 브랜드에 몰리면 그 카테고리 4칸이 전부 한 브랜드로 채워지는 문제 방지(2026-09-04) —
// 최신순으로 넉넉히 가져온 뒤 브랜드당 최대 개수로 걸러서 PER_CATEGORY만큼 채운다.
const FETCH_POOL = 20
const MAX_PER_BRAND = 2

// 홈 "카테고리별 추천" 섹션 — 카테고리 탭마다 최신순 4개씩 미리 가져와둔다(탭 전환 시 재요청 없이 즉시 전환).
export function useCategoryRecommendations(categories: string[]) {
  const [byCategory, setByCategory] = useState<Record<string, ShopProduct[]>>({})
  const [loading, setLoading] = useState(true)
  const key = categories.join('|')

  useEffect(() => {
    if (categories.length === 0) {
      setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      setLoading(true)
      const results = await Promise.all(
        categories.map((cat) =>
          supabase
            .from('products')
            .select('id,name,price,sale_price,thumbnail_url,category,partner_id,review_summary,season_tags')
            .eq('status', 'on_sale')
            .eq('category', cat)
            .order('created_at', { ascending: false })
            .limit(FETCH_POOL)
        )
      )
      if (!active) return

      const allRows = results.flatMap((r) => (r.data ?? []) as Row[])
      const ids = [...new Set(allRows.map((r) => r.partner_id).filter((v): v is string => !!v))]
      const brandMap = new Map<string, string>()
      if (ids.length > 0) {
        const { data: brands } = await supabase.from('partner_brands').select('id,brand_name').in('id', ids)
        for (const b of (brands ?? []) as { id: string; brand_name: string }[]) brandMap.set(b.id, b.brand_name)
      }
      if (!active) return

      const map: Record<string, ShopProduct[]> = {}
      categories.forEach((cat, i) => {
        const rows = (results[i].data ?? []) as Row[]
        const mapped = rows.map((r) => ({
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
        map[cat] = capPerBrand(mapped, (p) => p.brand_name ?? p.id, MAX_PER_BRAND).slice(0, PER_CATEGORY)
      })
      setByCategory(map)
      setLoading(false)
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { byCategory, loading }
}
