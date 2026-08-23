import { useEffect, useState } from 'react'
import { IconSearch, IconClipboardList } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { CATEGORY_META, type PartnerHubCategory } from '../../lib/partnerHub'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

type Status = 'draft' | 'published'

interface PostRow {
  id: string
  category: PartnerHubCategory
  title: string
  excerpt: string | null
  body: string
  thumbnail_url: string | null
  status: Status
  published_at: string | null
  created_at: string
}

type CategoryFilter = PartnerHubCategory | 'all'
type StatusFilter = Status | 'all'

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'gov_support', label: CATEGORY_META.gov_support.label },
  { value: 'dept_store', label: CATEGORY_META.dept_store.label },
  { value: 'operations', label: CATEGORY_META.operations.label },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'published', label: '발행' },
]

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  draft: { label: '임시저장', className: 'bg-quiet text-ink-faint' },
  published: { label: '발행', className: 'bg-signal-blue/10 text-signal-blue' },
}

const inputCls =
  'w-full border border-rule rounded-control px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

const EMPTY_FORM = { category: 'gov_support' as PartnerHubCategory, title: '', excerpt: '', body: '', thumbnail_url: '' }

export default function AdminPartnerHubPosts() {
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('partner_hub_posts').select('*').order('created_at', { ascending: false }).limit(500)
    setPosts((data ?? []) as PostRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const startEdit = (post: PostRow) => {
    setEditingId(post.id)
    setForm({
      category: post.category,
      title: post.title,
      excerpt: post.excerpt ?? '',
      body: post.body,
      thumbnail_url: post.thumbnail_url ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('제목과 본문은 필수입니다.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      category: form.category,
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      body: form.body.trim(),
      thumbnail_url: form.thumbnail_url.trim() || null,
    }

    if (editingId) {
      const { data, error: err } = await supabase
        .from('partner_hub_posts')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)
        .select()
        .single()
      setSaving(false)
      if (err) { setError(`수정 실패: ${err.message}`); return }
      setPosts((prev) => prev.map((p) => (p.id === editingId ? (data as PostRow) : p)))
      cancelEdit()
    } else {
      const { data, error: err } = await supabase
        .from('partner_hub_posts')
        .insert(payload)
        .select()
        .single()
      setSaving(false)
      if (err) { setError(`등록 실패: ${err.message}`); return }
      setPosts((prev) => [data as PostRow, ...prev])
      setForm(EMPTY_FORM)
    }
  }

  const togglePublish = async (post: PostRow) => {
    const nextStatus: Status = post.status === 'published' ? 'draft' : 'published'
    // 최초 발행 시에만 published_at을 세팅 — 이미 있으면(재발행) 유지해서 "최신 소식" 정렬이 안 흔들리게 함.
    const nextPublishedAt = nextStatus === 'published' && !post.published_at ? new Date().toISOString() : post.published_at
    const prev = post
    setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, status: nextStatus, published_at: nextPublishedAt } : p)))
    const { error: err } = await supabase
      .from('partner_hub_posts')
      .update({ status: nextStatus, published_at: nextPublishedAt, updated_at: new Date().toISOString() })
      .eq('id', post.id)
    if (err) setPosts((list) => list.map((p) => (p.id === post.id ? prev : p)))
  }

  const handleDelete = async (post: PostRow) => {
    if (!window.confirm(`"${post.title}" 글을 삭제할까요? 되돌릴 수 없습니다.`)) return
    const { error: err } = await supabase.from('partner_hub_posts').delete().eq('id', post.id)
    if (err) { setError(`삭제 실패: ${err.message}`); return }
    setPosts((prev) => prev.filter((p) => p.id !== post.id))
    if (editingId === post.id) cancelEdit()
  }

  const visible = posts.filter((p) => {
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const q = search.trim().toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q)
    return matchCategory && matchStatus && matchSearch
  })

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">파트너 허브 콘텐츠 관리</p>
      </header>

      <main className="max-w-[1300px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">파트너 허브 콘텐츠 관리</h1>
        <p className="text-[13px] text-ink-soft mb-6">
          /partners 에서 브랜드사(입점·비입점 모두)가 열람하는 정부지원사업·백화점 입점·브랜드 운영정보 글을 관리합니다.
          신청/입점 폼이 아니라 정보 제공용 게시판입니다.
        </p>

        {/* 작성/수정 폼 */}
        <div className="bg-paper rounded-md border border-rule p-5 mb-6">
          <p className="text-[13px] font-semibold text-ink mb-3">{editingId ? '글 수정' : '새 글 작성'}</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as PartnerHubCategory }))}
              className={inputCls}
            >
              {(Object.keys(CATEGORY_META) as PartnerHubCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
              ))}
            </select>
            <input placeholder="제목 *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} />
          </div>
          <input
            placeholder="요약 (선택 — 비우면 목록에 본문 앞부분이 대신 표시됩니다)"
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            className={`${inputCls} mb-3`}
          />
          <textarea
            placeholder="본문 * — 줄바꿈 그대로 표시됩니다."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={8}
            className={`${inputCls} mb-3 resize-y`}
          />
          <input
            placeholder="썸네일 이미지 URL (선택)"
            value={form.thumbnail_url}
            onChange={(e) => setForm((f) => ({ ...f, thumbnail_url: e.target.value }))}
            className={`${inputCls} mb-3`}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="accent"
              size="sm"
              label={saving ? '저장 중…' : editingId ? '수정 저장' : '새 글 등록 (임시저장)'}
              disabled={saving}
              onClick={() => void handleSave()}
            />
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-[12.5px] text-ink-soft hover:text-ink underline">
                취소
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목 검색"
              className="w-full pl-9 pr-4 py-2.5 border border-rule rounded-control text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategoryFilter(value)}
                className={`px-3.5 py-2.5 rounded-pill text-[13px] border transition-colors ${
                  categoryFilter === value ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3.5 py-2.5 rounded-pill text-[13px] border transition-colors ${
                  statusFilter === value ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24 bg-paper rounded-md border border-rule">
            <IconClipboardList size={40} className="text-rule mx-auto mb-3" />
            <p className="text-[14px] text-ink-faint">{search || categoryFilter !== 'all' || statusFilter !== 'all' ? '조건에 맞는 글이 없습니다' : '아직 등록된 글이 없습니다'}</p>
          </div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">작성일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">카테고리</th>
                  <th className="px-4 py-3 font-medium">제목</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">발행일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((post) => {
                  const badge = STATUS_BADGE[post.status]
                  return (
                    <tr key={post.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(post.created_at)}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{CATEGORY_META[post.category].label}</td>
                      <td className="px-4 py-3 text-ink font-semibold max-w-[280px] truncate" title={post.title}>{post.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{post.published_at ? formatDateTime(post.published_at) : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEdit(post)} className="text-[12px] text-ink-soft hover:text-ink underline">
                            수정
                          </button>
                          <button type="button" onClick={() => void togglePublish(post)} className="text-[12px] text-signal-blue hover:underline">
                            {post.status === 'published' ? '임시저장으로' : '발행하기'}
                          </button>
                          <button type="button" onClick={() => void handleDelete(post)} className="text-[12px] text-signal-red hover:underline">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
