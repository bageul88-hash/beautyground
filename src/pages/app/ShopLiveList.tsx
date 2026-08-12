import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Live } from '../../lib/types'
import AppHeader from '../../components/layout/AppHeader'
import AppFrame from '../../components/layout/AppFrame'
import PromoBar from '../../components/home/PromoBar'
import LiveStatusBadge from '../../components/live/LiveStatusBadge'
import DesktopLiveList from '../../components/live/DesktopLiveList'
import ProductPeek, { type PrimaryProduct } from '../../components/live/ProductPeek'
import BrandRail from '../../components/home/BrandRail'
import ViewModeToggle from '../../components/layout/ViewModeToggle'
import { useViewMode } from '../../lib/viewMode'
import { useSaleProducts } from '../../hooks/useSaleProducts'
import { useShopBrands } from '../../hooks/useShopBrands'
import { formatDateTime, formatDateOnly, formatTimeOnly, dateKey, comma } from '../../lib/format'

export default function ShopLiveList() {
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
          // 호스트 방송 설정 검증용 테스트 방송("호스트검증방송_숫자")은 고객 화면에 노출하지 않음
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
      // 다시보기: 볼 영상이 있는 종료 방송만
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

      // 목록 카드에 "뭘 파는지" 미리 보여주기 위한 대표 상품(찜한 상품 지정 우선, 없으면 첫 상품).
      // 클릭 전에는 상품 정보가 하나도 안 보여 구매 동기가 안 생기던 문제 대응(2026-08-06).
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

  // 히어로: 진행중 라이브 우선, 없으면 가장 임박한 예정 라이브(scheduled_at asc 정렬의 첫 항목)
  const realHero = lives.find((l) => l.status === 'live') ?? lives[0] ?? null
  const restLives = realHero ? lives.filter((l) => l.id !== realHero.id) : lives
  // PC 전용 — "지금 라이브" 그리드(다른 진행중 방송)와 "예정된 방송"을 분리해서 보여준다.
  const otherLiveNowReal = restLives.filter((l) => l.status === 'live')
  const scheduledLives = restLives.filter((l) => l.status === 'scheduled')

  // 진행중/예정 라이브가 하나도 없을 때 — 화면을 비워두지 않고 기존 다시보기 자료로 채운다
  // (대표님 지시 2026-08-06: 오픈 전에도 "이미 운영 중인 느낌"이 나야 함). LiveStatusBadge가
  // ended 상태를 "종료"로 정직하게 표시하므로 라이브인 척 속이는 게 아니라 "인기 다시보기"
  // 느낌으로 자연스럽게 채워짐. 조회수(peak_viewers) 높은 순으로 히어로·그리드에 우선 배정.
  const usingReplayFallback = !realHero
  const sortedForFallback = usingReplayFallback
    ? [...replays].sort((a, b) => (b.peak_viewers ?? 0) - (a.peak_viewers ?? 0))
    : []
  const hero = realHero ?? sortedForFallback[0] ?? null
  const otherLiveNow = usingReplayFallback ? sortedForFallback.slice(1, 4) : otherLiveNowReal
  const usedReplayIds = new Set([hero?.id, ...otherLiveNow.map((l) => l.id)].filter(Boolean) as string[])
  const displayReplays = usingReplayFallback ? replays.filter((l) => !usedReplayIds.has(l.id)) : replays

  // 모바일 상단 2카드 — 히어로 + 바로 다음 1개(다른 라이브 중 → 없으면 예정 → 없으면 다시보기 순으로 채움).
  // 나머지 다른 라이브 중 항목은 아래 세로 목록으로, 예정/다시보기 목록에선 여기 쓴 항목을 제외한다.
  const secondCardCandidate = otherLiveNow[0] ?? scheduledLives[0] ?? displayReplays[0] ?? null
  const secondCard = secondCardCandidate && secondCardCandidate.id !== hero?.id ? secondCardCandidate : null
  const topRow = [hero, secondCard].filter((l): l is Live => Boolean(l))
  const extraLiveNow = otherLiveNow.filter((l) => l.id !== secondCard?.id)
  const mobileScheduled = scheduledLives.filter((l) => l.id !== secondCard?.id)
  const mobileReplays = displayReplays.filter((l) => l.id !== secondCard?.id)

  // LIVE 예고 — 날짜별로 묶어서 보여준다(데스크톱 DesktopLiveList와 동일한 규칙).
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

      {/* 상단 바로가기(홈·카테고리·장바구니·마이) — 2026-08-10에 추가했었으나 하단 BottomNav와
          완전히 중복(둘 다 "홈"이 보임)이라 2026-08-11 제거. 카테고리 아이콘도 하단 BottomNav
          "카테고리"와 같은 목적지(/app/category)라 같이 제거.
          2026-08-12: 라이브 콘텐츠 탭(전체/기획전/팔로잉)도 목업(live-commerce-new) 대비 중복
          UI라 대표님 지시로 제거 — 라이브 메인이 목업 배치를 그대로 따른다. */}

      <main className="px-4 py-5">
        {loading ? (
          <div className="py-20 text-center text-[13px] text-ink-faint">
            불러오는 중…
          </div>
        ) : !hero ? (
          <div className="py-10 text-center text-[13px] text-ink-faint">
            진행 중이거나 예정된 라이브가 없습니다.
          </div>
        ) : (
          /* 지금 라이브 — 피그마 Codia 변환 실측(node 3328:3, 2026-08-10): 카드폭 52.6%,
             카드간격 1.5% → 다음 카드가 프레임 끝에서 그대로 잘리는 가로 스크롤 캐러셀.
             사진 비율 170:256(정사각 아님, 세로로 긴 비율). 상품정보 패널은 사진 아래
             별도 영역이 아니라 사진 바닥에 겹치는 밝은 오버레이(사진 높이의 19%).
             둥근 모서리·LIVE 그라디언트 알약 배지 — DESIGN.md 각진/무채색 규칙 대신
             대표님 지시로 시안 룩을 그대로 입힘. */
          <div className="flex gap-2 -mx-4 pl-4 overflow-x-auto scrollbar-hide">
            {[...topRow, ...extraLiveNow].map((live) => (
              <Link key={live.id} to={`/app/live/${live.id}`} className="shrink-0 w-[48%] block focus:outline-none focus-visible:shadow-ring">
                {/* 목업(live-commerce-new) LiveCard 톤 통일(2026-08-11): 어두운 그라디언트 위에 흰 텍스트 오버레이 —
                    상품정보 패널을 별도 밝은 박스로 분리하지 않고, 배지·제목·채널·조회수·상품가격까지 전부
                    카드 안에서 끝나도록(기존엔 제목/채널이 카드 밖 별도 텍스트 블록이었음). */}
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

        {/* LIVE 예고 — 예정된 방송이 실제로 있을 때만(가짜 일정을 만들어 채우지 않음) */}
        {!loading && mobileScheduled.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-3" style={{ marginTop: 'var(--live-gap-upcoming, 32px)' }}>LIVE 예고</h2>
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

        {/* 할인 특가 — 목업(live-commerce-new) 홈 배치 이식(2026-08-12): 라이브 예고 다음,
            지난 라이브 앞. 2열 그리드 + 핑크 가격·할인율(목업 BestSellerGrid와 동일). */}
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

        {/* 브랜드 — 목업 홈 배치 이식(2026-08-12), 할인 특가 바로 아래. /app/home과 동일 컴포넌트. */}
        <BrandRail brands={brands} loading={brandsLoading} />

        {/* 지난 라이브(다시보기) — 종료된 방송 중 영상이 있는 것(위에서 이미 쓴 항목은 제외) */}
        {!loading && mobileReplays.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-3.5" style={{ marginTop: 'var(--live-gap-past, 32px)' }}>지난 라이브</h2>
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
