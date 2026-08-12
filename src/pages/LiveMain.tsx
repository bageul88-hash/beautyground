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
import { formatTimeOnly, comma } from '../lib/format'

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
          <div className="flex gap-3 -mx-4 pl-4 overflow-x-auto scrollbar-hide">
            {/* 목업(live-commerce-new) LiveCard.jsx와 완전히 동일한 구조로 이식(2026-08-12):
                고정 168×240px, 배지 top-2.5 left-2.5, 상단 중앙 리본(방송 제목), 하단 3줄
                (호스트/대표상품명/가격), 그라디언트 h-28. 실데이터는 lives+hosts+products 그대로. */}
            {[...topRow, ...extraLiveNow].map((live) => {
              const channel = live.host_id ? hostNames[live.host_id] : undefined
              const product = primaryProducts[live.id]
              return (
                <Link key={live.id} to={`/app/live/${live.id}`} className="relative w-[168px] h-[240px] rounded-2xl overflow-hidden shrink-0 bg-bg-card block focus:outline-none focus-visible:shadow-ring">
                  {live.thumbnail_url ? (
                    <img src={live.thumbnail_url} alt={live.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-quiet flex items-center justify-center">
                      <img src="/images/bg-logo-mark.png" alt="" className="w-10 h-10 object-contain opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <LiveStatusBadge live={live} size="sm" variant="pill" />
                  </div>
                  <div className="absolute top-9 left-2.5 right-2.5 flex justify-center">
                    <span className="text-paper text-[10px] font-semibold text-center leading-tight line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                      {live.title}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-bg-overlay/90 via-bg-overlay/40 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3">
                    {channel && <p className="text-paper text-[11px] font-medium truncate">{channel}</p>}
                    {product && <p className="text-paper text-[13px] font-semibold truncate mt-0.5">{product.name}</p>}
                    {product && (
                      <p className="text-paper text-sm font-bold mt-1">
                        {(product.sale_price ?? product.price).toLocaleString('ko-KR')}원
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* 목업 ScheduleSection.jsx와 동일한 플랫 리스트(날짜 그룹·구분선 없음, gap-7)로 이식(2026-08-12). */}
        {!loading && mobileScheduled.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-4 mt-8">LIVE 예고</h2>
            <ul className="flex flex-col gap-7">
              {mobileScheduled.map((live) => {
                const channel = live.host_id ? hostNames[live.host_id] : undefined
                const product = primaryProducts[live.id]
                return (
                  <li key={live.id}>
                    <Link to={`/app/live/${live.id}`} className="flex items-center gap-3 focus:outline-none focus-visible:shadow-ring">
                      <img
                        src={live.thumbnail_url ?? product?.thumbnail_url ?? '/images/bg-logo-mark.png'}
                        alt={channel ?? live.title}
                        className="w-16 h-16 rounded-lg object-cover bg-quiet border border-card-border shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-ink-faint">
                          {formatTimeOnly(live.scheduled_at)}
                          {live.duration_minutes ? ` · 약 ${live.duration_minutes}분` : ''}
                        </p>
                        {channel && <p className="text-sm font-bold text-brand-pink mt-1">{channel}</p>}
                        <p className="text-xs text-ink-soft mt-1 truncate">{product?.name ?? live.title}</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
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
