import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CATEGORY_META,
  fetchLatestPosts,
  fetchVisitorCount,
  bumpVisitorCountOnce,
  type PartnerHubPost,
  type PartnerHubCategory,
} from '../lib/partnerHub'
import { comma } from '../lib/format'

// 브랜드 파트너 허브 — 입점사·비입점사 누구나 로그인 없이 열람 가능한 정보 페이지.
// "신청/입점 폼"이 전혀 없는 일방향 정보 제공 페이지다 — 2026-08-10에 PG 심사에서
// "중개플랫폼"으로 오인되어 삭제된 옛 /partners·/proposal("입점 브랜드 모집")과는
// 이름만 같고 성격이 다르다(그건 신청 폼이 있었음). 카피·CTA에 "신청하기" 류 문구 넣지 말 것.
//
// 한 화면에 다 들어오는 대시보드형 레이아웃(2026-08-24, 대표님 지시) — 스크롤 없이 핵심(타일 4개)이
// 바로 보이게. 그래서 표준 GNB/Footer 대신 이 페이지 전용의 가벼운 상단바만 쓴다(공용 GNB의
// "앱 보기" 링크는 소비자 쇼핑몰용이라 이 페이지엔 불필요 — 그래서 GNB를 아예 재사용하지 않음).
const CATEGORY_ORDER: PartnerHubCategory[] = ['gov_support', 'dept_store', 'military_px', 'operations']
const LATEST_LIMIT = 3

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PartnerHub() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null)
  const [latestPosts, setLatestPosts] = useState<PartnerHubPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const count = await fetchVisitorCount()
      if (!cancelled) setVisitorCount(count)
      const bumped = await bumpVisitorCountOnce()
      if (!cancelled && bumped !== null) setVisitorCount(bumped)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const posts = await fetchLatestPosts(LATEST_LIMIT)
      if (!cancelled) { setLatestPosts(posts); setLoadingPosts(false) }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      {/* 가벼운 전용 상단바 — 공용 GNB 대신(앱 보기 링크 불필요) */}
      <header className="shrink-0 border-b border-rule px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-[16px] font-bold text-ink">뷰티그라운드</Link>
        {visitorCount !== null && (
          <p className="px-3 py-1 rounded-pill border border-rule text-[11.5px] text-ink-soft">
            누적 방문자 <span className="font-bold text-ink">{comma(visitorCount)}</span>명
          </p>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-6 overflow-y-auto">
        <div className="w-full max-w-[860px]">
          {/* 취지 설명 */}
          <div className="text-center mb-6">
            <p className="text-[12px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">
              브랜드 파트너 허브
            </p>
            <h1 className="text-[20px] sm:text-[24px] font-bold leading-[1.4] text-ink">
              뷰티그라운드와 함께하는 브랜드를 위한 정보 공간입니다
            </h1>
            <p className="text-ink-soft text-[12.5px] sm:text-[13px] leading-relaxed max-w-[520px] mx-auto mt-2">
              입점 여부와 상관없이 누구나 열람하실 수 있습니다.
            </p>
          </div>

          {/* 카테고리 타일 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <Link
              to="/export"
              className="border border-rule rounded-card p-4 hover:border-ink transition-colors text-center"
            >
              <p className="text-[22px] mb-2">🌏</p>
              <p className="text-[13px] font-bold text-ink mb-0.5">수출 바이어 매칭</p>
              <p className="text-[11px] text-ink-soft leading-relaxed">해외 바이어에게 제품 제안</p>
            </Link>
            {CATEGORY_ORDER.map((cat) => (
              <Link
                key={cat}
                to={`/partners/${CATEGORY_META[cat].slug}`}
                className="border border-rule rounded-card p-4 hover:border-ink transition-colors text-center"
              >
                <p className="text-[22px] mb-2">{CATEGORY_META[cat].emoji}</p>
                <p className="text-[13px] font-bold text-ink mb-0.5">{CATEGORY_META[cat].label}</p>
                <p className="text-[11px] text-ink-soft leading-relaxed">{CATEGORY_META[cat].short}</p>
              </Link>
            ))}
          </div>

          {/* 최신 소식 */}
          <div>
            <p className="text-[11px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">Latest</p>
            {loadingPosts ? (
              <p className="text-ink-soft text-[13px] text-center py-4">불러오는 중…</p>
            ) : latestPosts.length === 0 ? (
              <p className="text-ink-soft text-[13px] text-center py-4">아직 등록된 소식이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {latestPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      to={`/partners/${CATEGORY_META[post.category].slug}/${post.id}`}
                      className="flex items-center justify-between gap-4 bg-quiet border border-rule rounded-control px-4 py-2.5 hover:border-ink transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="text-[10px] font-bold text-signal-blue tracking-wide uppercase shrink-0">
                          {CATEGORY_META[post.category].label}
                        </span>
                        <p className="text-[13px] font-semibold text-ink truncate">{post.title}</p>
                      </div>
                      <span className="text-[11.5px] text-ink-faint whitespace-nowrap shrink-0">{formatDate(post.published_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
