import type { ShopProduct } from '../../hooks/useShopProducts'
import { comma } from '../../lib/format'
import ImagePlaceholder from '../common/ImagePlaceholder'

// 소비자 상품 카드 — 정보 3개만: 썸네일 / 상품명 1줄 / 가격 1줄
// 「생방송 슬레이트」 월드: 면은 직각, 그림자 없음, 가격은 폭 고정(tabular) 숫자.
// 그리드에서는 원색을 쓰지 않는다 — 빨강은 온에어·마감 같은 신호에만 남겨두고,
// 카드에서 가장 화려한 요소는 상품 사진이어야 한다.
export default function ShopProductCard({ product }: { product: ShopProduct }) {
  const sell = product.sale_price ?? product.price
  const hasSale = product.sale_price != null && product.sale_price < product.price
  const rate = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0
  const soldOut = product.status === 'sold_out'

  return (
    <div>
      {/* 1) 썸네일 */}
      <div className="relative aspect-square overflow-hidden bg-quiet">
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
        {soldOut && (
          <div className="absolute inset-0 bg-ink/70 flex items-center justify-center">
            <span className="text-paper text-[13px] font-bold tracking-[0.08em]">품절</span>
          </div>
        )}
      </div>

      {/* 2) 상품명 1줄 */}
      <p className="text-[14px] text-ink mt-2 line-clamp-1">{product.name}</p>

      {/* 3) 가격 1줄 — 할인율·판매가 모두 굵은 잉크, 원가는 취소선 */}
      <div className="mt-1 flex items-baseline gap-1.5">
        {hasSale && <span className="text-[15px] font-bold tabular-nums text-ink">{rate}%</span>}
        <span className="text-[15px] font-bold tabular-nums text-ink">{comma(sell)}</span>
        <span className="text-[12px] text-ink-faint">원</span>
        {hasSale && (
          <span className="text-[12px] tabular-nums text-ink-faint line-through">{comma(product.price)}</span>
        )}
      </div>
    </div>
  )
}

// 로딩 스켈레톤 (레이아웃 흔들림 방지)
export function ShopProductCardSkeleton() {
  return (
    <div>
      <div className="aspect-square bg-quiet animate-pulse" />
      <div className="h-3 bg-quiet animate-pulse mt-2.5 w-3/4" />
      <div className="h-3 bg-quiet animate-pulse mt-2 w-1/3" />
    </div>
  )
}
