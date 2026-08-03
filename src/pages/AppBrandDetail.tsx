import { useParams, useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import { useViewMode } from '../lib/viewMode'
import ProductCard from '../components/product/ProductCard'
import Badge from '../components/common/Badge'
import { BRANDS } from '../constants'

export default function AppBrandDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mode, toggle } = useViewMode()

  const brand = BRANDS.find(b => b.id === Number(id))

  if (!brand) {
    return (
      <div className="min-h-screen bg-quiet md:py-6">
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule flex items-center justify-center">
        <p className="text-ink-faint">브랜드를 찾을 수 없습니다.</p>
      </div>
      </div>
    )
  }

  return (
    <AppFrame>
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <BackHeader
        title=""
        transparent
        rightElement={
          <button aria-label="공유" className="text-xl text-white">
            <span aria-hidden="true">↗</span>
          </button>
        }
      />

      {/* 브랜드 헤더 */}
      <div
        className="relative -mt-14 pt-20 pb-8 px-5 flex flex-col items-center text-center"
        style={{ backgroundColor: brand.bgColor }}
      >
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center text-4xl mb-3"
          style={{ backgroundColor: `${brand.accentColor}33` }}
          aria-hidden="true"
        >
          {brand.icon}
        </div>
        <Badge type="dept" label={brand.deptName} deptKey={brand.deptKey} className="mb-2" />
        <h1
          className="font-serif text-[24px] font-bold"
          style={{ color: brand.textColor }}
        >
          {brand.name}
        </h1>
        <p className="text-[13px] mt-1.5 max-w-xs leading-relaxed" style={{ color: `${brand.textColor}99` }}>
          {brand.description}
        </p>
        <div className="mt-5 text-center">
          <p className="text-[18px] font-bold" style={{ color: brand.textColor }}>{brand.productCount}</p>
          <p className="text-[11px]" style={{ color: `${brand.textColor}80` }}>상품</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {brand.products.length === 0 ? (
            <p className="col-span-2 text-center py-10 text-ink-faint text-[14px]">상품이 준비 중입니다.</p>
          ) : (
            brand.products.map(product => (
              <button
                key={product.id}
                onClick={() => navigate(`/app/product/${product.id}`)}
                className="text-left focus:outline-none focus-visible:shadow-ring"
                aria-label={`${product.brand} ${product.name}`}
              >
                <ProductCard {...product} />
              </button>
            ))
          )}
        </div>
      </div>

    </AppFrame>
  )
}
