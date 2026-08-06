import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Live } from '../../lib/types'
import AppHeader from '../../components/layout/AppHeader'
import AppFrame from '../../components/layout/AppFrame'
import LiveStatusBadge from '../../components/live/LiveStatusBadge'
import DesktopLiveList from '../../components/live/DesktopLiveList'
import ViewModeToggle from '../../components/layout/ViewModeToggle'
import { useViewMode } from '../../lib/viewMode'
import { formatDateTime } from '../../lib/format'

interface PrimaryProduct {
  name: string
  price: number
  sale_price: number | null
  thumbnail_url: string | null
}

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

      <main className="px-4 py-5">
        <h1 className="text-[20px] font-bold text-text mb-4">라이브</h1>

        {loading ? (
          <div className="py-20 text-center text-[14px] text-text-hint">
            불러오는 중…
          </div>
        ) : lives.length === 0 ? (
          <div className="py-10 text-center text-[14px] text-text-hint">
            진행 중이거나 예정된 라이브가 없습니다.
          </div>
        ) : (
          <>
            {hero && (
              <Link
                to={`/app/live/${hero.id}`}
                className="block relative rounded-md overflow-hidden mb-5 focus:outline-none focus:shadow-focus"
              >
                {hero.thumbnail_url ? (
                  <img
                    src={hero.thumbnail_url}
                    alt={hero.title}
                    className="w-full h-[220px] object-cover"
                  />
                ) : (
                  <img src="/images/bg-logo-mark.png" alt="" className="w-full h-[220px] object-cover" />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)' }}
                  aria-hidden="true"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <LiveStatusBadge live={hero} />
                  {hero.status === 'scheduled' && (
                    <span className="inline-flex items-center rounded-pill bg-black/50 text-white text-[11px] font-medium px-2.5 py-1">
                      {formatDateTime(hero.scheduled_at)}
                      {hero.duration_minutes ? ` · 약 ${hero.duration_minutes}분` : ''}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-[17px] font-bold leading-snug line-clamp-2">
                    {hero.title}
                  </p>
                  {hero.host_id && hostNames[hero.host_id] && (
                    <p className="text-white/80 text-[12px] mt-1">{hostNames[hero.host_id]} 진행</p>
                  )}
                </div>
              </Link>
            )}

            {restLives.length > 0 && (
              <div className="flex flex-col gap-4">
                {restLives.map((live) => (
                  <Link
                    key={live.id}
                    to={`/app/live/${live.id}`}
                    className="block bg-white rounded-md border overflow-hidden transition-colors hover:border-gold/40 focus:outline-none focus:shadow-focus"
                    style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
                  >
                    <div className="relative">
                      {live.thumbnail_url ? (
                        <img
                          src={live.thumbnail_url}
                          alt={live.title}
                          className="w-full h-[160px] object-cover"
                        />
                      ) : (
                        <img src="/images/bg-logo-mark.png" alt="" className="w-full h-[160px] object-cover" />
                      )}

                      <div className="absolute top-3 left-3">
                        <LiveStatusBadge live={live} />
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[15px] font-medium text-text line-clamp-2">
                        {live.title}
                      </p>
                      {live.host_id && hostNames[live.host_id] && (
                        <p className="text-[12px] text-text-sub mt-0.5">{hostNames[live.host_id]} 진행</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* 다시보기 — 종료된 방송 중 영상이 있는 것 */}
        {!loading && replays.length > 0 && (
          <>
            <h2 className="text-[17px] font-bold text-text mt-8 mb-4">다시보기</h2>
            <div className="grid grid-cols-2 gap-3">
              {replays.map((live) => (
                <Link
                  key={live.id}
                  to={`/app/live/${live.id}`}
                  className="block bg-white rounded-md border overflow-hidden transition-colors hover:border-gold/40 focus:outline-none focus:shadow-focus"
                  style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
                >
                  <div className="relative">
                    {live.thumbnail_url ? (
                      <img
                        src={live.thumbnail_url}
                        alt={live.title}
                        className="w-full h-[110px] object-cover"
                      />
                    ) : (
                      <img src="/images/bg-logo-mark.png" alt="" className="w-full h-[110px] object-cover" />
                    )}
                    <span className="absolute top-2 left-2 inline-flex items-center rounded-pill bg-black/60 text-white text-[10px] font-bold px-2.5 py-0.5">
                      REPLAY
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[13px] font-medium text-text line-clamp-2">
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
