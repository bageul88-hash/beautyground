import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/layout/BottomNav'
import AppFooter from '../components/layout/AppFooter'
import KakaoPromoBar from '../components/home/KakaoPromoBar'
import HomeBody from '../components/home/HomeBody'
import { useShopProducts } from '../hooks/useShopProducts'
import { useShopCategories } from '../hooks/useShopCategories'
import { useShopLives } from '../hooks/useShopLives'
import { useHeroBanners } from '../hooks/useHeroBanners'
import { useCategoryThumbnails } from '../hooks/useCategoryThumbnails'

export default function AppHome() {
  const navigate = useNavigate()
  const { products: latestProducts, loading: prodLoading } = useShopProducts({ sort: 'latest', pageSize: 40 })
  // 홈 신상품: 한 브랜드가 향·옵션별로 여러 상품을 한꺼번에 등록해도 같은 썸네일로 도배되지 않게 브랜드당 최대 2개
  const products = useMemo(() => {
    const perBrand = new Map<string, number>()
    const out: typeof latestProducts = []
    for (const p of latestProducts) {
      const key = p.brand_name ?? p.id
      const n = perBrand.get(key) ?? 0
      if (n >= 2) continue
      perBrand.set(key, n + 1)
      out.push(p)
      if (out.length >= 10) break
    }
    return out
  }, [latestProducts])
  // 추천 상품: 신상품 그리드에 이미 나온 상품과 겹치지 않게 나머지 중에서 브랜드당 최대 2개
  // (별도 추천 로직·관리자 큐레이션은 아직 없음 — 우선 신상품과 안 겹치는 실제 판매중 상품으로 채움)
  const recommended = useMemo(() => {
    const shown = new Set(products.map((p) => p.id))
    const perBrand = new Map<string, number>()
    const out: typeof latestProducts = []
    for (const p of latestProducts) {
      if (shown.has(p.id)) continue
      const key = p.brand_name ?? p.id
      const n = perBrand.get(key) ?? 0
      if (n >= 2) continue
      perBrand.set(key, n + 1)
      out.push(p)
      if (out.length >= 10) break
    }
    return out
  }, [latestProducts, products])
  const { categories } = useShopCategories()
  const { lives } = useShopLives()
  // 라이브커머스 고객 오픈(대표님 지시 2026-07-28) — 일반 고객 홈에도 "지금 라이브" 섹션 노출.
  const visibleLives = lives
  const { banners } = useHeroBanners()
  const { thumbnails: categoryThumbnails } = useCategoryThumbnails()

  return (
    // PC에서도 모바일 앱처럼 가운데 고정 폭 프레임 + 바깥 여백/배경 (med-ligne 참고)
    <div className="min-h-screen bg-cream-2 md:py-6">
      <div className="max-w-[480px] mx-auto bg-cream-4 min-h-screen md:min-h-0 md:rounded-b-lg md:overflow-hidden md:shadow-[0_12px_28px_-16px_rgba(23,19,16,.35)] pb-24">
        {/* 상단 카카오톡 채널 추가 배너 (직각·좌측 스크롤) */}
        <KakaoPromoBar />
        <HomeBody
          marqueeItems={[]}
          banners={banners}
          lives={visibleLives}
          categories={categories}
          categoryThumbnails={categoryThumbnails}
          recommended={recommended}
          products={products}
          prodLoading={prodLoading}
          onProductClick={(id) => navigate(`/app/product/${id}`)}
          onCategoryClick={(cat) =>
            navigate(cat ? `/app/category/all?cat=${encodeURIComponent(cat)}` : '/app/category/all')
          }
        />
        <AppFooter />
        <BottomNav />
      </div>
    </div>
  )
}
