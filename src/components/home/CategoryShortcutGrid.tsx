import type { CategoryThumbnail } from '../../hooks/useCategoryThumbnails'
import ImagePlaceholder from '../common/ImagePlaceholder'

interface CategoryShortcutGridProps {
  categories: string[]
  thumbnails: CategoryThumbnail[]
  onSelect: (category: string) => void
}

// 홈 화면 카테고리 바로가기 — 상품이 있는 카테고리만 노출.
// 「생방송 슬레이트」 월드: 원형은 프로필과 온에어 표시등에만 허용되므로
// 카테고리 썸네일은 직각 타일로 두고, 격자 자체가 화면의 뼈대가 되게 한다.
export default function CategoryShortcutGrid({ categories, thumbnails, onSelect }: CategoryShortcutGridProps) {
  const imageOf = (category: string) => thumbnails.find((t) => t.category === category)?.imageUrl ?? null

  if (categories.length === 0) return null

  return (
    <section className="pt-8 px-4" aria-labelledby="home-category-grid">
      <h2 id="home-category-grid" className="sr-only">
        카테고리
      </h2>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {categories.map((category) => {
          const image = imageOf(category)
          return (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className="flex flex-col items-center gap-2 focus:outline-none focus-visible:shadow-ring"
              aria-label={category}
            >
              <div className="w-full aspect-square overflow-hidden bg-quiet">
                {image ? (
                  <img src={image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlaceholder />
                )}
              </div>
              <span className="text-[12px] font-bold text-ink truncate max-w-full">{category}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
