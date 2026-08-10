import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppFrame from '../components/layout/AppFrame'
import BackHeader from '../components/layout/BackHeader'
import ImagePlaceholder from '../components/common/ImagePlaceholder'
import { IconSearch, IconClose } from '../components/common/Icon'
import { supabase } from '../lib/supabase'
import { won } from '../lib/format'

interface SearchResult {
  id: string
  name: string
  price: number
  sale_price: number | null
  thumbnail_url: string | null
  brand_name: string | null
}

interface ProductRow {
  id: string
  name: string
  price: number
  sale_price: number | null
  thumbnail_url: string | null
  partner_id: string | null
}

// 상품명·브랜드명 기준 간단 키워드 검색(매장 직원 피드백 2026-08-10: "검색창이 있으면 좋겠다").
// 자동완성·인기검색어는 없음 — 입력 후 엔터/버튼으로 실행하는 기본형.
export default function AppSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [q, setQ] = useState(initialQ)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = async (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)

    // 브랜드명이 검색어와 일치하는 파트너부터 찾고, 상품명 매칭과 합쳐서 중복 제거.
    const { data: matchedBrands } = await supabase
      .from('partner_brands')
      .select('id')
      .ilike('brand_name', `%${trimmed}%`)
    const brandIds = (matchedBrands ?? []).map((b) => b.id as string)

    const nameQuery = supabase
      .from('products')
      .select('id,name,price,sale_price,thumbnail_url,partner_id')
      .eq('status', 'on_sale')
      .ilike('name', `%${trimmed}%`)
      .limit(40)

    const queries = [nameQuery]
    if (brandIds.length > 0) {
      queries.push(
        supabase
          .from('products')
          .select('id,name,price,sale_price,thumbnail_url,partner_id')
          .eq('status', 'on_sale')
          .in('partner_id', brandIds)
          .limit(40)
      )
    }

    const responses = await Promise.all(queries)
    const rows = new Map<string, ProductRow>()
    for (const r of responses) {
      for (const row of (r.data ?? []) as ProductRow[]) rows.set(row.id, row)
    }

    const partnerIds = [...new Set([...rows.values()].map((r) => r.partner_id).filter((v): v is string => !!v))]
    const brandMap = new Map<string, string>()
    if (partnerIds.length > 0) {
      const { data: brands } = await supabase.from('partner_brands').select('id,brand_name').in('id', partnerIds)
      for (const b of (brands ?? []) as { id: string; brand_name: string }[]) brandMap.set(b.id, b.brand_name)
    }

    setResults(
      [...rows.values()].map((r) => ({
        id: r.id,
        name: r.name,
        price: r.price,
        sale_price: r.sale_price,
        thumbnail_url: r.thumbnail_url,
        brand_name: r.partner_id ? brandMap.get(r.partner_id) ?? null : null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    if (initialQ) void runSearch(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/app/search?q=${encodeURIComponent(q)}`, { replace: true })
    void runSearch(q)
  }

  return (
    <AppFrame>
      <BackHeader
        title="검색"
        rightElement={
          <button onClick={() => navigate(-1)} aria-label="닫기" className="text-ink focus:outline-none focus-visible:shadow-ring">
            <IconClose className="w-5 h-5" />
          </button>
        }
      />

      <form onSubmit={onSubmit} className="flex items-center gap-2 px-4 py-3 border-b border-rule">
        <div className="flex-1 flex items-center gap-2 bg-quiet rounded-control px-3.5 h-11">
          <IconSearch className="w-[16px] h-[16px] text-ink-faint shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품명·브랜드명 검색"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-faint min-w-0"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="지우기" className="text-ink-faint shrink-0">
              <IconClose className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-control bg-ink text-paper text-[13px] font-bold px-4 h-11 focus:outline-none focus-visible:shadow-ring"
        >
          검색
        </button>
      </form>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square bg-quiet animate-pulse" />
              <div className="h-3 bg-quiet animate-pulse mt-2.5 w-3/4" />
            </div>
          ))}
        </div>
      ) : !searched ? (
        <p className="py-16 text-center text-[13px] text-ink-faint">찾으시는 상품명이나 브랜드명을 입력해 보세요</p>
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-ink-faint">'{initialQ || q}'에 대한 검색 결과가 없어요</p>
      ) : (
        <>
          <p className="px-4 pt-4 text-[13px] text-ink-soft">검색결과 {results.length}개</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 py-3">
            {results.map((p) => {
              const hasSale = p.sale_price != null && p.sale_price < p.price
              const rate = hasSale ? Math.round((1 - p.sale_price! / p.price) * 100) : 0
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/app/product/${p.id}`)}
                  className="text-left focus:outline-none focus-visible:shadow-ring"
                >
                  <div className="aspect-square bg-quiet overflow-hidden">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  {p.brand_name && <p className="mt-2 text-[12px] text-ink-soft">{p.brand_name}</p>}
                  <p className="mt-0.5 text-[13px] text-ink line-clamp-2 leading-snug min-h-[2.4em]">{p.name}</p>
                  <p className="mt-1 text-[13px] font-bold tabular-nums text-ink">
                    {hasSale && <span className="text-signal-red mr-1">{rate}%</span>}
                    {won(p.sale_price ?? p.price)}
                  </p>
                </button>
              )
            })}
          </div>
        </>
      )}
    </AppFrame>
  )
}
