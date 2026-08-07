import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../layout/DesktopHeader'
import DesktopFooter from '../layout/DesktopFooter'
import { CATEGORIES } from '../../constants'

const DESCRIPTIONS: Record<string, string> = {
  skincare: '에센스, 크림, 세럼, 토너',
  makeup: '파운데이션, 립, 아이, 쉐딩',
  perfume: '오 드 퍼퓸, 오 드 뚜왈렛, 바디미스트',
  hair: '샴푸, 트리트먼트, 헤어오일',
  body: '바디워시, 바디로션, 핸드크림',
}

// PC 버전 — 카테고리 목록. 모바일의 세로 리스트를 넓은 화면에서는 카드 그리드로 펼친다.
// 원형·색 아이콘은 이 시스템에서 프로필/온에어 표시등에만 허용되므로 잉크 한 색 텍스트 카드로 유지.
export default function DesktopCategory() {
  const navigate = useNavigate()

  return (
    <div className="bg-paper min-h-screen">
      <DesktopHeader />

      <div className="max-w-[1920px] mx-auto px-6 py-10">
        <h1 className="text-[22px] font-bold text-ink">카테고리</h1>
        <p className="text-[13px] text-ink-soft mt-1">원하는 카테고리를 선택하세요</p>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/app/category/${cat.id}`)}
              className="flex items-center justify-between gap-4 border border-rule px-6 py-6 text-left focus:outline-none focus-visible:shadow-ring hover:border-ink transition-colors"
              aria-label={`${cat.label} 카테고리`}
            >
              <div>
                <p className="text-[16px] font-bold text-ink">{cat.label}</p>
                <p className="text-[12.5px] text-ink-soft mt-1">{DESCRIPTIONS[cat.id]}</p>
              </div>
              <span className="text-ink-faint text-lg shrink-0" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </div>

      <DesktopFooter />
    </div>
  )
}
