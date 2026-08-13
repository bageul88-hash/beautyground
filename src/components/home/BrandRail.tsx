import { Link } from 'react-router-dom'
import type { ShopBrand } from '../../hooks/useShopBrands'

interface BrandRailProps {
  brands: ShopBrand[]
  loading?: boolean
}

// 2026-08-12 대표님 지시: 파스텔 박스+이니셜 제거, 브랜드명 텍스트만 나열.
// 2026-08-13 대표님 지시: 가로 스크롤(한 줄 넘침) 대신 줄바꿈으로 전체 브랜드명이 한눈에 보이게 변경.
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
        <div className="flex flex-wrap gap-x-5 gap-y-3 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-16 rounded-control bg-quiet animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-3 px-4 pb-1">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/app/brand/${brand.id}`}
              className="text-[14px] font-bold text-ink focus:outline-none focus-visible:shadow-ring"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
