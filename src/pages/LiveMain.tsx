import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Live } from '../lib/types'
import AppHeader from '../components/layout/AppHeader'
import AppFrame from '../components/layout/AppFrame'
import PromoBar from '../components/home/PromoBar'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import { useViewMode } from '../lib/viewMode'
import { useSaleProducts } from '../hooks/useSaleProducts'
import { useShopBrands } from '../hooks/useShopBrands'
import { comma } from '../lib/format'

// /live — 라이브방송 메인페이지. 온라인몰 메인(/app/home)과 별개의 진입점이지만 상품 상세는
// 공유한다. 라이브에서 들어온 구매는 live_id로 태깅되어 정산·통계에서 구분된다(AppOrder.tsx).
// 2026-08-12 대표님 지시로 재구축 — 실데이터(Supabase) 그대로 연결, 별도 폴더 프로젝트 아님.
// ⚠️ 2026-08-12 전면 재작업: 목업(live-commerce-new) 디자인으로 완전 교체. 구 디자인 토큰
// (ink/ink-faint/paper/quiet/rule/accent-deep 등, "생방송 슬레이트"·"피그마 그린" 체계)은
// 이 페이지에서 전혀 쓰지 않는다 — 색은 tailwind.config.ts의 brand-pink/live-start/live-end/
// bg-overlay/bg-card/card-border(목업 designTokens.js와 1:1 동일)만 사용, 그 외는 black/white/
// #666666 리터럴로 목업과 동일하게 맞춘다.

function formatSchedTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = d.getHours()
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = hh < 12 ? '오전' : '오후'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  const timePart = `${ampm} ${h12}:${mm}`
  return sameDay ? `오늘 ${timePart}` : `${d.getMonth() + 1}/${d.getDate()} ${timePart}`
}

