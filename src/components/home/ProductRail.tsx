import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ShopProduct } from '../../hooks/useShopProducts'
import { comma } from '../../lib/format'
import { useReducedMotion } from '../../hooks/useReducedMotion'
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

// 카드 폭(스크롤 컨테이너의 42%)과 이미지 비율(4:5) 기준으로 계산한 화살표 세로 위치.
// 이 화면은 480px 고정 프레임이라(제품 확정 제약) 매 렌더마다 실측하는 대신 고정값을 쓴다 —
// HeroCarousel의 화살표도 같은 방식(고정 오프셋)을 쓴다.
const ARROW_TOP = 'top-[92px]'

// 「생방송 슬레이트」 월드의 가로 스크롤 상품 레일 — 추천 상품·신상품이 같은 컴포넌트를 써서
// 썸네일 비율(4:5)과 스크롤 동작이 항상 일치하게 한다. 터치 스크롤에 더해 좌우 버튼으로도
// 넘길 수 있어, 카드가 화면 폭에 다 안 들어와도 고객이 원하는 방향으로 탐색할 수 있다.
export default function ProductRail({
  id,
  title,
  products,
  loading,
  emptyText = '아직 등록된 상품이 없습니다',
  moreHref,
  onProductClick,
}: ProductRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.84, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  // 화살표는 스크롤할 게 있을 때만 — 카드가 화면에 다 들어오면 눌러도 아무 일도 안 일어나는
  // 죽은 버튼을 보여주지 않는다(2개 이하는 42% 폭 카드 2.3개 정도가 뷰포트에 이미 다 들어옴).
  const canScroll = products.length > 2

  // 카드 폭: 3개 이상이면 42%로 둬서 세 번째 카드가 살짝 걸쳐 보이게(스크롤 가능 힌트).
  // 2개 이하는 스크롤 자체가 없으니(canScroll=false) 42%로 두면 남는 공간이 전부 오른쪽에
  // 몰려 좌우가 비대칭으로 보인다 — 이땐 간격(12px)을 뺀 절반씩 정확히 채운다.
  const cardWidthClass = products.length <= 2 ? 'w-[calc(50%-6px)]' : 'w-[42%]'

  return (
    <section className="pt-10" aria-labelledby={id}>
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
            <div key={i} className="w-[calc(50%-6px)] flex-shrink-0">
              <div className="aspect-[4/5] bg-quiet animate-pulse" />
              <div className="h-3 bg-quiet animate-pulse mt-2.5 w-3/4" />
              <div className="h-3 bg-quiet animate-pulse mt-2 w-1/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-ink-faint">{emptyText}</p>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
          >
            {products.map((product) => {
              const sell = product.sale_price ?? product.price
              const hasSale = product.sale_price != null && product.sale_price < product.price
              const rate = hasSale ? Math.round((1 - product.sale_price! / product.price) * 100) : 0
              return (
                <button
                  key={product.id}
                  onClick={() => onProductClick(product.id)}
                  className={`flex-shrink-0 ${cardWidthClass} snap-start text-left focus:outline-none focus-visible:shadow-ring`}
                  aria-label={product.name}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-quiet">
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
                    {product.status === 'sold_out' && (
                      <div className="absolute inset-0 bg-ink/70 flex items-center justify-center">
                        <span className="text-paper text-[13px] font-bold tracking-[0.08em]">품절</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[14px] text-ink mt-2 line-clamp-2 leading-snug min-h-[2.6em]">{product.name}</p>
                  {product.reviewCount > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-soft">
                      <span className="text-signal-yellow" aria-hidden="true">★</span>
                      <span className="tabular-nums">{product.reviewAvg?.toFixed(1) ?? '-'}</span>
                      <span className="text-ink-faint">({product.reviewCount.toLocaleString('ko-KR')})</span>
                    </p>
                  )}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    {hasSale && <span className="text-[15px] font-bold tabular-nums text-ink">{rate}%</span>}
                    <span className="text-[15px] font-bold tabular-nums text-ink">{comma(sell)}</span>
                    <span className="text-[12px] text-ink-faint">원</span>
                  </div>
                </button>
              )
            })}
          </div>

          {canScroll && (
            <>
              <button
                onClick={() => scrollByCards(-1)}
                aria-label={`${title} 이전`}
                className={`absolute left-1 ${ARROW_TOP} z-10 flex h-8 w-8 items-center justify-center rounded-control border border-rule bg-paper text-ink focus:outline-none focus-visible:shadow-ring`}
              >
                <span aria-hidden="true" className="text-base font-bold leading-none">‹</span>
              </button>
              <button
                onClick={() => scrollByCards(1)}
                aria-label={`${title} 다음`}
                className={`absolute right-1 ${ARROW_TOP} z-10 flex h-8 w-8 items-center justify-center rounded-control border border-rule bg-paper text-ink focus:outline-none focus-visible:shadow-ring`}
              >
                <span aria-hidden="true" className="text-base font-bold leading-none">›</span>
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
