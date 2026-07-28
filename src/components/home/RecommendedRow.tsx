import type { ShopProduct } from '../../hooks/useShopProducts'
import { won } from '../../lib/format'

interface RecommendedRowProps {
  products: ShopProduct[]
  onProductClick: (id: string) => void
}

// 홈 "추천 상품" — 옆으로 스크롤되는 카드 로우(라이브 카드보다 이미지 비중 큰 세로형 카드)
export default function RecommendedRow({ products, onProductClick }: RecommendedRowProps) {
  if (products.length === 0) return null

  return (
    <section className="pt-5" aria-labelledby="home-recommended">
      <div className="flex items-center justify-between px-4 mb-2.5">
        <h2 id="home-recommended" className="text-base font-bold text-text">
          추천 상품
        </h2>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {products.map((product) => {
          const sell = product.sale_price ?? product.price
          const hasSale = product.sale_price != null && product.sale_price < product.price
          const rate = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0
          return (
            <button
              key={product.id}
              onClick={() => onProductClick(product.id)}
              className="flex-shrink-0 w-[42%] snap-start text-left focus:outline-none focus:shadow-focus rounded-lg"
              aria-label={product.name}
            >
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-cream-3">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src="/images/bg-logo-mark.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
                )}
                {product.status === 'sold_out' && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">품절</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-text mt-1.5 line-clamp-1">{product.name}</p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                {hasSale && <span className="text-[13px] font-bold text-gold">{rate}%</span>}
                <span className="text-sm font-bold text-text">{won(sell)}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
