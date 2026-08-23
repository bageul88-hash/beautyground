import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import GNB from '../components/layout/GNB'
import Footer from '../components/layout/Footer'
import { CATEGORY_META, fetchPostById, slugToCategory, type PartnerHubPost } from '../lib/partnerHub'

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PartnerHubDetail() {
  const { category = '', id = '' } = useParams()
  const cat = slugToCategory(category)
  const [post, setPost] = useState<PartnerHubPost | null | undefined>(undefined)

  useEffect(() => {
    if (!cat || !id) { setPost(null); return }
    let cancelled = false
    ;(async () => {
      const row = await fetchPostById(id)
      if (cancelled) return
      setPost(row && row.category === cat ? row : null)
    })()
    return () => { cancelled = true }
  }, [cat, id])

  if (!cat) return <Navigate to="/partners" replace />
  const meta = CATEGORY_META[cat]

  return (
    <>
      <GNB />
      <main className="bg-paper min-h-screen">
        <div className="max-w-[720px] mx-auto px-6 py-14 sm:py-16">
          <Link to={`/partners/${meta.slug}`} className="text-[13px] text-ink-soft hover:text-ink transition-colors">
            ← {meta.label} 목록으로
          </Link>

          {post === undefined ? (
            <p className="text-ink-soft text-[14px] text-center py-20">불러오는 중…</p>
          ) : post === null ? (
            <div className="text-center py-20">
              <p className="text-ink-soft text-[14px] mb-4">글을 찾을 수 없습니다.</p>
              <Link to={`/partners/${meta.slug}`} className="text-[13px] text-ink underline">
                {meta.label} 목록으로 돌아가기
              </Link>
            </div>
          ) : (
            <article className="mt-8">
              <p className="text-[13px] font-bold text-signal-blue tracking-[0.2em] uppercase mb-3">
                {meta.emoji} {meta.label}
              </p>
              <h1 className="text-[24px] sm:text-[30px] font-bold text-ink mb-3 leading-snug">{post.title}</h1>
              <p className="text-[12.5px] text-ink-faint mb-8">{formatDate(post.published_at)}</p>
              {post.thumbnail_url && (
                <img src={post.thumbnail_url} alt="" className="w-full rounded-card border border-rule mb-8 object-cover" />
              )}
              <div className="whitespace-pre-wrap text-[15px] text-ink-soft leading-[1.9]">{post.body}</div>
            </article>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
