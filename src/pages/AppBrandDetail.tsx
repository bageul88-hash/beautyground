import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import AppFooter from '../components/layout/AppFooter'
import ShopProductCard, { ShopProductCardSkeleton } from '../components/product/ShopProductCard'
import { useShopProducts } from '../hooks/useShopProducts'
import { supabase } from '../lib/supabase'

// 브랜드 전용관 — 카테고리/홈의 브랜드 레일에서 브랜드명을 누르면 진입(2026-08-13 대표님 지시로 재작성).
// 이전 버전은 목업(BRANDS 상수, 숫자 id) 기반이라 실제 partner_id(UUID)로는 항상
// "브랜드를 찾을 수 없습니다"가 떴음 — partner_brands + products 실데이터로 전면 교체.
// PC에서도 중앙 480px 레이아웃(전용 PC 레이아웃 없음 — 구 DesktopBrandDetail은 목업 기반이라 미사용).
export default function AppBrandDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [brandName, setBrandName] = useState<string | null>(null)
  const [nameLoading, setNameLoading] = useState(true)

  const { products, loading, error, hasMore, loadMore } = useShopProducts({
    brand: id ?? undefined,
    pageSize: 20,
  })

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!id) { setNameLoading(false); return }
      const { data } = await supabase.from('partner_brands').select('brand_name').eq('id', id).maybeSingle()
      if (!active) return
      setBrandName((data?.brand_name as string) ?? null)
      setNameLoading(false)
    })()
    return () => { active = false }
  }, [id])

  if (!nameLoading && !brandName) {
    return (
      <AppFrame>
        <BackHeader title="브랜드" />
        <p className="text-center py-16 text-ink-faint text-[14px]">브랜드를 찾을 수 없습니다.</p>
        <AppFooter />
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <BackHeader title={brandName ?? ''} />

      {/* 브랜드 헤더 — 브랜드명 + 판매중 상품 수 */}
      <div className="px-4 pt-7 pb-5 border-b border-rule">
        <h1 className="text-[22px] font-bold text-ink">{brandName ?? ' '}</h1>
        {!loading && (
          <p className="text-[13px] text-ink-soft mt-1">판매중 상품 {products.length}개{hasMore ? '+' : ''}</p>
        )}
      </div>

      <div className="px-4 pt-4">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ShopProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <p className="text-center py-16 text-ink-faint text-[14px]">{error}</p>
        ) : products.length === 0 ? (
          <p className="text-center py-16 text-ink-faint text-[14px]">상품이 준비 중입니다.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/app/product/${product.id}`)}
                  className="text-left focus:outline-none focus-visible:shadow-ring"
                  aria-label={`${brandName ?? ''} ${product.name}`}
                >
                  <ShopProductCard product={product} />
                </button>
              ))}
            </div>
            {hasMore && (
              <div className="pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-3 rounded-control border border-rule text-[14px] text-ink-soft disabled:opacity-50 focus:outline-none focus-visible:shadow-ring"
                >
                  {loading ? '불러오는 중…' : '더보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AppFooter />
    </AppFrame>
  )
}
