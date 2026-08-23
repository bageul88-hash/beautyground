import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
import { CATEGORY_META, fetchPostsByCategory, slugToCategory, type PartnerHubPost } from '../lib/partnerHub'

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
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

        <section className="max-w-[720px] mx-auto px-6 py-12">
          {loading ? (
            <p className="text-ink-soft text-[14px] text-center py-16">불러오는 중…</p>
          ) : posts.length === 0 ? (
            <p className="text-ink-soft text-[14px] text-center py-16">아직 등록된 글이 없습니다.</p>
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
