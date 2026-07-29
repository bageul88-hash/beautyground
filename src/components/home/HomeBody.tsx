import AppHeader from '../layout/AppHeader'
import HeroCarousel from './HeroCarousel'
import MarqueeBar from './MarqueeBar'
import CategoryShortcutGrid from './CategoryShortcutGrid'
import ProductRail from './ProductRail'
import type { HeroBanner } from '../../hooks/useHeroBanners'
import type { ShopProduct } from '../../hooks/useShopProducts'
import type { CategoryThumbnail } from '../../hooks/useCategoryThumbnails'

interface HomeBodyProps {
  marqueeItems: string[]
  banners: HeroBanner[]
  categories: string[]
  categoryThumbnails: CategoryThumbnail[]
  recommended: ShopProduct[]
  products: ShopProduct[]
  prodLoading: boolean
  onProductClick: (id: string) => void
  onCategoryClick: (category: string | null) => void
}

// 홈 화면 본문(마퀴~상품그리드) — 실제 /app/home과 관리자 미리보기가 공유하는 프레젠테이션 컴포넌트.
// 데이터는 항상 부모(AppHome 또는 관리자 화면)가 내려준다(직접 fetch 하지 않음).
export default function HomeBody({
  marqueeItems,
  banners,
  categories,
  categoryThumbnails,
  recommended,
  products,
  prodLoading,
  onProductClick,
  onCategoryClick,
}: HomeBodyProps) {
  return (
    <>
      <MarqueeBar items={marqueeItems} />
      <AppHeader />
      <HeroCarousel banners={banners} />
      <CategoryShortcutGrid categories={categories} thumbnails={categoryThumbnails} onSelect={onCategoryClick} />

      {/* 추천 상품·신상품은 같은 가로 스크롤 레일 컴포넌트를 써서 썸네일 비율과
          좌우 버튼 탐색이 두 섹션에서 항상 일치한다. */}
      <ProductRail
        id="home-recommended"
        title="추천 상품"
        products={recommended}
        onProductClick={onProductClick}
      />
      <ProductRail
        id="home-products"
        title="신상품"
        products={products}
        loading={prodLoading}
        onProductClick={onProductClick}
      />
    </>
  )
}
