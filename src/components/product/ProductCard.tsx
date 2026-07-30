import type { ProductCard as ProductCardType } from '../../types'
import { DEPT_COLOR } from '../../constants'

export default function ProductCard({ brand, name, price, originalPrice, deptName, deptKey, thumbIcon, thumbColor }: ProductCardType) {
  const deptStyle = DEPT_COLOR[deptKey]

  return (
    <div className="bg-paper overflow-hidden border border-rule">
      <div
        className="h-[110px] flex items-center justify-center text-4xl"
        style={{ backgroundColor: thumbColor }}
        aria-hidden="true"
      >
        {thumbIcon}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-ink-soft font-medium">{brand}</p>
        <p className="text-[13px] font-semibold text-ink mt-0.5 line-clamp-2 leading-tight">{name}</p>
        <div className="mt-1.5">
          <span className="text-[14px] font-bold tabular-nums text-ink">
            {price.toLocaleString('ko-KR')}원
          </span>
          {originalPrice && (
            <span className="text-ink-faint text-[11px] line-through tabular-nums ml-1.5">
              {originalPrice.toLocaleString('ko-KR')}원
            </span>
          )}
        </div>
        <div className="mt-2">
          {/* 백화점별 실제 브랜드 색 — 파트너사 고유색이라 예외(Badge.tsx dept와 동일 원칙) */}
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-control"
            style={{ backgroundColor: deptStyle.bg, color: deptStyle.text }}
          >
            {deptName}
          </span>
        </div>
      </div>
    </div>
  )
}
