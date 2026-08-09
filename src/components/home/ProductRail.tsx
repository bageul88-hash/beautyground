import { Link } from 'react-router-dom'
import type { ShopProduct } from '../../hooks/useShopProducts'
import { comma } from '../../lib/format'
import ImagePlaceholder from '../common/ImagePlaceholder'

interface ProductRailProps {
  id: string
  title: string
  products: ShopProduct[]
  loading?: boolean
  emptyText?: string
  moreHref?: string
  onProductClick: (id: string) => void
}

// 「생방송 슬레이트」 월드의 상품 그리드 — 박스(이미지) + 이름 + 가격.
// 특가세일·추천상품·신상품이 전부 이 카드 스타일을 공유해, 섹션이 바뀌어도 같은 방식으로 훑어볼 수 있다.
// 찜·빠른담기 버튼은 썸네일이 지저분해 보인다는 지적으로 제거함(2026-08-09) — 담기는 상품상세에서.
export default function ProductRail({
  id,
  title,
  products,
  loading,
  emptyText = '아직 등록된 상품이 없습니다',
  moreHref,
  onProductClick,
}: ProductRailProps) {
  return (
    <section className="pt-8" aria-labelledby={id}>
      <div className="mb-3 flex items-baseline justify-between px-4">
        <h2 id={id} className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        {moreHref && (
          <Link
            to={moreHref}
            className="shrink-0 text-[13px] text-ink-soft focus:outline-none focus-visible:shadow-ring"
          >
            전체보기 ›
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 px-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="w-[42%] flex-shrink-0">
              <div className="aspect-square bg-quiet animate-pulse" />
              <div className="h-3 bg-quiet animate-pulse mt-2.5 w-3/4" />
              <div className="h-3 bg-quiet animate-pulse mt-2 w-1/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-ink-faint">{emptyText}</p>
      ) : (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth">
          {products.map((product) => {
            const sell = product.sale_price ?? product.price
            const hasSale = product.sale_price != null && product.sale_price < product.price
            const rate = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0
            return (
              // 카드 전체(이미지+이름+가격)를 하나의 외곽선 안에 — 이미지만 테두리, 텍스트는 밖이었던
              // 구조를 레퍼런스처럼 한 장의 둥근 카드로 통합(2026-08-08 피그마 레퍼런스 라운드+그림자 적용).
              <div
                key={product.id}
                className="relative w-[42%] flex-shrink-0 snap-start rounded-card overflow-hidden bg-paper shadow-card"
              >
                <div className="relative aspect-square bg-quiet">
                  <button
                    type="button"
                    onClick={() => onProductClick(product.id)}
                    className="absolute inset-0 w-full h-full focus:outline-none focus-visible:shadow-ring"
                    aria-label={product.name}
                  >
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </button>

                  {product.status === 'sold_out' && (
                    <div className="absolute inset-0 bg-ink/70 flex items-center justify-center pointer-events-none">
                      <span className="text-paper text-[13px] font-bold tracking-[0.08em]">품절</span>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => onProductClick(product.id)} className="text-left w-full px-2.5 pt-3.5 pb-3 focus:outline-none focus-visible:shadow-ring">
                  <p className="text-[15px] text-ink line-clamp-2 leading-snug min-h-[2.7em]">{product.name}</p>
                  {product.reviewCount > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-soft">
                      <span className="text-signal-yellow" aria-hidden="true">★</span>
                      <span className="tabular-nums">{product.reviewAvg?.toFixed(1) ?? '-'}</span>
                      <span className="text-ink-faint">({product.reviewCount.toLocaleString('ko-KR')})</span>
                    </p>
                  )}
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    {hasSale && <span className="text-[16px] font-bold tabular-nums text-accent-deep">{rate}%</span>}
                    <span className="text-[17px] font-bold tabular-nums text-ink">{comma(sell)}</span>
                    <span className="text-[13px] text-ink-faint">원</span>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
