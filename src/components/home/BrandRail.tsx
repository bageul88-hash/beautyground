import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ShopBrand } from '../../hooks/useShopBrands'

interface BrandRailProps {
  brands: ShopBrand[]
  loading?: boolean
}

// 2026-08-12 대표님 지시: 파스텔 박스+이니셜 제거, 브랜드명 텍스트만 나열.
// 터치는 브라우저가 기본으로 스와이프 스크롤 지원, 마우스는 클릭+드래그로 좌우 이동 가능하게 추가.
export default function BrandRail({ brands, loading }: BrandRailProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollRef = useRef(0)
  const draggedRef = useRef(false)

  if (!loading && brands.length === 0) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    const track = trackRef.current
    if (!track) return
    isDraggingRef.current = true
    draggedRef.current = false
    dragStartXRef.current = e.pageX
    dragStartScrollRef.current = track.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const track = trackRef.current
    if (!track) return
    e.preventDefault()
    const delta = e.pageX - dragStartXRef.current
    if (Math.abs(delta) > 4) draggedRef.current = true
    track.scrollLeft = dragStartScrollRef.current - delta
  }

  const stopDragging = () => {
    isDraggingRef.current = false
  }

  // 드래그 도중 놓인 손을 클릭으로 오인해 링크 이동이 안 되게 방지
  const handleClickCapture = (e: React.MouseEvent) => {
    if (draggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <section className="pt-8" aria-labelledby="home-brand-rail">
      <div className="mb-3 px-4">
        <h2 id="home-brand-rail" className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          브랜드
        </h2>
      </div>

      {loading ? (
        <div className="flex gap-4 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-16 rounded-control bg-quiet animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          ref={trackRef}
          className="flex gap-5 px-4 pb-1 overflow-x-auto scrollbar-hide scroll-smooth cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onClickCapture={handleClickCapture}
        >
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/app/brand/${brand.id}`}
              className="shrink-0 text-[14px] font-bold text-ink whitespace-nowrap focus:outline-none focus-visible:shadow-ring"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
