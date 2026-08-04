import { useEffect, useMemo, useState } from 'react'
import { IconSearch, IconX } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import type { Product, ScrapedReview } from '../../lib/types'
import { won } from '../../lib/format'
import Button from '../../components/common/Button'

type Filter = Product['status'] | 'all'
type ProductRow = Product & { partners: { brand_name: string } | null }

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'on_sale', label: '판매중' },
  { value: 'sold_out', label: '품절' },
  { value: 'hidden', label: '숨김' },
]

// 강조는 원색 1개(signal-blue)만 — 판매중=파랑, 나머지(품절/숨김)는 회색 톤.
const STATUS_BADGE: Record<Product['status'], { label: string; className: string }> = {
  on_sale: { label: '판매중', className: 'bg-signal-blue/10 text-signal-blue' },
  sold_out: { label: '품절', className: 'bg-quiet text-ink-soft' },
  hidden: { label: '숨김', className: 'bg-quiet text-ink-faint' },
}

export default function AdminProducts() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [reviewTarget, setReviewTarget] = useState<ProductRow | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('products')
      .select('*, partners(brand_name)')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (err) { setError(`목록 조회 실패: ${err.message}`); setLoading(false); return }
    setProducts((data ?? []) as ProductRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleToggleHide = async (product: ProductRow) => {
    const next: Product['status'] = product.status === 'hidden' ? 'on_sale' : 'hidden'
    setBusyId(product.id)
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: next } : p)))
    const { error: err } = await supabase.from('products').update({ status: next }).eq('id', product.id)
    setBusyId(null)
    if (err) setError(`상태 변경 실패: ${err.message}`)
  }

  const handleDelete = async (product: ProductRow) => {
    if (!window.confirm(`"${product.name}" 상품을 삭제할까요? 되돌릴 수 없습니다.`)) return
    setBusyId(product.id)
    const { error: err } = await supabase.from('products').delete().eq('id', product.id)
    setBusyId(null)
    if (err) { setError(`삭제 실패: ${err.message}`); return }
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.partners?.brand_name ?? '').toLowerCase().includes(q)
      const matchFilter = filter === 'all' || p.status === filter
      return matchSearch && matchFilter
    })
  }, [products, search, filter])

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">전체 상품 관리</p>
      </header>

      <main className="max-w-[1300px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">전체 상품 관리</h1>
        <p className="text-[13px] text-ink-soft mb-5">모든 브랜드의 상품을 확인·숨김·삭제하고, 등록된 리뷰를 검수할 수 있습니다.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="상품명·브랜드명 검색"
              className="w-full pl-9 pr-4 py-2.5 border border-rule rounded-control text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2.5 rounded-pill text-[13px] border transition-colors ${
                  filter === value ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">{search || filter !== 'all' ? '조건에 맞는 상품이 없습니다' : '등록된 상품이 없습니다'}</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">브랜드</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상품명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">가격</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">재고</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">리뷰</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const badge = STATUS_BADGE[p.status]
                  const reviewCount = p.scraped_reviews?.length ?? 0
                  return (
                    <tr key={p.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{p.partners?.brand_name ?? '-'}</td>
                      <td className="px-4 py-3 text-ink max-w-[220px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{won(p.sale_price ?? p.price)}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{p.stock}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {reviewCount > 0 ? (
                          <button onClick={() => setReviewTarget(p)} className="text-signal-blue underline text-[12px]">{reviewCount}건 관리</button>
                        ) : (
                          <span className="text-ink-faint text-[12px]">0건</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="inkOutline" size="sm" label={p.status === 'hidden' ? '노출' : '숨김'}
                            disabled={busyId === p.id} onClick={() => void handleToggleHide(p)}
                          />
                          <Button variant="danger" size="sm" label="삭제" disabled={busyId === p.id} onClick={() => void handleDelete(p)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {reviewTarget && (
        <ReviewModal
          product={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onChanged={(reviews) => {
            setProducts((prev) => prev.map((p) => (p.id === reviewTarget.id ? { ...p, scraped_reviews: reviews } : p)))
            setReviewTarget((prev) => (prev ? { ...prev, scraped_reviews: reviews } : prev))
          }}
        />
      )}
    </>
  )
}

function ReviewModal({
  product, onClose, onChanged,
}: { product: ProductRow; onClose: () => void; onChanged: (reviews: ScrapedReview[]) => void }) {
  const [reviews, setReviews] = useState<ScrapedReview[]>(product.scraped_reviews ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const removeAt = async (idx: number) => {
    if (!window.confirm('이 리뷰를 삭제할까요?')) return
    setBusy(true)
    setError('')
    const next = reviews.filter((_, i) => i !== idx)
    const summary = product.review_summary
      ? {
          ...product.review_summary,
          count: next.length,
          avg: next.length ? Number((next.reduce((s, r) => s + (r.rating ?? 0), 0) / next.length).toFixed(1)) : null,
        }
      : product.review_summary
    const { error: err } = await supabase.from('products').update({ scraped_reviews: next, review_summary: summary }).eq('id', product.id)
    setBusy(false)
    if (err) { setError(`삭제 실패: ${err.message}`); return }
    setReviews(next)
    onChanged(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-paper rounded-md w-full max-w-[560px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
          <p className="text-[15px] font-bold text-ink">리뷰 관리 — {product.name}</p>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><IconX size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-[12px] rounded-md px-3 py-2">{error}</div>}
          {reviews.length === 0 ? (
            <p className="text-[13px] text-ink-faint text-center py-10">남은 리뷰가 없습니다.</p>
          ) : (
            reviews.map((r, i) => (
              <div key={i} className="border border-rule rounded-md p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[12px] text-ink-soft mb-1">
                      {r.rating != null && <span className="text-signal-blue font-semibold">★ {r.rating}</span>}
                      {r.author && <span>{r.author}</span>}
                      {r.date && <span className="text-ink-faint">{r.date}</span>}
                    </div>
                    <p className="text-[13px] text-ink whitespace-pre-wrap break-words">{r.text}</p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => void removeAt(i)}
                    className="shrink-0 text-signal-red text-[12px] underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
