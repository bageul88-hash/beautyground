import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import DesktopMyReviews from '../components/reviews/DesktopMyReviews'
import { useViewMode } from '../lib/viewMode'
import { supabase } from '../lib/supabase'
import { getReviewableOrders, getMyReviews, submitReview, type ReviewableOrder, type MyReview } from '../lib/reviews'
import ImagePlaceholder from '../components/common/ImagePlaceholder'
import { IconChevronRight } from '../components/common/Icon'
import { Stars, StarPicker } from '../components/common/Stars'

// "리뷰 관리" — 마이페이지 메뉴만 있고 실제 기능이 없던 것을 구현(2026-09-03 대표님 지시).
// ① 배송완료 주문 중 아직 리뷰를 안 쓴 상품 = "리뷰 작성 가능" ② 내가 쓴 리뷰 목록.
// 리뷰 작성 시 1,000원 적립 — supabase/recently_viewed_and_reviews.sql의 submit_product_review() RPC가 처리.
export default function AppMyReviews() {
  const navigate = useNavigate()
  const { mode, isDesktop, toggle } = useViewMode()
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const [reviewable, setReviewable] = useState<ReviewableOrder[]>([])
  const [myReviews, setMyReviews] = useState<MyReview[]>([])

  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoggedIn(false); setLoading(false); return }
    const [r, m] = await Promise.all([getReviewableOrders(), getMyReviews()])
    setReviewable(r)
    setMyReviews(m)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    ;(async () => { await load(); if (!active) return })()
    return () => { active = false }
  }, [])

  const openForm = (orderId: string) => {
    setOpenOrderId(orderId)
    setRating(5)
    setText('')
    setError(null)
  }
  const cancelForm = () => { setOpenOrderId(null); setError(null) }

  const handleSubmit = async () => {
    if (!openOrderId) return
    if (text.trim().length < 5) { setError('리뷰 내용을 5자 이상 입력해 주세요'); return }
    setSubmitting(true)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const meta = session?.user?.user_metadata as { name?: string } | undefined
    const authorName = meta?.name || session?.user?.email?.split('@')[0] || '구매자'
    const { error: err } = await submitReview(openOrderId, rating, text.trim(), authorName)
    setSubmitting(false)
    if (err) { setError(err); return }
    setOpenOrderId(null)
    setToast('리뷰가 등록됐어요 (+1,000P 적립)')
    setTimeout(() => setToast(null), 2400)
    await load()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-quiet md:py-6">
        <ViewModeToggle mode={mode} onToggle={toggle} />
        {isDesktop ? (
          <div className="max-w-[1280px] mx-auto px-6 py-24 flex items-center justify-center text-ink-faint text-[14px]">불러오는 중...</div>
        ) : (
          <div className="max-w-[480px] mx-auto bg-paper min-h-screen flex items-center justify-center text-ink-faint text-[14px]">불러오는 중...</div>
        )}
      </div>
    )
  }

  const sharedProps = {
    loggedIn,
    reviewable,
    myReviews,
    openOrderId,
    rating,
    text,
    submitting,
    error,
    onOpenForm: openForm,
    onCancelForm: cancelForm,
    onRatingChange: setRating,
    onTextChange: setText,
    onSubmit: handleSubmit,
  }

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopMyReviews {...sharedProps} />
        {toast && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-10 z-50 rounded-control bg-ink text-paper text-[13px] px-4 py-2.5" role="status">
            {toast}
          </div>
        )}
      </>
    )
  }

  if (!loggedIn) {
    return (
      <AppFrame>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <BackHeader title="리뷰 관리" />
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <p className="text-[15px] text-ink-soft mb-6">로그인이 필요해요</p>
          <button
            onClick={() => navigate('/app/login', { state: { from: '/app/my-reviews' } })}
            className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
          >
            로그인하기
          </button>
        </div>
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <BackHeader title="리뷰 관리" />

      {reviewable.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-[13px] font-bold text-ink-faint tracking-wide mb-2">리뷰 작성 가능</p>
          <div className="border border-rule divide-y divide-rule">
            {reviewable.map((r) => (
              <div key={r.orderId} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0 overflow-hidden bg-quiet">
                    {r.product?.thumbnail_url ? (
                      <img src={r.product.thumbnail_url} alt={r.product.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  <p className="flex-1 text-[13px] text-ink line-clamp-2">{r.product?.name ?? '상품'}</p>
                  <button
                    onClick={() => (openOrderId === r.orderId ? cancelForm() : openForm(r.orderId))}
                    className="shrink-0 rounded-control border border-rule text-ink text-[12.5px] font-bold px-3 py-2 focus:outline-none focus-visible:shadow-ring"
                  >
                    리뷰 쓰기
                  </button>
                </div>
                {openOrderId === r.orderId && (
                  <div className="mt-3 pt-3 border-t border-rule">
                    <StarPicker value={rating} onChange={setRating} />
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="상품은 어떠셨나요? (5자 이상)"
                      rows={3}
                      className="mt-2 w-full rounded-control border border-rule px-3 py-2.5 text-[13px] text-ink focus:outline-none focus-visible:shadow-ring"
                    />
                    {error && <p className="mt-1.5 text-[12px] text-signal-red" role="alert">{error}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="rounded-control bg-ink text-paper font-bold text-[13px] px-4 py-2.5 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
                      >
                        {submitting ? '등록 중...' : '등록하기 (+1,000P)'}
                      </button>
                      <button onClick={cancelForm} className="text-[13px] text-ink-faint px-2 focus:outline-none focus-visible:shadow-ring">
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-6">
        <p className="text-[13px] font-bold text-ink-faint tracking-wide mb-2">내가 쓴 리뷰 ({myReviews.length})</p>
        {myReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] text-ink-soft">아직 작성한 리뷰가 없어요</p>
          </div>
        ) : (
          <div className="border border-rule divide-y divide-rule">
            {myReviews.map((rv) => (
              <button
                key={rv.id}
                onClick={() => rv.product && navigate(`/app/product/${rv.productId}`)}
                className="w-full text-left p-3 flex items-start gap-3 focus:outline-none focus-visible:shadow-ring"
              >
                <div className="w-14 h-14 shrink-0 overflow-hidden bg-quiet">
                  {rv.product?.thumbnail_url ? (
                    <img src={rv.product.thumbnail_url} alt={rv.product.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlaceholder />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] text-ink-soft line-clamp-1">{rv.product?.name ?? '삭제된 상품'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Stars rating={rv.rating} />
                    <span className="text-[11px] text-ink-faint tabular-nums">{new Date(rv.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <p className="text-[13px] text-ink mt-1 line-clamp-2">{rv.reviewText}</p>
                </div>
                <IconChevronRight className="w-4 h-4 text-ink-faint shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 rounded-control bg-ink text-paper text-[13px] px-4 py-2.5" role="status">
          {toast}
        </div>
      )}
    </AppFrame>
  )
}

