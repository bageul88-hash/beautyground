import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconHeart, IconCart } from '../common/Icon'
import ImagePlaceholder from '../common/ImagePlaceholder'
import type { HeroBanner } from '../../hooks/useHeroBanners'
import type { ShopProduct } from '../../hooks/useShopProducts'
import type { CategoryThumbnail } from '../../hooks/useCategoryThumbnails'

const NAV_LINKS = [
  { href: '/app/category/all', label: '카테고리' },
  { href: '/app/mypage', label: '마이페이지' },
]

const won = (n: number) => n.toLocaleString('ko-KR')

interface Props {
  banners: HeroBanner[]
  categories: string[]
  categoryThumbnails: CategoryThumbnail[]
  recommended: ShopProduct[]
  products: ShopProduct[]
  prodLoading: boolean
  onProductClick: (id: string) => void
  onCategoryClick: (category: string | null) => void
}

// PC 버전 — 「생방송 슬레이트」 기존 규칙 그대로(흰 배경+신호색 3개, 직각, 그림자 없음, tabular 숫자).
// 넓은 화면을 "여러 정보가 동시에 보이는 편성판"으로 쓴다: 히어로 옆에 지금 확인할 상품을
// 나란히 배치해, 모바일처럼 위→아래로 하나씩 내려보지 않고 한눈에 훑을 수 있게 한다.
// 라이브 스트림은 이 화면과 당분간 분리하기로 한 결정(2026-07-29)을 그대로 따라 넣지 않는다.
export default function DesktopHome({
  banners,
  categories,
  categoryThumbnails,
  recommended,
  products,
  prodLoading,
  onProductClick,
  onCategoryClick,
}: Props) {
  const [heroIdx, setHeroIdx] = useState(0)
  const hero = banners[heroIdx]
  const heroCount = Math.max(banners.length, 1)
  const sideList = (recommended.length > 0 ? recommended : products).slice(0, 5)
  const gridProducts = products.length > 0 ? products : recommended

  const heroImage = hero?.custom?.image_url ?? hero?.product?.thumbnail_url ?? null
  const heroTitle = hero?.custom?.headline ?? hero?.product?.name ?? '뷰티그라운드'
  const heroSub = hero?.custom?.subcopy ?? null

  return (
    <div className="bg-paper min-h-screen">
      {/* 헤더 */}
      <header className="bg-paper border-b border-rule sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/app/home" className="text-[19px] font-bold text-ink tracking-[-0.01em]">
            뷰티그라운드
          </Link>
          <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} to={href} className="text-[13px] font-bold text-ink-soft hover:text-ink transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/app/wishlist" aria-label="찜" className="text-ink">
              <IconHeart className="w-[20px] h-[20px]" />
            </Link>
            <Link to="/app/cart" aria-label="장바구니" className="text-ink">
              <IconCart className="w-[20px] h-[20px]" />
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 + 지금 확인할 상품(나란히 배치) */}
      <section className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-[1.7fr_1fr] gap-8 items-stretch">
        <button
          onClick={() => {
            if (banners.length > 1) setHeroIdx((i) => (i + 1) % banners.length)
          }}
          className="relative aspect-[16/9] bg-quiet overflow-hidden text-left"
          aria-label="다음 배너"
        >
          {heroImage ? (
            // object-contain: 브랜드 원본 배너 비율이 이 틀(16:9)과 달라도 상단 사은품 태그·프로모션
            // 배지가 잘리지 않는다(HeroCarousel과 동일한 원칙).
            <img src={heroImage} alt="" className="w-full h-full object-contain" />
          ) : (
            <ImagePlaceholder />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-paper px-6 py-4 flex items-end justify-between border-t border-rule">
            <div>
              <h1 className="text-[20px] font-bold text-ink leading-tight">{heroTitle}</h1>
              {heroSub && <p className="mt-1 text-[13px] text-ink-soft">{heroSub}</p>}
            </div>
            <div className="flex items-center gap-2 text-[12px] tabular-nums text-ink-faint shrink-0">
              <span>{String(heroIdx + 1).padStart(2, '0')}</span>
              <div className="w-14 h-px bg-rule relative">
                <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${((heroIdx + 1) / heroCount) * 100}%` }} />
              </div>
              <span>{String(heroCount).padStart(2, '0')}</span>
            </div>
          </div>
        </button>

        <div className="border border-rule flex flex-col">
          <p className="px-5 py-3 text-[12px] font-bold tracking-[0.08em] text-ink-faint border-b border-rule">지금 확인할 상품</p>
          <ul className="flex-1 divide-y divide-rule overflow-y-auto">
            {sideList.length === 0 ? (
              <li className="px-5 py-6 text-[13px] text-ink-faint">등록된 상품이 없습니다</li>
            ) : (
              sideList.map((p) => {
                const sell = p.sale_price ?? p.price
                const hasDiscount = p.sale_price != null && p.sale_price < p.price
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => onProductClick(p.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left focus:outline-none focus-visible:shadow-ring"
                    >
                      <div className="w-12 h-12 bg-quiet overflow-hidden shrink-0">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImagePlaceholder />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-ink truncate">{p.name}</p>
                        <p className="mt-0.5 text-[13px] font-bold tabular-nums text-ink">
                          {hasDiscount && <span className="text-signal-red mr-1">할인</span>}
                          {won(sell)}원
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </section>

      {/* 카테고리 — 원형은 이 시스템에서 프로필/온에어 표시등에만 허용되므로 직각 타일 유지 */}
      {categories.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 pb-10">
          <div className="flex gap-3 flex-wrap">
            {categories.map((category) => {
              const image = categoryThumbnails.find((t) => t.category === category)?.imageUrl ?? null
              return (
                <button
                  key={category}
                  onClick={() => onCategoryClick(category)}
                  className="flex items-center gap-2.5 border border-rule pl-2 pr-4 py-2 focus:outline-none focus-visible:shadow-ring"
                >
                  <div className="w-8 h-8 bg-quiet overflow-hidden shrink-0">
                    {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <ImagePlaceholder />}
                  </div>
                  <span className="text-[13px] font-bold text-ink">{category}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 상품 그리드 */}
      <section className="max-w-[1280px] mx-auto px-6 pb-16">
        <h2 className="text-[13px] font-bold tracking-[0.08em] text-ink-faint mb-6">신상품</h2>
        {prodLoading ? (
          <div className="grid grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-quiet animate-pulse" />
            ))}
          </div>
        ) : gridProducts.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-ink-faint">등록된 상품이 없습니다</p>
        ) : (
          <div className="grid grid-cols-4 gap-x-6 gap-y-8">
            {gridProducts.map((p) => {
              const sell = p.sale_price ?? p.price
              const hasDiscount = p.sale_price != null && p.sale_price < p.price
              return (
                <button key={p.id} onClick={() => onProductClick(p.id)} className="text-left border-b border-rule pb-4">
                  <div className="aspect-square bg-quiet overflow-hidden">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  {p.brand_name && <p className="mt-3 text-[12px] text-ink-soft">{p.brand_name}</p>}
                  <p className="mt-0.5 text-[13.5px] text-ink line-clamp-1">{p.name}</p>
                  <p className="mt-1 text-[14px] font-bold tabular-nums text-ink">
                    {hasDiscount && <span className="text-signal-red mr-1">할인</span>}
                    {won(sell)}원
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
