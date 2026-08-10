import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Live } from '../../lib/types'
import AppHeader from '../../components/layout/AppHeader'
import AppFrame from '../../components/layout/AppFrame'
import LiveStatusBadge from '../../components/live/LiveStatusBadge'
import DesktopLiveList from '../../components/live/DesktopLiveList'
import ProductPeek, { type PrimaryProduct } from '../../components/live/ProductPeek'
import { IconGrid, IconHome, IconCart, IconUser } from '../../components/common/Icon'
import ViewModeToggle from '../../components/layout/ViewModeToggle'
import { useViewMode } from '../../lib/viewMode'
import { formatDateTime, formatDateOnly, formatTimeOnly, dateKey } from '../../lib/format'

export default function ShopLiveList() {
  const [lives, setLives] = useState<Live[]>([])
  const [replays, setReplays] = useState<Live[]>([])
  const [hostNames, setHostNames] = useState<Record<string, string>>({})
  const [primaryProducts, setPrimaryProducts] = useState<Record<string, PrimaryProduct>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const { mode, isDesktop, toggle } = useViewMode()

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
      <AppHeader />

      {/* 상단 바로가기(홈·카테고리·장바구니·마이) — 대표님 지시(2026-08-10): 라이브 화면에서도
          몰 핵심 동선을 상단에서 바로 오갈 수 있게. 하단 BottomNav(AppFrame 공통)는 그대로 유지. */}
      <div className="sticky top-14 z-40 flex items-center justify-around border-b border-rule bg-paper py-2.5">
        <Link to="/app/home" aria-label="홈" className="flex flex-col items-center gap-1 text-ink focus:outline-none focus-visible:shadow-ring">
          <IconHome className="w-[19px] h-[19px]" />
          <span className="text-[10px] font-medium">홈</span>
        </Link>
        <Link to="/app/category" aria-label="카테고리" className="flex flex-col items-center gap-1 text-ink focus:outline-none focus-visible:shadow-ring">
          <IconGrid className="w-[19px] h-[19px]" />
          <span className="text-[10px] font-medium">카테고리</span>
        </Link>
        <Link to="/app/cart" aria-label="장바구니" className="flex flex-col items-center gap-1 text-ink focus:outline-none focus-visible:shadow-ring">
          <IconCart className="w-[19px] h-[19px]" />
          <span className="text-[10px] font-medium">장바구니</span>
        </Link>
        <Link to="/app/mypage" aria-label="마이" className="flex flex-col items-center gap-1 text-ink focus:outline-none focus-visible:shadow-ring">
          <IconUser className="w-[19px] h-[19px]" />
          <span className="text-[10px] font-medium">마이</span>
        </Link>
      </div>

      <nav className="sticky top-[6.5rem] z-40 -mx-0 px-4 bg-paper border-b border-rule flex items-center gap-5 overflow-x-auto scrollbar-hide">
        <Link to="/app/category" aria-label="카테고리" className="shrink-0 py-3 text-ink">
          <IconGrid className="w-5 h-5" />
        </Link>
        <span className="shrink-0 py-3 text-[14.5px] font-bold text-ink border-b-2 border-ink -mb-px">홈</span>
        <span className="shrink-0 py-3 text-[14.5px] font-medium text-ink-faint">기획전</span>
        <span className="shrink-0 py-3 text-[14.5px] font-medium text-ink-faint">팔로잉</span>
      </nav>

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
          <div className="flex gap-[1.5%] -mx-4 pl-4 overflow-x-auto scrollbar-hide">
            {[...topRow, ...extraLiveNow].map((live) => (
              <Link key={live.id} to={`/app/live/${live.id}`} className="shrink-0 w-[56.5%] block focus:outline-none focus-visible:shadow-ring">
                <div className="relative rounded-[14px] overflow-hidden bg-quiet aspect-[170/256]">
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
                      <span className="inline-flex items-center rounded-full bg-black/50 text-paper text-[10.5px] font-bold px-2 py-0.5 tabular-nums">
                        {formatDateTime(live.scheduled_at)}
                      </span>
                    )}
                  </div>
                  {primaryProducts[live.id] && (
                    <div className="absolute left-[1.5%] right-[1.5%] bottom-0 h-[19%] flex items-center gap-2 px-2 bg-[#f0f0f1]/95">
                      {primaryProducts[live.id].thumbnail_url && (
                        <img src={primaryProducts[live.id].thumbnail_url!} alt="" className="w-7 h-7 rounded-[7px] object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10.5px] text-ink-soft truncate">{primaryProducts[live.id].name}</p>
                        <p className="text-[12px] font-extrabold text-ink">{(primaryProducts[live.id].sale_price ?? primaryProducts[live.id].price).toLocaleString('ko-KR')}원</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-[11px] px-0.5">
                  {/* 조회수 — 방송 중 실시간 폴링 최고치(lives.peak_viewers) 기록치.
                      피그마 레퍼런스와 동일하게 [조회수 → 진행자명(컬러) → 타이틀] 순서(2026-08-10). */}
                  {typeof live.peak_viewers === 'number' && live.peak_viewers > 0 && (
                    <p className="flex items-center gap-1 text-[10px] text-ink-faint tabular-nums">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3" aria-hidden="true">
                        <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                      {live.peak_viewers.toLocaleString('ko-KR')}
                    </p>
                  )}
                  {live.host_id && hostNames[live.host_id] && (
                    <p className="text-[11.5px] font-bold mt-1" style={{ color: '#72293F' }}>{hostNames[live.host_id]}</p>
                  )}
                  <p className="text-[11.5px] font-semibold text-ink line-clamp-1 mt-0.5">{live.title}</p>
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
                <div className="flex flex-col gap-3.5">
                  {group.items.map((live) => (
                    <Link
                      key={live.id}
                      to={`/app/live/${live.id}`}
                      className="flex gap-3 items-center focus:outline-none focus-visible:shadow-ring"
                    >
                      <div className="relative w-[27.3%] aspect-[91/69] shrink-0 rounded-[10px] bg-quiet overflow-hidden">
                        {live.thumbnail_url ? (
                          <img src={live.thumbnail_url} alt={live.title} className="w-full h-full object-cover" />
                        ) : (
                          <img src="/images/bg-logo-mark.png" alt="" className="w-8 h-8 object-contain opacity-50 m-auto" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-extrabold text-ink tabular-nums">
                          {formatTimeOnly(live.scheduled_at)}
                          {live.duration_minutes ? ` · 약 ${live.duration_minutes}분` : ''}
                        </p>
                        {live.host_id && hostNames[live.host_id] && (
                          <p className="text-[13px] font-bold mt-1" style={{ color: '#72293F' }}>{hostNames[live.host_id]}</p>
                        )}
                        <p className="text-[11.5px] text-ink-soft line-clamp-1 mt-0.5">{live.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* 지난 라이브(다시보기) — 종료된 방송 중 영상이 있는 것(위에서 이미 쓴 항목은 제외) */}
        {!loading && mobileReplays.length > 0 && (
          <>
            <h2 className="text-[16px] font-bold text-ink mb-3.5" style={{ marginTop: 'var(--live-gap-past, 32px)' }}>지난 라이브</h2>
            <div className="grid grid-cols-2 gap-3">
              {mobileReplays.map((live) => (
                <Link
                  key={live.id}
                  to={`/app/live/${live.id}`}
                  className="block bg-paper border border-rule overflow-hidden focus:outline-none focus-visible:shadow-ring"
                >
                  <div className="relative">
                    {live.thumbnail_url ? (
                      <img src={live.thumbnail_url} alt={live.title} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-quiet flex items-center justify-center">
                        <img src="/images/bg-logo-mark.png" alt="" className="w-9 h-9 object-contain opacity-50" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 inline-flex items-center rounded-control bg-ink text-paper text-[10px] font-bold px-2 py-0.5 tracking-[0.04em]">
                      REPLAY
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-medium text-ink line-clamp-2">{live.title}</p>
                    {primaryProducts[live.id] && <ProductPeek product={primaryProducts[live.id]} variant="inline" />}
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
