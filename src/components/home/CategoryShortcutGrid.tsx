interface CategoryShortcutGridProps {
  categories: string[]
  onSelect: (category: string) => void
}

// 홈 화면 카테고리 바로가기 — 상품이 있는 카테고리만 노출.
// 2026-08-08 대표님 확정 레퍼런스(쇼핑몰예시.jpg) 픽셀 실측: 이미지 타일 대신
// 테두리 알약 칩 한 줄(가로 스크롤)로 — 레퍼런스의 Fragrance/Makeup/Hair/Skincare와 동일 형태.
export default function CategoryShortcutGrid({ categories, onSelect }: CategoryShortcutGridProps) {
  if (categories.length === 0) return null

  return (
    <section className="pt-6" aria-labelledby="home-category-grid">
      <h2 id="home-category-grid" className="sr-only">
        카테고리
      </h2>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className="shrink-0 rounded-pill border border-rule px-4 py-2.5 text-[13px] font-bold text-ink focus:outline-none focus-visible:shadow-ring"
          >
            {category}
          </button>
        ))}
      </div>
    </section>
  )
}
