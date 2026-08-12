import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Live } from '../lib/types'
import AppHeader from '../components/layout/AppHeader'
import AppFrame from '../components/layout/AppFrame'
import PromoBar from '../components/home/PromoBar'
import LiveStatusBadge from '../components/live/LiveStatusBadge'
import DesktopLiveList from '../components/live/DesktopLiveList'
import ProductPeek, { type PrimaryProduct } from '../components/live/ProductPeek'
import BrandRail from '../components/home/BrandRail'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import { useViewMode } from '../lib/viewMode'
import { useSaleProducts } from '../hooks/useSaleProducts'
import { useShopBrands } from '../hooks/useShopBrands'
import { formatDateTime, formatDateOnly, formatTimeOnly, dateKey, comma } from '../lib/format'

// /live — 목업(live-commerce-new)을 그대로 이식한 새 라이브 메인. 기존 /app/live(ShopLiveList)를
// 대체한다(2026-08-12, 대표님 지시: 계속 기존 페이지를 부분 수정하지 말고 새로 만들 것).
// 데이터 로직(히어로/다시보기 폴백/호스트명/대표상품)은 기존 페이지에서 그대로 가져왔다 — 실제
// Supabase 라이브 운영 로직이라 변경 없음. 화면 구조·색상만 목업 그대로.
export default function LiveMain() {
  const [lives, setLives] = useState<Live[]>([])
  const [replays, setReplays] = useState<Live[]>([])
  const [hostNames, setHostNames] = useState<Record<string, string>>({})
  const [primaryProducts, setPrimaryProducts] = useState<Record<string, PrimaryProduct>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const { mode, isDesktop, toggle } = useViewMode()
  const { products: saleProducts, loading: saleLoading } = useSaleProducts(6)
  const { brands, loading: brandsLoading } = useShopBrands()

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const [{ data }, { data: endedData }] = await Promise.all([
        supabase
          .from('lives')
          .select('*')
          .in('status', ['live', 'scheduled'])
          .not('title', 'ilike', '호스트검증방송%')
          .order('scheduled_at', { ascending: true, nullsFirst: false }),
        supabase
          .from('lives')
          .select('*')
          .eq('status', 'ended')
          .not('title', 'ilike', '호스트검증방송%')
          .order('scheduled_at', { ascending: false, nullsFirst: false })
          .limit(12),
      ])
      if (!active) return
      const liveList = (data ?? []) as Live[]
      setLives(liveList)
      setReplays(((endedData ?? []) as Live[]).filter((l) => l.stream_url || l.playback_url || l.stream_uid))

      const hostIds = Array.from(
        new Set(liveList.map((l) => l.host_id).filter((id): id is string => Boolean(id)))
      )
      if (hostIds.length > 0) {
        const { data: hostsData } = await supabase.from('hosts').select('id, name').in('id', hostIds)
        if (active && hostsData) {
          setHostNames(Object.fromEntries(hostsData.map((h) => [h.id, h.name])))
        }
      }

      const allLives = [...liveList, ...(((endedData ?? []) as Live[]).filter((l) => l.stream_url || l.playback_url || l.stream_uid))]
      const primaryIdByLive: Record<string, string> = {}
      allLives.forEach((l) => {
        const primaryId = l.highlight_product_id || l.product_ids?.[0]
        if (primaryId) primaryIdByLive[l.id] = primaryId
      })
      const productIds = Array.from(new Set(Object.values(primaryIdByLive)))
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, price, sale_price, thumbnail_url')
          .in('id', productIds)
        if (active && productsData) {
          const byId = Object.fromEntries(productsData.map((p) => [p.id, p]))
          const map: Record<string, PrimaryProduct> = {}
          Object.entries(primaryIdByLive).forEach(([liveId, productId]) => {
            const p = byId[productId]
            if (p) map[liveId] = { name: p.name, price: p.price, sale_price: p.sale_price, thumbnail_url: p.thumbnail_url }
          })
          setPrimaryProducts(map)
        }
      }

      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const realHero = lives.find((l) => l.status === 'live') ?? lives[0] ?? null
  const restLives = realHero ? lives.filter((l) => l.id !== realHero.id) : lives
  const otherLiveNowReal = restLives.filter((l) => l.status === 'live')
  const scheduledLives = restLives.filter((l) => l.status === 'scheduled')

  const usingReplayFallback = !realHero
  const sortedForFallback = usingReplayFallback
    ? [...replays].sort((a, b) => (b.peak_viewers ?? 0) - (a.peak_viewers ?? 0))
    : []
  const hero = realHero ?? sortedForFallback[0] ?? null
  const otherLiveNow = usingReplayFallback ? sortedForFallback.slice(1, 4) : otherLiveNowReal
  const usedReplayIds = new Set([hero?.id, ...otherLiveNow.map((l) => l.id)].filter(Boolean) as string[])
  const displayReplays = usingReplayFallback ? replays.filter((l) => !usedReplayIds.has(l.id)) : replays

  const secondCardCandidate = otherLiveNow[0] ?? scheduledLives[0] ?? displayReplays[0] ?? null
  const secondCard = secondCardCandidate && secondCardCandidate.id !== hero?.id ? secondCardCandidate : null
  const topRow = [hero, secondCard].filter((l): l is Live => Boolean(l))
  const extraLiveNow = otherLiveNow.filter((l) => l.id !== secondCard?.id)
  const mobileScheduled = scheduledLives.filter((l) => l.id !== secondCard?.id)
  const mobileReplays = displayReplays.filter((l) => l.id !== secondCard?.id)

  const scheduleGroups = (() => {
    const order: string[] = []
    const byDate = new Map<string, Live[]>()
    for (const live of mobileScheduled) {
      const key = dateKey(live.scheduled_at)
      if (!byDate.has(key)) { byDate.set(key, []); order.push(key) }
      byDate.get(key)!.push(live)
    }
    return order.map((key) => ({ key, label: formatDateOnly(byDate.get(key)![0].scheduled_at), items: byDate.get(key)! }))
  })()

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopLiveList
          loading={loading}
          hero={hero}
          otherLiveNow={otherLiveNow}
          scheduledLives={scheduledLives}
          replays={displayReplays}
          hostNames={hostNames}
          primaryProducts={primaryProducts}
        />
      </>
    )
  }

  return (
    <AppFrame>
      <ViewModeToggle mode={mode} onToggle={toggle} />
      <PromoBar />
      <AppHeader />

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 text-center text-[13px] text-ink-faint">불러오는 중…</div>
        ) : !hero ? (
          <div className="py-10 text-center text-[13px] text-ink-faint">진행 중이거나 예정된 라이브가 없습니다.</div>
        ) : (
          <div className="flex gap-2 -mx-4 pl-4 overflow-x-auto scrollbar-hide">
            {[...topRow, ...extraLiveNow].map((live) => (
              <Link key={live.id} to={`/app/live/${live.id}`} className="shrink-0 w-[48%] block focus:outline-none focus-visible:shadow-ring">
                <div className="relative rounded-2xl overflow-hidden bg-quiet aspect-[3/4]">
                  {live.thumbnail_url ? (
                    <img src={live.thumbnail_url} alt={live.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-quiet flex items-center justify-center">
                      <img src="/images/bg-logo-mark.png" alt="" className="w-10 h-10 object-contain opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-[4.3%] left-[5.7%] flex items-center gap-2">
                    <LiveStatusBadge live={live} size="sm" variant="pill" />
                    {live.status === 'scheduled' && (
                      <span className="inline-flex items-center rounded-full bg-bg-overlay/70 text-paper text-[10.5px] font-bold px-2 py-0.5 tabular-nums">
                        {formatDateTime(live.scheduled_at)}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    {primaryProducts[live.id] && (
                      <p className="text-paper text-[13px] font-extrabold" style={{ textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
                        {(primaryProducts[live.id].sale_price ?? primaryProducts[live.id].price).toLocaleString('ko-KR')}원
                      </p>
                    )}
                    <p className="text-paper text-[13px] font-bold leading-snug line-clamp-2 mt-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
                      {live.title}
                    </p>
                    {(() => {
                      const channel = live.host_id ? hostNames[live.host_id] : undefined
                      const hasViewers = typeof live.peak_viewers === 'number' && live.peak_viewers > 0
                      if (!channel && !hasViewers) return null
                      return (
                        <p className="flex items-center gap-1 text-[11px] text-paper/80 mt-1">
                          {channel && <span>{channel}</span>}
                          {channel && hasViewers && <span className="w-0.5 h-0.5 rounded-full bg-paper/80" />}
                          {hasViewers && <span className="tabular-nums">{live.peak_viewers!.toLocaleString('ko-KR')}</span>}
                        </p>
                      )
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && mobileScheduled.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-3 mt-8">LIVE 예고</h2>
            {scheduleGroups.map((group) => (
              <div key={group.key} className="mt-5 first:mt-0">
                <p className="text-[12.5px] font-bold text-ink-soft mb-2.5 pb-1.5 border-b border-rule">{group.label}</p>
                <div className="flex flex-col">
                  {group.items.map((live) => (
                    <Link
                      key={live.id}
                      to={`/app/live/${live.id}`}
                      className="flex items-center gap-3 py-4 border-b border-rule last:border-b-0 focus:outline-none focus-visible:shadow-ring"
                    >
                      <div className="relative w-[72px] h-[72px] shrink-0 rounded-lg bg-quiet overflow-hidden">
                        {live.thumbnail_url ? (
                          <img src={live.thumbnail_url} alt={live.title} className="w-full h-full object-cover" />
                        ) : (
                          <img src="/images/bg-logo-mark.png" alt="" className="w-8 h-8 object-contain opacity-50 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-ink tabular-nums">
                          {formatTimeOnly(live.scheduled_at)}
                          {live.duration_minutes ? ` · 약 ${live.duration_minutes}분` : ''}
                        </p>
                        {live.host_id && hostNames[live.host_id] && (
                          <p className="text-[13px] font-bold text-brand-pink mt-1">{hostNames[live.host_id]}</p>
                        )}
                        <p className="text-[12px] text-ink-soft line-clamp-1 mt-1">{live.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {!saleLoading && saleProducts.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-3.5 mt-8">할인 특가</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {saleProducts.map((p) => (
                <Link key={p.id} to={`/app/product/${p.id}`} className="text-left focus:outline-none focus-visible:shadow-ring">
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-quiet border border-card-border">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src="/images/bg-logo-mark.png" alt="" className="w-8 h-8 object-contain opacity-50" />
                      </div>
                    )}
                  </div>
                  <p className="text-[13px] font-bold text-ink mt-2 line-clamp-2">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-brand-pink">{comma(p.sale_price)}원</span>
                    <span className="text-xs font-bold text-brand-pink">
                      {Math.round((1 - (p.sale_price ?? p.price) / p.price) * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-faint line-through mt-0.5">{comma(p.price)}원</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <BrandRail brands={brands} loading={brandsLoading} />

        {!loading && mobileReplays.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-3.5 mt-8">지난 라이브</h2>
            <div className="grid grid-cols-2 gap-3">
              {mobileReplays.map((live) => (
                <Link
                  key={live.id}
                  to={`/app/live/${live.id}`}
                  className="relative block rounded-2xl overflow-hidden aspect-square focus:outline-none focus-visible:shadow-ring"
                >
                  {live.thumbnail_url ? (
                    <img src={live.thumbnail_url} alt={live.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-quiet flex items-center justify-center">
                      <img src="/images/bg-logo-mark.png" alt="" className="w-9 h-9 object-contain opacity-50" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-bg-overlay/70 text-paper text-[10px] font-bold px-2 py-0.5 tracking-[0.04em]">
                    REPLAY
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    {primaryProducts[live.id] && <ProductPeek product={primaryProducts[live.id]} variant="onImage" />}
                    <p className="text-paper text-[12px] font-bold leading-snug line-clamp-2 mt-1.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
                      {live.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </AppFrame>
  )
}
