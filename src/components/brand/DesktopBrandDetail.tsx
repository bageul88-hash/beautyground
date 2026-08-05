import ProductCard from '../product/ProductCard'
import Badge from '../common/Badge'
import DesktopHeader from '../layout/DesktopHeader'
import type { BRANDS } from '../../constants'

interface Props {
  brand: (typeof BRANDS)[number]
  onProductClick: (id: number) => void
}

// PC 버전 — 브랜드 배너를 넓게 펼치고(브랜드 고유 색은 이 페이지 자체 규칙이라 유지),
// 상품은 4열 그리드로 표시.
export default function DesktopBrandDetail({ brand, onProductClick }: Props) {
  return (
    <div className="bg-paper min-h-screen">
      <DesktopHeader />

      <div className="px-6 py-14 flex flex-col items-center text-center" style={{ backgroundColor: brand.bgColor }}>
        <div
          className="w-24 h-24 rounded-[28px] flex items-center justify-center text-5xl mb-4"
          style={{ backgroundColor: `${brand.accentColor}33` }}
          aria-hidden="true"
        >
          {brand.icon}
        </div>
        <Badge type="dept" label={brand.deptName} deptKey={brand.deptKey} className="mb-2" />
        <h1 className="font-serif text-[30px] font-bold" style={{ color: brand.textColor }}>
          {brand.name}
        </h1>
        <p className="text-[14px] mt-2 max-w-md leading-relaxed" style={{ color: `${brand.textColor}99` }}>
          {brand.description}
        </p>
        <div className="mt-6 text-center">
          <p className="text-[20px] font-bold" style={{ color: brand.textColor }}>{brand.productCount}</p>
          <p className="text-[11px]" style={{ color: `${brand.textColor}80` }}>상품</p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-10">
        {brand.products.length === 0 ? (
          <p className="text-center py-16 text-ink-faint text-[14px]">상품이 준비 중입니다.</p>
        ) : (
          <div className="grid grid-cols-4 gap-5">
            {brand.products.map((product) => (
              <button
                key={product.id}
                onClick={() => onProductClick(product.id)}
                className="text-left focus:outline-none focus-visible:shadow-ring"
                aria-label={`${product.brand} ${product.name}`}
              >
                <ProductCard {...product} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
