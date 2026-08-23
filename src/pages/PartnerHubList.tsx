import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
import { CATEGORY_META, fetchPostsByCategory, slugToCategory, type PartnerHubPost } from '../lib/partnerHub'
import { fetchGovSupportPrograms, type GovSupportCategory, type GovSupportProgram } from '../lib/govSupport'

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 기업마당 원본 분야 그대로 사용(임의 재분류 없음) — gov_support 카테고리 전용 필터 칩
const GOV_CATS: (GovSupportCategory | '전체')[] = ['전체', '금융', '기술', '인력', '수출', '내수', '창업', '경영', '기타']

function GovSupportFeed() {
  const [programs, setPrograms] = useState<GovSupportProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState<(typeof GOV_CATS)[number]>('전체')
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await fetchGovSupportPrograms()
      if (!cancelled) { setPrograms(rows); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase()
    return programs.filter((p) => {
      const matchCat = cat === '전체' || p.category === cat
      const matchQuery = !query || p.title.toLowerCase().includes(query)
      return matchCat && matchQuery
    })
  }, [programs, cat, q])

  return (
    <section className="max-w-[720px] mx-auto px-6 pt-12">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="공고 제목 검색"
        className="w-full mb-4 px-4 py-2.5 border border-rule rounded-control text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper"
      />
      <div className="flex gap-2 flex-wrap mb-8">
        {GOV_CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3.5 py-2 rounded-pill text-[12.5px] border transition-colors ${
              cat === c ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink-soft text-[14px] text-center py-10">불러오는 중…</p>
      ) : visible.length === 0 ? (
        <p className="text-ink-soft text-[14px] text-center py-10">조건에 맞는 공고가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3 mb-4">
          {visible.map((p) => (
            <li key={p.id}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-rule rounded-card px-5 py-4 hover:border-ink transition-colors"
              >
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <p className="text-[15px] font-semibold text-ink truncate">{p.title}</p>
                  {p.category && (
                    <span className="text-[11px] text-ink-soft bg-quiet rounded-pill px-2 py-1 whitespace-nowrap shrink-0">
                      {p.category}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink-soft line-clamp-2">
                  {[p.org, p.region, p.apply_period && `신청기간 ${p.apply_period}`].filter(Boolean).join(' · ')}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function PartnerHubList() {
  const { category = '' } = useParams()
  const cat = slugToCategory(category)
  const [posts, setPosts] = useState<PartnerHubPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cat) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const rows = await fetchPostsByCategory(cat)
      if (!cancelled) { setPosts(rows); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [cat])

  if (!cat) return <Navigate to="/partners" replace />
  const meta = CATEGORY_META[cat]

  return (
    <>
      <GNB />
      <main className="bg-paper min-h-screen">
        <section className="border-b border-rule px-6 py-14 sm:py-16">
          <div className="max-w-[720px] mx-auto">
            <Link to="/partners" className="text-[13px] text-ink-soft hover:text-ink transition-colors">
              ← 파트너 허브로
            </Link>
            <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mt-6 mb-2">
              {meta.emoji} {meta.label}
            </p>
            <h1 className="text-[24px] sm:text-[30px] font-bold text-ink mb-2">{meta.label}</h1>
            <p className="text-ink-soft text-[14px]">{meta.short}</p>
          </div>
        </section>

        {cat === 'gov_support' && <GovSupportFeed />}

        <section className="max-w-[720px] mx-auto px-6 py-12">
          {loading ? (
            <p className="text-ink-soft text-[14px] text-center py-16">불러오는 중…</p>
          ) : posts.length === 0 ? (
            cat === 'gov_support' ? null : (
              <p className="text-ink-soft text-[14px] text-center py-16">아직 등록된 글이 없습니다.</p>
            )
          ) : (
            <ul className="flex flex-col gap-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    to={`/partners/${meta.slug}/${post.id}`}
                    className="block border border-rule rounded-card px-5 py-4 hover:border-ink transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5">
                      <p className="text-[15px] font-semibold text-ink truncate">{post.title}</p>
                      <span className="text-[12px] text-ink-faint whitespace-nowrap shrink-0">{formatDate(post.published_at)}</span>
                    </div>
                    {(post.excerpt || post.body) && (
                      <p className="text-[13px] text-ink-soft line-clamp-2">{post.excerpt || post.body}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
