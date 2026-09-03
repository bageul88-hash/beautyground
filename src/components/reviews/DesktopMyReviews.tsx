import { useNavigate } from 'react-router-dom'
import ImagePlaceholder from '../common/ImagePlaceholder'
import DesktopHeader from '../layout/DesktopHeader'
import { Stars, StarPicker } from '../common/Stars'
import type { ReviewableOrder, MyReview } from '../../lib/reviews'

interface Props {
  loggedIn: boolean
  reviewable: ReviewableOrder[]
  myReviews: MyReview[]
  openOrderId: string | null
  rating: number
  text: string
  submitting: boolean
  error: string | null
  onOpenForm: (orderId: string) => void
  onCancelForm: () => void
  onRatingChange: (n: number) => void
  onTextChange: (s: string) => void
  onSubmit: () => void
}

// PC 버전 — 찜 목록과 동일한 폭(1200px), 리뷰 작성 가능 목록 + 내가 쓴 리뷰를 세로로 이어서.
export default function DesktopMyReviews({
  loggedIn,
  reviewable,
  myReviews,
  openOrderId,
  rating,
  text,
  submitting,
  error,
  onOpenForm,
  onCancelForm,
  onRatingChange,
  onTextChange,
  onSubmit,
}: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-paper min-h-screen">
      <DesktopHeader />

      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <h1 className="text-[22px] font-bold text-ink mb-8">리뷰 관리</h1>

        {!loggedIn ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[15px] text-ink-soft mb-6">로그인이 필요해요</p>
            <button
              onClick={() => navigate('/app/login', { state: { from: '/app/my-reviews' } })}
              className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
            >
              로그인하기
            </button>
          </div>
        ) : (
          <>
            {reviewable.length > 0 && (
              <div className="mb-8">
                <p className="text-[13px] font-bold text-ink-faint tracking-wide mb-2">리뷰 작성 가능</p>
                <div className="border border-rule divide-y divide-rule">
                  {reviewable.map((r) => (
                    <div key={r.orderId} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 shrink-0 overflow-hidden bg-quiet">
                          {r.product?.thumbnail_url ? (
                            <img src={r.product.thumbnail_url} alt={r.product.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <ImagePlaceholder />
                          )}
                        </div>
                        <p className="flex-1 text-[14px] text-ink line-clamp-2">{r.product?.name ?? '상품'}</p>
                        <button
                          onClick={() => (openOrderId === r.orderId ? onCancelForm() : onOpenForm(r.orderId))}
                          className="shrink-0 rounded-control border border-rule text-ink text-[13px] font-bold px-4 py-2.5 focus:outline-none focus-visible:shadow-ring"
                        >
                          리뷰 쓰기
                        </button>
                      </div>
                      {openOrderId === r.orderId && (
                        <div className="mt-4 pt-4 border-t border-rule">
                          <StarPicker value={rating} onChange={onRatingChange} />
                          <textarea
                            value={text}
                            onChange={(e) => onTextChange(e.target.value)}
                            placeholder="상품은 어떠셨나요? (5자 이상)"
                            rows={3}
                            className="mt-2 w-full rounded-control border border-rule px-3.5 py-3 text-[14px] text-ink focus:outline-none focus-visible:shadow-ring"
                          />
                          {error && <p className="mt-1.5 text-[12.5px] text-signal-red" role="alert">{error}</p>}
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={onSubmit}
                              disabled={submitting}
                              className="rounded-control bg-ink text-paper font-bold text-[13.5px] px-5 py-2.5 disabled:opacity-40 focus:outline-none focus-visible:shadow-ring"
                            >
                              {submitting ? '등록 중...' : '등록하기 (+1,000P)'}
                            </button>
                            <button onClick={onCancelForm} className="text-[13.5px] text-ink-faint px-2 focus:outline-none focus-visible:shadow-ring">
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

            <div>
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
                      className="w-full text-left p-4 flex items-start gap-4 focus:outline-none focus-visible:shadow-ring"
                    >
                      <div className="w-16 h-16 shrink-0 overflow-hidden bg-quiet">
                        {rv.product?.thumbnail_url ? (
                          <img src={rv.product.thumbnail_url} alt={rv.product.name} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <ImagePlaceholder />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-soft line-clamp-1">{rv.product?.name ?? '삭제된 상품'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Stars rating={rv.rating} />
                          <span className="text-[12px] text-ink-faint tabular-nums">{new Date(rv.createdAt).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p className="text-[14px] text-ink mt-1.5">{rv.reviewText}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
