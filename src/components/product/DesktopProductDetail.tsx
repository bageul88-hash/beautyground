import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImagePlaceholder from '../common/ImagePlaceholder'
import ReviewSummary from './ReviewSummary'
import CategoryTabBar from './CategoryTabBar'
import { IconHeart, IconCart, IconMinus, IconPlus } from '../common/Icon'
import { SHIPPING_NOTICE } from '../../constants'
import type { ReviewSummaryData, ScrapedReview } from '../../lib/types'

const DETAIL_TABS = ['상품정보', '성분', '배송/반품']

interface View {
  name: string
  brand: string
  category: string | null
  reviewSummary: ReviewSummaryData | null
  price: number
  originalPrice: number | null
  images: string[]
  detailImages: string[]
  description: string | null
  soldOut: boolean
  reviews: ScrapedReview[]
}

interface Props {
  id?: string
  view: View
  discountRate: number
  quantity: number
  setQuantity: (n: number) => void
  maxQty: number
  total: number
  wished: boolean
  toggleWish: () => void
  onBuy: () => void
  onAddToCart: () => void
}

// PC 상품상세 — 기존 「생방송 슬레이트」 규칙 유지(흰 배경, 직각, 그림자 없음, tabular 숫자).
// 상단 카테고리 탭바는 전체 폭으로 유지, 그 아래를 [이미지+정보] : [구매패널] 2단으로 나누고
// 구매패널만 스크롤해도 고정. 설명/리뷰는 콘텐츠 폭 전체로 이어서 스크롤.
export default function DesktopProductDetail({
  id,
  view,
  discountRate,
  quantity,
  setQuantity,
  maxQty,
  total,
  wished,
  toggleWish,
  onBuy,
  onAddToCart,
}: Props) {
  const navigate = useNavigate()
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="bg-quiet min-h-screen">
      <div className="bg-paper border-b border-rule sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-[13px] font-bold text-ink-soft hover:text-ink">← 뒤로</button>
          <div className="flex items-center gap-4 text-ink">
            <button onClick={toggleWish} aria-label={wished ? '찜 해제' : '찜하기'} className="focus:outline-none focus-visible:shadow-ring">
              <IconHeart filled={wished} className="w-[20px] h-[20px]" />
            </button>
            <button onClick={() => navigate('/app/cart')} aria-label="장바구니" className="focus:outline-none focus-visible:shadow-ring">
              <IconCart className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>
      </div>

      <CategoryTabBar active={view.category} stickyTop="top-16" />

      <div className="max-w-[1280px] mx-auto px-6 py-10 grid grid-cols-[1.4fr_1fr] gap-12 items-start">
        {/* 콘텐츠 영역 */}
        <div className="min-w-0 bg-paper border border-rule">
          {view.images.length > 0 ? (
            <div className="p-6">
              <div className="aspect-square bg-quiet overflow-hidden">
                <img
                  src={view.images[Math.min(activeImg, view.images.length - 1)]}
                  alt={view.name}
                  className="w-full h-full object-contain"
                />
              </div>
              {view.images.length > 1 && (
                <div className="flex gap-2 mt-3">
                  {view.images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 overflow-hidden border-2 focus:outline-none focus-visible:shadow-ring ${i === activeImg ? 'border-ink' : 'border-rule'}`}
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

          <ReviewSummary summary={view.reviewSummary} productId={id} className="border-t border-rule" />

          {view.detailImages.length > 0 && (
            <div className="border-t border-rule">
              {view.detailImages.map((url, i) => (
                <img key={i} src={url} alt={`상세 이미지 ${i + 1}`} loading="lazy" className="w-full h-auto block" />
              ))}
            </div>
          )}

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
                    {activeTab === i && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-ink" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              <div className="px-6 py-6 text-[13px] text-ink-soft leading-relaxed">
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
        </div>

        {/* 구매 패널 — 스크롤해도 고정 */}
        <div className="sticky top-24 bg-paper border border-rule p-6">
          {view.brand && <p className="text-[13px] text-ink-soft">{view.brand}</p>}
          <h1 className="mt-1 text-[20px] font-bold text-ink leading-snug">{view.name}</h1>

          <div className="flex items-end gap-2 mt-4">
            {discountRate > 0 && <span className="text-[20px] font-bold tabular-nums text-ink">{discountRate}%</span>}
            <span className="text-[24px] font-bold tabular-nums text-ink">{view.price.toLocaleString('ko-KR')}원</span>
            {view.originalPrice && (
              <span className="text-ink-faint text-[14px] tabular-nums line-through pb-0.5">
                {view.originalPrice.toLocaleString('ko-KR')}원
              </span>
            )}
          </div>

          {view.soldOut && (
            <p className="mt-3 inline-block text-[12px] font-bold tracking-[0.04em] text-paper bg-ink px-2.5 py-1">일시 품절</p>
          )}

          <p className="mt-4 text-[12px] text-ink-faint">{SHIPPING_NOTICE}</p>

          <div className="mt-6 flex items-center justify-between py-4 border-t border-b border-rule">
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
              <span className="text-[16px] font-bold tabular-nums text-ink w-6 text-center" aria-live="polite">{quantity}</span>
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

          <div className="flex items-center justify-between mt-5">
            <span className="text-[13px] text-ink-soft">총 결제금액</span>
            <span className="text-[20px] font-bold tabular-nums text-ink">{total.toLocaleString('ko-KR')}원</span>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={onAddToCart}
              disabled={view.soldOut}
              className="flex-1 rounded-control border border-rule text-ink font-bold text-[14px] py-3.5 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
            >
              장바구니
            </button>
            <button
              onClick={onBuy}
              disabled={view.soldOut}
              className="flex-1 rounded-control bg-ink text-paper font-bold text-[14px] py-3.5 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
            >
              {view.soldOut ? '일시 품절' : '구매하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
