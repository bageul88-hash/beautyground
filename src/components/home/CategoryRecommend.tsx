import { useState } from 'react'
import ImagePlaceholder from '../common/ImagePlaceholder'
import { useCategoryRecommendations } from '../../hooks/useCategoryRecommendations'

const won = (n: number) => n.toLocaleString('ko-KR')

// 카테고리 탭을 눌러 그 카테고리의 추천 상품을 바로 훑어볼 수 있는 섹션.
export default function CategoryRecommend({
  categories,
  onProductClick,
}: {
  categories: string[]
  onProductClick: (id: string) => void
}) {
  const { byCategory, loading } = useCategoryRecommendations(categories)
  const [active, setActive] = useState(categories[0] ?? '')

  if (categories.length === 0) return null
  const activeCategory = byCategory[active] ? active : categories[0]
  const items = byCategory[activeCategory] ?? []

  return (
    <section className="max-w-[1920px] mx-auto px-6 py-12">
      <h2 className="text-[13px] font-bold tracking-[0.08em] text-ink-faint mb-6">카테고리별 추천</h2>
      <div className="flex gap-2 border-b border-rule mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-2.5 text-[13px] font-bold border-b-2 -mb-px transition-colors focus:outline-none focus-visible:shadow-ring ${
              activeCategory === cat ? 'border-ink text-ink' : 'border-transparent text-ink-faint hover:text-ink-soft'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-x-6 gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-quiet animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-ink-faint">등록된 상품이 없습니다</p>
      ) : (
        <div className="grid grid-cols-4 gap-x-6 gap-y-8">
          {items.map((p) => {
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
                <p className="mt-0.5 text-[13.5px] text-ink line-clamp-2 leading-snug min-h-[2.5em]">{p.name}</p>
                {p.reviewCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-soft">
                    <span className="text-signal-yellow" aria-hidden="true">★</span>
                    <span className="tabular-nums">{p.reviewAvg?.toFixed(1) ?? '-'}</span>
                    <span className="text-ink-faint">({p.reviewCount.toLocaleString('ko-KR')})</span>
                  </p>
                )}
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
  )
}
