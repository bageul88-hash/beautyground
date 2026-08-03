import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'
import AppFrame from '../components/layout/AppFrame'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import { useViewMode } from '../lib/viewMode'
import { CATEGORIES } from '../constants'

export default function AppCategory() {
  const navigate = useNavigate()
  const { mode, toggle } = useViewMode()

  return (
    <AppFrame>
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <AppHeader />

      <div className="px-4 pt-5 pb-3">
        <h1 className="text-[18px] font-bold text-ink">카테고리</h1>
        <p className="text-[13px] text-ink-soft mt-1">원하는 카테고리를 선택하세요</p>
      </div>

      {/* 이모지·카테고리별 색 제거 — 잉크 한 색으로 통일, 세로 여백은 목록 한 줄 높이로 압축 */}
      <div className="px-4 border-y border-rule divide-y divide-rule">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => navigate(`/app/category/${cat.id}`)}
            className="flex items-center justify-between gap-4 py-4 text-left focus:outline-none focus-visible:shadow-ring w-full"
            aria-label={`${cat.label} 카테고리`}
          >
            <div>
              <p className="text-[15px] font-bold text-ink">{cat.label}</p>
              <p className="text-[12.5px] text-ink-soft mt-0.5">
                {cat.id === 'skincare' && '에센스, 크림, 세럼, 토너'}
                {cat.id === 'makeup' && '파운데이션, 립, 아이, 쉐딩'}
                {cat.id === 'perfume' && '오 드 퍼퓸, 오 드 뚜왈렛, 바디미스트'}
                {cat.id === 'hair' && '샴푸, 트리트먼트, 헤어오일'}
                {cat.id === 'body' && '바디워시, 바디로션, 핸드크림'}
              </p>
            </div>
            <span className="text-ink-faint text-lg shrink-0" aria-hidden="true">›</span>
          </button>
        ))}
      </div>

    </AppFrame>
  )
}
