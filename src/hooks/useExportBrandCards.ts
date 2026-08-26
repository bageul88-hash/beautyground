import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ExportBrandPublic } from '../lib/types'

export interface ExportFeaturedProduct {
  id: string
  name: string
  thumbnail_url: string | null
  export_image_urls: string[]
  export_description_en: string | null
  partner_id: string
}

export interface ExportBrandCardData extends ExportBrandPublic {
  products: ExportFeaturedProduct[]
}

// 브랜드가 /brand/export에서 입력한 정보(로고·영문소개·인증·대표상품)를 공개 페이지에 노출.
// export_brand_public 뷰는 anon 조회 가능한 안전한 컬럼만 담고 있음(supabase/partners_export_pitch_en.sql).
// /export(피처드 4개)와 /export/brands(전체)가 같은 데이터를 쓴다.
export function useExportBrandCards() {
  const [brandCards, setBrandCards] = useState<ExportBrandCardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: brandRows }, { data: productRows }] = await Promise.all([
        supabase.from('export_brand_public').select('*'),
        supabase
          .from('products')
          .select('id,name,thumbnail_url,export_image_urls,export_description_en,partner_id')
          .eq('is_export_featured', true)
          .eq('status', 'on_sale'),
      ])
      if (cancelled) return
      const products = (productRows ?? []) as ExportFeaturedProduct[]
      const cards = ((brandRows ?? []) as ExportBrandPublic[])
        .map((b) => ({ ...b, products: products.filter((p) => p.partner_id === b.id) }))
        .filter((b) => (b.export_pitch_en?.trim() ?? '').length > 0 || b.products.length > 0)
      setBrandCards(cards)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { brandCards, loading }
}
