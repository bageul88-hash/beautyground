import type { ShopProduct } from '../../hooks/useShopProducts'
import { comma } from '../../lib/format'
import ImagePlaceholder from '../common/ImagePlaceholder'
import Thumb from '../common/Thumb'

// 소비자 상품 카드 — 썸네일 / 상품명 2줄 / 리뷰(있으면) / 가격.
// 「생방송 슬레이트」 월드: 면은 직각, 그림자 없음, 가격은 폭 고정(tabular) 숫자.
// 그리드에서는 원색을 쓰지 않는다 — 빨강은 온에어·마감 같은 신호에만 남겨두고,
// 카드에서 가장 화려한 요소는 상품 사진이어야 한다.
// 이름을 1줄로 자르면 대부분 "..."로 뭉개져 무슨 상품인지 안 읽혔다(2026-08-06) — 2줄로 확장.
// 리뷰(별점·건수)는 실제 2,600건+ 데이터가 있는데 홈 그리드엔 전혀 안 보이던 걸 노출.
export default function ShopProductCard({ product }: { product: ShopProduct }) {
  const sell = product.sale_price ?? product.price
  const hasSale = product.sale_price != null && product.sale_price < product.price
  const rate = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0
  const soldOut = product.status === 'sold_out'

  return (
    // data-product-id: 뒤로가기 시 "클릭했던 상품 위치로 복귀"의 앵커 (ScrollRestoration이 클릭을 감지해 저장)
    <div data-product-id={product.id}>
      {/* 1) 썸네일 */}
      <div className="relative aspect-square overflow-hidden bg-quiet">
        {product.thumbnail_url ? (
          <Thumb
            src={product.thumbnail_url}
            alt={product.name}
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

      {/* 2) 상품명 2줄 */}
      <p className="text-[14px] text-ink mt-2 line-clamp-2 leading-snug min-h-[2.6em]">{product.name}</p>

      {/* 리뷰 — 데이터 있는 상품만 (없으면 자리 안 차지) */}
      {product.reviewCount > 0 && (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-soft">
          <span className="text-signal-yellow" aria-hidden="true">★</span>
          <span className="tabular-nums">{product.reviewAvg?.toFixed(1) ?? '-'}</span>
          <span className="text-ink-faint">({product.reviewCount.toLocaleString('ko-KR')})</span>
        </p>
      )}

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
