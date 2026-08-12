import { Link } from 'react-router-dom'
import type { ShopBrand } from '../../hooks/useShopBrands'

interface BrandRailProps {
  brands: ShopBrand[]
  loading?: boolean
}

// 목업(live-commerce-new)의 "브랜드" 타일 섹션 — 색은 목업 designTokens.js의 brand-tile-1~5와
// 1:1 동일한 값(2026-08-12, 대표님 지시로 라이브 메인이 목업 톤을 최우선으로 가져감).
const TILE_COLORS = [
  'bg-brand-tile-1 text-ink',
  'bg-brand-tile-2 text-ink',
  'bg-brand-tile-3 text-ink',
  'bg-brand-tile-4 text-ink',
  'bg-brand-tile-5 text-ink',
]

export default function BrandRail({ brands, loading }: BrandRailProps) {
  if (!loading && brands.length === 0) return null

  return (
    <section className="pt-8" aria-labelledby="home-brand-rail">
      <div className="mb-3 px-4">
        <h2 id="home-brand-rail" className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          브랜드
        </h2>
      </div>

      {loading ? (
        <div className="flex gap-3 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-20 flex-shrink-0">
              <div className="h-14 rounded-card bg-quiet animate-pulse" />
              <div className="h-3 bg-quiet animate-pulse mt-2 w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 px-4 pb-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth">
          {brands.map((brand, i) => (
            <Link
              key={brand.id}
              to={`/app/brand/${brand.id}`}
              className="w-20 flex-shrink-0 snap-start flex flex-col items-center gap-2 focus:outline-none focus-visible:shadow-ring"
            >
              <div
                className={`w-20 h-14 rounded-card flex items-center justify-center text-xl font-bold ${TILE_COLORS[i % TILE_COLORS.length]}`}
              >
                {brand.name.charAt(0)}
              </div>
              <span className="text-[13px] text-ink-soft truncate w-full text-center">{brand.name}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
