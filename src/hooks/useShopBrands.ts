import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ShopBrand {
  id: string // partner_id
  name: string
}

// 소비자 목록 브랜드 필터용: 판매중(on_sale) 상품이 1개 이상 있는 브랜드만 가나다순으로 반환.
export function useShopBrands() {
  const [brands, setBrands] = useState<ShopBrand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const { data: rows } = await supabase.from('products').select('partner_id').eq('status', 'on_sale')
      if (cancelled) return
      const ids = [...new Set((rows ?? []).map((r) => r.partner_id).filter((v): v is string => !!v))]
      if (ids.length === 0) {
        setBrands([])
        setLoading(false)
        return
      }
      const { data: brandRows } = await supabase.from('partner_brands').select('id,brand_name').in('id', ids)
      if (cancelled) return
      const list = (brandRows ?? [])
        .map((b) => ({ id: b.id as string, name: b.brand_name as string }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      setBrands(list)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { brands, loading }
}
