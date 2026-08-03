import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import BottomNav from '../components/layout/BottomNav'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import DesktopProductDetail from '../components/product/DesktopProductDetail'
import { useViewMode } from '../lib/viewMode'
import { supabase } from '../lib/supabase'
import { addToCart } from '../lib/cart'
import { isWished, addWish, removeWish } from '../lib/wishlist'
import type { Product, ScrapedReview, ReviewSummaryData } from '../lib/types'
import { ALL_PRODUCTS, SHIPPING_NOTICE } from '../constants'
import ProductInfoTable from '../components/product/ProductInfoTable'
import CategoryTabBar from '../components/product/CategoryTabBar'
import ReviewSummary from '../components/product/ReviewSummary'
import { IconHeart, IconCart, IconMinus, IconPlus } from '../components/common/Icon'
import ImagePlaceholder from '../components/common/ImagePlaceholder'

const DETAIL_TABS = ['상품정보', '성분', '배송/반품']

// 소비자 상세 렌더링용 통합 뷰모델 (DB 상품 / 목데이터 공통)
interface ProductView {
  name: string
  brand: string
  category: string | null
  reviewSummary: ReviewSummaryData | null
  price: number // 판매가
  originalPrice: number | null // 정가 (할인 있을 때만)
  images: string[]
  detailImages: string[]
  description: string | null
  stock: number | null // null = 재고 무제한(목데이터)
  soldOut: boolean
  reviews: ScrapedReview[]
  // 목데이터 전용(이미지 없을 때 아이콘 표시)
  thumbIcon?: string
  thumbColor?: string
}

// DB 상품 → 뷰모델
function fromDbProduct(p: Product, brand: string): ProductView {
  const images =
    p.gallery_images && p.gallery_images.length > 0
      ? p.gallery_images
      : p.thumbnail_url
      ? [p.thumbnail_url]
      : []
  const sell = p.sale_price ?? p.price
  const hasDiscount = p.sale_price != null && p.sale_price < p.price
  return {
    name: p.name,
    brand,
    category: p.category ?? null,
    reviewSummary: p.review_summary ?? null,
    price: sell,
    originalPrice: hasDiscount ? p.price : null,
    images,
    detailImages: p.detail_images ?? [],
    description: p.description,
    stock: p.stock,
    soldOut: p.status === 'sold_out' || p.stock <= 0,
    reviews: p.scraped_reviews ?? [],
  }
}

// 목데이터 상품 → 뷰모델
function fromMock(m: (typeof ALL_PRODUCTS)[number]): ProductView {
  return {
    name: m.name,
    brand: m.brand,
    category: null,
    reviewSummary: null,
    price: m.price,
    originalPrice: m.originalPrice ?? null,
    images: [],
    detailImages: [],
    description: null,
    stock: null,
    soldOut: false,
    reviews: [],
    thumbIcon: m.thumbIcon,
    thumbColor: m.thumbColor,
  }
}

