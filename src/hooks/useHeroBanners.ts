import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface HeroBanner {
  id: string
  sort_order: number
  product: {
    id: string
    name: string
    price: number
    sale_price: number | null
    thumbnail_url: string | null
    brand: string | null
    // 히어로 큐레이션 배지(신상품 판별)용 — 관리자 미리보기처럼 안 채우는 곳도 있어 옵셔널
    created_at?: string | null
  } | null
  // 상품 연결 없이 관리자가 직접 넣은 브랜드 캠페인용 배너
  custom: {
    image_url: string | null
    headline: string | null
    subcopy: string | null
    link_url: string | null
  } | null
}

interface BannerRow {
  id: string
  sort_order: number
  image_url: string | null
  headline: string | null
  subcopy: string | null
  link_url: string | null
  products: {
    id: string
    name: string
    price: number
    sale_price: number | null
    thumbnail_url: string | null
    brand: string | null
    created_at: string | null
  } | null
}

const BANNER_SELECT = 'id,sort_order,image_url,headline,subcopy,link_url,products(id,name,price,sale_price,thumbnail_url,brand,created_at)'

function mapRow(r: BannerRow): HeroBanner {
  return {
    id: r.id,
    sort_order: r.sort_order,
    product: r.products,
    // 상품 연결 배너도 headline/subcopy를 지정해두면(마케팅 카피) 상품명 그대로 노출 대신 그 문구를 씀 —
    // 예전엔 product가 있으면 custom을 통째로 null 처리해 상품 연결 배너는 카피를 못 넣었음(2026-08-06 수정).
    custom: { image_url: r.image_url, headline: r.headline, subcopy: r.subcopy, link_url: r.link_url },
  }
}

// 소비자 홈 히어로: 노출중(active) 배너만, 순서대로. FK로 products 임베드 조회.
export function useHeroBanners() {
  const [banners, setBanners] = useState<HeroBanner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('hero_banners')
        .select(BANNER_SELECT)
        .eq('active', true)
        .order('sort_order', { ascending: true })
      if (!active) return
      const rows = (data ?? []) as unknown as BannerRow[]
      setBanners(rows.map(mapRow))
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  return { banners, loading }
}