export default function LiveMain() {
  const [lives, setLives] = useState<Live[]>([])
  const [replays, setReplays] = useState<Live[]>([])
  const [hostNames, setHostNames] = useState<Record<string, string>>({})
  const [brandNames, setBrandNames] = useState<Record<string, string>>({})
  const [primaryProducts, setPrimaryProducts] = useState<Record<string, { name: string; price: number; sale_price: number | null; thumbnail_url: string | null; partner_id: string | null }>>({})
  const [loading, setLoading] = useState(true)
  const { mode, isDesktop, toggle } = useViewMode()
  const { products: saleProducts, loading: saleLoading } = useSaleProducts(6)
  const { brands, loading: brandsLoading } = useShopBrands()

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      const [{ data }, { data: endedData }] = await Promise.all([
        supabase.from('lives').select('*').in('status', ['live', 'scheduled'])
          .not('title', 'ilike', '호스트검증방송%').order('scheduled_at', { ascending: true, nullsFirst: false }),
        supabase.from('lives').select('*').eq('status', 'ended')
          .not('title', 'ilike', '호스트검증방송%').order('scheduled_at', { ascending: false, nullsFirst: false }).limit(12),
      ])
      if (!active) return
      const liveList = (data ?? []) as Live[]
      const replayList = ((endedData ?? []) as Live[]).filter((l) => l.stream_url || l.playback_url || l.stream_uid)
      setLives(liveList)
      setReplays(replayList)

      const all = [...liveList, ...replayList]
      const hostIds = Array.from(new Set(all.map((l) => l.host_id).filter((id): id is string => Boolean(id))))
      if (hostIds.length > 0) {
        const { data: hostsData } = await supabase.from('hosts').select('id, name').in('id', hostIds)
        if (active && hostsData) setHostNames(Object.fromEntries(hostsData.map((h) => [h.id, h.name])))
      }

      const primaryIdByLive: Record<string, string> = {}
      all.forEach((l) => {
        const pid = l.highlight_product_id || l.product_ids?.[0]
        if (pid) primaryIdByLive[l.id] = pid
      })
      const productIds = Array.from(new Set(Object.values(primaryIdByLive)))
      if (productIds.length > 0) {
        const { data: productsData } = await supabase.from('products')
          .select('id, name, price, sale_price, thumbnail_url, partner_id').in('id', productIds)
        if (active && productsData) {
          const byId = Object.fromEntries(productsData.map((p) => [p.id, p]))
          const map: typeof primaryProducts = {}
          Object.entries(primaryIdByLive).forEach(([liveId, pid]) => {
            const p = byId[pid]
            if (p) map[liveId] = p
          })
          setPrimaryProducts(map)

          // 진행자(host) 미지정 방송은 대표상품의 브랜드명을 핑크 라벨로 쓴다 (목업 스펙: 시간/브랜드/설명)
          const partnerIds = Array.from(new Set(productsData.map((p) => p.partner_id).filter((v): v is string => Boolean(v))))
          if (partnerIds.length > 0) {
            const { data: brandRows } = await supabase.from('partner_brands').select('id, brand_name').in('id', partnerIds)
            if (active && brandRows) setBrandNames(Object.fromEntries(brandRows.map((b) => [b.id, b.brand_name])))
          }
        }
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  const nowLive = lives.filter((l) => l.status === 'live')
  const scheduled = lives.filter((l) => l.status === 'scheduled')
  const carouselItems = [...nowLive, ...scheduled, ...replays].slice(0, 6)

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <PromoBar />
        <AppHeader />
        <p className="text-center text-[13px] text-[#666666] py-10">데스크톱 라이브 메인은 준비 중입니다.</p>
      </>
    )
  }

  return (
    <AppFrame>
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <PromoBar />
      <AppHeader />

      <main className="bg-white pb-2">
        <section className="pt-5 px-4">
          {loading ? (
            <p className="text-[13px] text-[#666666] py-8 text-center">불러오는 중…</p>
          ) : carouselItems.length === 0 ? (
            <p className="text-[13px] text-[#666666] py-8 text-center">진행 중이거나 지난 라이브가 없습니다.</p>
          ) : (
            <div className="flex gap-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
              {carouselItems.map((live) => {
                const product = primaryProducts[live.id]
                const brand = product?.partner_id ? brandNames[product.partner_id] : undefined
                const channel = (live.host_id ? hostNames[live.host_id] : undefined) || brand
                const isLive = live.status === 'live'
                const isScheduled = live.status === 'scheduled'
                return (
                  <Link
                    key={live.id}
                    to={`/app/live/${live.id}`}
                    className="relative w-[168px] h-[240px] rounded-2xl overflow-hidden shrink-0 bg-bg-card focus:outline-none focus-visible:shadow-ring"
                  >
                    {live.thumbnail_url ? (
                      <img src={live.thumbnail_url} alt={live.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-bg-card flex items-center justify-center">
                        <img src="/images/bg-logo-mark.png" alt="" className="w-10 h-10 object-contain opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      {isLive ? (
                        <span className="inline-flex items-center text-white text-[10px] font-bold px-2 py-1 rounded-full bg-gradient-to-r from-live-start to-live-end">LIVE</span>
                      ) : isScheduled ? (
                        <span className="inline-flex items-center rounded-full bg-bg-overlay/70 text-white text-[10px] font-bold px-2 py-1">예정</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-bg-overlay/70 text-white text-[10px] font-bold px-2 py-1">종료</span>
                      )}
                    </div>
                    <div className="absolute top-9 left-2.5 right-2.5 flex justify-center">
                      <span className="text-white text-[10px] font-semibold text-center leading-tight line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                        {live.title}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-bg-overlay/90 via-bg-overlay/40 to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3">
                      {channel && <p className="text-white text-[11px] font-medium truncate">{channel}</p>}
                      {product && <p className="text-white text-[13px] font-semibold truncate mt-0.5">{product.name}</p>}
                      {product && (
                        <p className="text-white text-sm font-bold mt-1">
                          {comma(product.sale_price ?? product.price)}원
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {!loading && scheduled.length > 0 && (
          <>
            <div className="mt-8 mx-4 border-t border-card-border" aria-hidden="true" />
            <section className="pt-8 px-4">
              <h2 className="text-base font-bold text-black mb-4">LIVE 예고</h2>
              <ul className="flex flex-col gap-6">
                {scheduled.map((live) => {
                  const product = primaryProducts[live.id]
                  const brand = product?.partner_id ? brandNames[product.partner_id] : ''
                  const channel = (live.host_id ? hostNames[live.host_id] : '') || brand
                  const thumb = product?.thumbnail_url ?? live.thumbnail_url
                  return (
                    <li key={live.id}>
                      <Link to={`/app/live/${live.id}`} className="flex items-center gap-3 focus:outline-none focus-visible:shadow-ring">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={channel || live.title}
                            className="w-16 h-16 rounded-lg object-cover bg-bg-card border border-card-border shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-bg-card border border-card-border shrink-0 flex items-center justify-center">
                            <img src="/images/bg-logo-mark.png" alt="" className="w-6 h-6 object-contain opacity-40" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[#666666]">{formatSchedTime(live.scheduled_at)}</p>
                          <p className="text-sm font-bold text-brand-pink mt-1 truncate">{channel || live.title}</p>
                          <p className="text-xs text-[#666666] mt-1 truncate">{live.title}</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}

        {!saleLoading && saleProducts.length > 0 && (
          <>
            <div className="mt-8 mx-4 border-t border-card-border" aria-hidden="true" />
            <section className="pt-8 px-4">
              <h2 className="text-base font-bold text-black mb-4">할인 특가</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {saleProducts.map((p) => (
                  <Link key={p.id} to={`/app/product/${p.id}`} className="text-left focus:outline-none focus-visible:shadow-ring">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-bg-card border border-card-border">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <img src="/images/bg-logo-mark.png" alt="" className="w-8 h-8 object-contain opacity-40" />
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] font-bold text-black line-clamp-2 mt-2 leading-tight">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-bold text-brand-pink">{comma(p.sale_price ?? p.price)}원</span>
                      {p.sale_price != null && p.sale_price < p.price && (
                        <span className="text-xs font-bold text-brand-pink">
                          {Math.round((1 - p.sale_price / p.price) * 100)}%
                        </span>
                      )}
                    </div>
                    {p.sale_price != null && p.sale_price < p.price && (
                      <p className="text-[11px] text-[#666666] line-through mt-0.5">{comma(p.price)}원</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {!brandsLoading && brands.length > 0 && (
          <>
            <div className="mt-8 mx-4 border-t border-card-border" aria-hidden="true" />
            <section className="pt-8">
              <h2 className="text-base font-bold text-black mb-4 px-4">브랜드</h2>
              <div className="flex gap-5 px-4 pb-1 overflow-x-auto scrollbar-hide">
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    to={`/app/brand/${b.id}`}
                    className="shrink-0 text-sm font-bold text-black whitespace-nowrap focus:outline-none focus-visible:shadow-ring"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </AppFrame>
  )
}