export default function AppProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { mode, isDesktop, toggle } = useViewMode()
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState(0)
  const [activeImg, setActiveImg] = useState(0)
  const [wished, setWished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ProductView | null>(null)
  const [toast, setToast] = useState('')

  // DB 상품 우선 로드, 숫자 id(목데이터)면 목데이터 폴백
  useEffect(() => {
    let active = true
    const isNumeric = !!id && /^\d+$/.test(id)

    async function load() {
      if (id && !isNumeric) {
        const { data } = await supabase.from('products').select('*').eq('id', id).single()
        if (data) {
          const p = data as Product
          let brand = ''
          if (p.partner_id) {
            const { data: pt } = await supabase.from('partners').select('brand_name').eq('id', p.partner_id).single()
            brand = (pt as { brand_name?: string } | null)?.brand_name ?? ''
          }
          if (active) { setView(fromDbProduct(p, brand)); setLoading(false) }
          isWished(id).then((w) => { if (active) setWished(w) })
          return
        }
      }
      // 폴백: 목데이터
      const mock = ALL_PRODUCTS.find(p => p.id === Number(id))
      if (active) { setView(mock ? fromMock(mock) : null); setLoading(false) }
    }

    load()
    return () => { active = false }
  }, [id])

  // 비로그인 상태로 "구매하기"를 눌러 로그인 페이지로 갔다가(?intent=buy 태그) 로그인 완료 후
  // 이 페이지로 돌아오면, 다시 누르게 하지 않고 자동으로 주문서까지 이어간다.
  useEffect(() => {
    if (loading || !view || !id) return
    if (new URLSearchParams(location.search).get('intent') !== 'buy') return
    let active = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active || !session) return
      navigate('/app/order', {
        replace: true,
        state: {
          items: [
            {
              product_id: id,
              name: view.name,
              price: view.price,
              quantity,
              thumbnail: view.images[0] ?? null,
            },
          ],
        },
      })
    })()
    return () => { active = false }
  }, [loading, view, id, quantity, location.search, navigate])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-quiet md:py-6">
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule flex items-center justify-center">
        <p className="text-ink-faint text-[14px]">불러오는 중...</p>
      </div>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-quiet md:py-6">
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule flex items-center justify-center">
        <p className="text-ink-faint">상품을 찾을 수 없습니다.</p>
      </div>
      </div>
    )
  }

  const discountRate = view.originalPrice
    ? Math.round((1 - view.price / view.originalPrice) * 100)
    : 0
  const maxQty = view.stock != null ? Math.max(1, view.stock) : 99
  const total = view.price * quantity
  const isDbProduct = !!id && !/^\d+$/.test(id)

  // 비로그인이면 로그인 페이지로 보내고, 로그인 후 원래 페이지로 복귀
  // intent를 넘기면 로그인 완료 후 그 의도(예: 구매)를 자동으로 이어간다
  const requireLogin = async (intent?: string): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return true
    const qs = intent ? `?intent=${intent}` : ''
    navigate('/app/login', { state: { from: `/app/product/${id}${qs}` } })
    return false
  }

  const onBuy = async () => {
    if (!isDbProduct || !id) { showToast('목데이터 상품은 구매할 수 없습니다'); return }
    if (!(await requireLogin('buy'))) return
    navigate('/app/order', {
      state: {
        items: [
          {
            product_id: id,
            name: view.name,
            price: view.price,
            quantity,
            thumbnail: view.images[0] ?? null,
          },
        ],
      },
    })
  }

  const onAddToCart = async () => {
    if (!isDbProduct || !id) { showToast('목데이터 상품은 담을 수 없습니다'); return }
    // 장바구니는 로그인 없이 담을 수 있다(게스트 장바구니). 로그인은 결제 시점에만.
    const { error } = await addToCart(id, quantity)
    showToast(error ? '장바구니 담기에 실패했습니다' : '장바구니에 담았습니다')
  }

  const toggleWish = async () => {
    if (!isDbProduct || !id) return
    if (!(await requireLogin())) return
    const next = !wished
    setWished(next)
    if (next) {
      const { error } = await addWish(id)
      if (error) setWished(!next)
    } else {
      await removeWish(id)
    }
  }

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopProductDetail
          id={id}
          view={view}
          discountRate={discountRate}
          quantity={quantity}
          setQuantity={setQuantity}
          maxQty={maxQty}
          total={total}
          wished={wished}
          toggleWish={toggleWish}
          onBuy={onBuy}
          onAddToCart={onAddToCart}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-quiet md:py-6">
    <ViewModeToggle mode={mode} onToggle={toggle} />
    <div
      className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule"
      style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
    >
      <BackHeader
        rightElement={
          <div className="flex items-center gap-3 text-ink">
            <button onClick={toggleWish} aria-label={wished ? '찜 해제' : '찜하기'} className="focus:outline-none focus-visible:shadow-ring">
              <IconHeart filled={wished} />
            </button>
            <button onClick={() => navigate('/app/cart')} aria-label="장바구니" className="focus:outline-none focus-visible:shadow-ring">
              <IconCart />
            </button>
          </div>
        }
      />

      {/* 상단 고정 카테고리 바 (스크롤해도 헤더 아래에 고정) */}
      <CategoryTabBar active={view.category} />

      {/* 다른 /app/* 페이지와 동일하게 항상 480px 단일 컬럼 (데스크톱 전용 2컬럼 레이아웃 폐기) */}
      {view.images.length > 0 ? (
        <div>
          <div className="aspect-square max-h-[560px] bg-quiet flex items-center justify-center overflow-hidden">
            <img
              src={view.images[Math.min(activeImg, view.images.length - 1)]}
              alt={view.name}
              className="w-full h-full object-contain"
            />
          </div>
          {view.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
              {view.images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-14 h-14 overflow-hidden border-2 focus:outline-none focus-visible:shadow-ring ${i === activeImg ? 'border-ink' : 'border-rule'}`}
                  aria-label={`${i + 1}번째 이미지`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ImagePlaceholder className="aspect-square w-full" />
      )}

      <div className="px-4 pt-5 pb-4">
        {view.brand && <p className="text-[13px] text-ink-soft">{view.brand}</p>}
        <h1 className="text-[18px] font-bold text-ink mt-1 leading-tight">{view.name}</h1>

        {/* 가격 */}
        <div className="flex items-end gap-2 mt-3">
          {discountRate > 0 && (
            <span className="text-[22px] font-bold tabular-nums text-ink">{discountRate}%</span>
          )}
          <span className="text-[24px] font-bold tabular-nums text-ink">
            {view.price.toLocaleString('ko-KR')}원
          </span>
          {view.originalPrice && (
            <span className="text-ink-faint text-[15px] tabular-nums line-through pb-0.5">
              {view.originalPrice.toLocaleString('ko-KR')}원
            </span>
          )}
        </div>

        {view.soldOut && (
          <p className="mt-2 inline-block text-[12px] font-bold tracking-[0.04em] text-paper bg-ink px-2.5 py-1">
            일시 품절
          </p>
        )}

        {/* 상품 정보 테이블 (적립금·브랜드·제조국·배송비) — 소비자가/판매가는 위 가격 표시로 대체 */}
        <ProductInfoTable
          consumerPrice={view.originalPrice ?? view.price}
          salePrice={view.price}
          brand={view.brand || undefined}
          showPrice={false}
          className="mt-4"
        />

        {/* 수량 선택 */}
        <div className="mt-5 flex items-center justify-between py-4 border-t border-b border-rule">
          <span className="text-[14px] font-bold text-ink">수량</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-control border border-rule flex items-center justify-center text-ink disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
              aria-label="수량 감소"
              disabled={quantity <= 1 || view.soldOut}
            >
              <IconMinus className="w-4 h-4" />
            </button>
            <span className="text-[16px] font-bold tabular-nums text-ink w-6 text-center" aria-live="polite">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
              className="w-9 h-9 rounded-control border border-rule flex items-center justify-center text-ink disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
              aria-label="수량 증가"
              disabled={quantity >= maxQty || view.soldOut}
            >
              <IconPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 배송 안내 */}
        <p className="text-[12px] text-ink-faint mt-3">{SHIPPING_NOTICE}</p>
      </div>

      {/* 리뷰 요약 (대표 → 리뷰 → 상세 순서). 클릭 시 별도 리뷰 페이지로 이동 */}
      <ReviewSummary summary={view.reviewSummary} productId={id} className="border-t border-rule" />

      {/* 상세 이미지 (DB 상품) */}
      {view.detailImages.length > 0 && (
        <div className="border-t border-rule">
          {view.detailImages.map((url, i) => (
            <img key={i} src={url} alt={`상세 이미지 ${i + 1}`} loading="lazy" className="w-full h-auto block" />
          ))}
        </div>
      )}

      {/* 상세 탭 (목데이터 안내용) */}
      {view.images.length === 0 && (
        <div className="border-t border-rule">
          <div className="flex border-b border-rule">
            {DETAIL_TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-3 text-[13px] font-bold relative focus:outline-none focus-visible:shadow-ring ${activeTab === i ? 'text-ink' : 'text-ink-faint'}`}
                aria-pressed={activeTab === i}
              >
                {tab}
                {activeTab === i && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ink" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
          <div className="px-4 py-5 text-[13px] text-ink-soft leading-relaxed">
            {activeTab === 0 && <p>{view.description ?? `${view.brand} ${view.name} 상품입니다.`}</p>}
            {activeTab === 1 && <p>전성분은 제품 포장을 참조해 주세요.</p>}
            {activeTab === 2 && (
              <div className="space-y-2">
                <p>• 배송: 주문 후 1~2 영업일 출고</p>
                <p>• {SHIPPING_NOTICE}</p>
                <p>• 반품: 수령 후 7일 이내 가능 (개봉 상품 반품 불가)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 하단 sticky 구매 바 (하단 네비 바로 위에 쌓임, 모든 화면 폭에서 동일) */}
      <div
        className="fixed left-0 right-0 z-40"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-[480px] mx-auto bg-paper border-t border-rule px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="shrink-0">
              <p className="text-[10px] text-ink-faint leading-none mb-0.5">수량 {quantity}</p>
              <p className="text-[15px] font-bold tabular-nums text-ink leading-none">{total.toLocaleString('ko-KR')}원</p>
            </div>
            <button
              onClick={onAddToCart}
              disabled={view.soldOut}
              className="shrink-0 rounded-control border border-rule text-ink font-bold text-[13px] px-4 py-3 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
              aria-label="장바구니 담기"
            >
              <IconCart className="w-5 h-5" />
            </button>
            <button
              onClick={onBuy}
              disabled={view.soldOut}
              className="flex-1 rounded-control bg-ink text-paper font-bold text-[14px] py-3 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
            >
              {view.soldOut ? '일시 품절' : '구매하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-control bg-ink text-paper text-[13px] px-4 py-2.5">
          {toast}
        </div>
      )}

      <BottomNav />
    </div>
    </div>
  )
}
