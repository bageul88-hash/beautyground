import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
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
const CATEGORY_ORDER: PartnerHubCategory[] = ['gov_support', 'dept_store', 'operations']

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
      const posts = await fetchLatestPosts(8)
      if (!cancelled) { setLatestPosts(posts); setLoadingPosts(false) }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <GNB />
      <main className="bg-paper">
        {/* Hero */}
        <section className="border-b border-rule px-6 py-16 sm:py-20 text-center">
          <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-5">
            브랜드 파트너 허브
          </p>
          <h1 className="text-[26px] sm:text-[34px] font-bold leading-[1.4] text-ink max-w-[640px] mx-auto">
            뷰티그라운드와 함께하는 브랜드를 위한
            <br />
            정보 공간입니다
          </h1>
          <p className="text-ink-soft text-[14px] sm:text-[15px] leading-relaxed max-w-[520px] mx-auto mt-5">
            입점 여부와 상관없이 누구나 열람하실 수 있습니다. 정부지원사업·백화점 입점·브랜드 운영에
            도움이 되는 정보를 뷰티그라운드가 정리해 전해드립니다.
          </p>
          {visitorCount !== null && (
            <p className="inline-block mt-6 px-4 py-2 rounded-pill border border-rule text-[12.5px] text-ink-soft">
              누적 방문자 <span className="font-bold text-ink">{comma(visitorCount)}</span>명
            </p>
          )}
        </section>

        {/* 카테고리 타일 */}
        <section className="max-w-[1080px] mx-auto px-6 py-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/export"
              className="border border-rule rounded-card p-6 hover:border-ink transition-colors text-center"
            >
              <p className="text-[28px] mb-3">🌏</p>
              <p className="text-[14px] font-bold text-ink mb-1">수출 바이어 매칭</p>
              <p className="text-[12px] text-ink-soft leading-relaxed">해외 바이어에게 제품을 제안하는 채널</p>
            </Link>
            {CATEGORY_ORDER.map((cat) => (
              <Link
                key={cat}
                to={`/partners/${CATEGORY_META[cat].slug}`}
                className="border border-rule rounded-card p-6 hover:border-ink transition-colors text-center"
              >
                <p className="text-[28px] mb-3">{CATEGORY_META[cat].emoji}</p>
                <p className="text-[14px] font-bold text-ink mb-1">{CATEGORY_META[cat].label}</p>
                <p className="text-[12px] text-ink-soft leading-relaxed">{CATEGORY_META[cat].short}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 최신 소식 */}
        <section className="bg-quiet px-6 py-16">
          <div className="max-w-[720px] mx-auto">
            <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-2">Latest</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-ink mb-8">최신 소식</h2>

            {loadingPosts ? (
              <p className="text-ink-soft text-[14px] text-center py-10">불러오는 중…</p>
            ) : latestPosts.length === 0 ? (
              <p className="text-ink-soft text-[14px] text-center py-10">아직 등록된 소식이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {latestPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      to={`/partners/${CATEGORY_META[post.category].slug}/${post.id}`}
                      className="flex items-center justify-between gap-4 bg-paper border border-rule rounded-card px-5 py-4 hover:border-ink transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="inline-block text-[10.5px] font-bold text-signal-blue tracking-wide uppercase mb-1.5">
                          {CATEGORY_META[post.category].label}
                        </span>
                        <p className="text-[14px] font-semibold text-ink truncate">{post.title}</p>
                      </div>
                      <span className="text-[12px] text-ink-faint whitespace-nowrap shrink-0">{formatDate(post.published_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
