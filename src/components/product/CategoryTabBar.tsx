import { useNavigate } from 'react-router-dom'
import { useShopCategories } from '../../hooks/useShopCategories'

// 고객 상세/구매 페이지 상단 고정 카테고리 바.
// 위 헤더(sticky top-0)의 실제 높이만큼 stickyTop으로 오프셋을 맞춰 붙어야 스크롤해도 안 밀리고
// 헤더 바로 아래에 딱 붙어 따라온다. 모바일 BackHeader는 h-14라 기본값 top-14, PC 헤더(h-16)는
// 호출부에서 top-16을 넘겨야 한다.
// 우리 실제 판매 카테고리(useShopCategories)를 노출하고, 클릭 시 해당 카테고리 목록으로 이동.
export default function CategoryTabBar({
  active,
  stickyTop = 'top-14',
}: {
  active?: string | null
  stickyTop?: string
}) {
  const navigate = useNavigate()
  const { categories } = useShopCategories()

  const go = (cat: string | null) =>
    navigate(cat ? `/app/category/all?cat=${encodeURIComponent(cat)}` : '/app/category/all')

  const chip = (label: string, isActive: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-control text-[13px] font-bold whitespace-nowrap border focus:outline-none focus-visible:shadow-ring ${
        isActive ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule'
      }`}
    >
      {label}
    </button>
  )

  return (
    <nav className={`sticky ${stickyTop} z-40 bg-paper border-b border-rule`}>
      <div className="max-w-[1280px] mx-auto flex gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2.5">
        {chip('전체', active == null, () => go(null))}
        {categories.map((cat) => chip(cat, active === cat, () => go(cat)))}
      </div>
    </nav>
  )
}
