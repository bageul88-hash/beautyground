import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import { supabase } from '../lib/supabase'
import {
  getDiaryFeed, getMonthlyBestDiaries, createDiary, toggleDiaryLike, deleteDiary,
  uploadDiaryImages, type Diary, type BestDiary, type DiarySort,
} from '../lib/diaries'

// 살아가는 이야기 — 유저가 사진과 함께 일상을 남기는 곳.
// 글을 올리면 create_diary RPC 안에서 diary_post 미션이 자동 적립된다(화면에서 따로 적립 호출 안 함).
// 좋아요가 많은 글은 '이달의 우수 사연'으로 뽑아 선물을 준다.

const MAX_IMAGES = 4

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

function maskName(name: string | null) {
  const n = (name ?? '').trim()
  if (!n) return '익명'
  if (n.length <= 2) return n[0] + '*'
  // 이메일 앞부분이 닉네임이 되면 길어질 수 있어 가운데 별표는 최대 3개로 줄인다.
  return n[0] + '*'.repeat(Math.min(n.length - 2, 3)) + n[n.length - 1]
}

export default function AppDiary() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [sort, setSort] = useState<DiarySort>('recent')
  const [feed, setFeed] = useState<Diary[]>([])
  const [best, setBest] = useState<BestDiary[]>([])
  const [loading, setLoading] = useState(true)

  const [composing, setComposing] = useState(false)
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  const load = useCallback(async (s: DiarySort) => {
    const { data: { session } } = await supabase.auth.getSession()
    setLoggedIn(!!session)
    if (session) {
      // 마이페이지와 같은 규칙 — 닉네임이 없으면 이메일 앞부분을 쓴다.
      const meta = session.user.user_metadata as { name?: string } | undefined
      setMyName(meta?.name || session.user.email?.split('@')[0] || null)
    }
    const [rows, bests] = await Promise.all([getDiaryFeed(s, 30), getMonthlyBestDiaries(3)])
    setFeed(rows)
    setBest(bests)
    setLoading(false)
  }, [])

  useEffect(() => { void load(sort) }, [load, sort])

  // 미리보기 objectURL 정리 — 안 지우면 메모리에 계속 남는다.
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)) }, [previews])

  const pickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    const next = [...files, ...picked].slice(0, MAX_IMAGES)
    previews.forEach((u) => URL.revokeObjectURL(u))
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    previews.forEach((u) => URL.revokeObjectURL(u))
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
  }

  const resetComposer = () => {
    previews.forEach((u) => URL.revokeObjectURL(u))
    setContent(''); setFiles([]); setPreviews([]); setComposing(false)
  }

  const submit = async () => {
    if (content.trim().length < 5) { showToast('내용을 5자 이상 적어주세요'); return }
    setSaving(true)
    const urls = files.length > 0 ? await uploadDiaryImages(files) : []
    if (files.length > 0 && urls.length === 0) {
      setSaving(false); showToast('사진 업로드에 실패했어요. 잠시 후 다시 시도해 주세요'); return
    }
    const res = await createDiary(content, urls, myName)
    setSaving(false)
    if (!res || !res.diary_id) { showToast(res?.message || '등록에 실패했어요'); return }
    resetComposer()
    showToast(res.awarded > 0 ? `${res.awarded}P를 받았어요` : '이야기를 올렸어요')
    void load(sort)
  }

  const onLike = async (d: Diary) => {
    if (!loggedIn) { navigate('/app/login'); return }
    // 응답을 기다리는 동안 먼저 화면부터 바꿔 준다(느린 네트워크에서 눌린 느낌이 나도록).
    setFeed((prev) => prev.map((x) => x.id === d.id
      ? { ...x, liked_by_me: !x.liked_by_me, like_count: x.like_count + (x.liked_by_me ? -1 : 1) }
      : x))
    const res = await toggleDiaryLike(d.id)
    if (!res) { void load(sort); return }
    setFeed((prev) => prev.map((x) => x.id === d.id
      ? { ...x, liked_by_me: res.liked, like_count: res.like_count } : x))
  }

  const onDelete = async (d: Diary) => {
    if (!window.confirm('이 이야기를 삭제할까요?')) return
    const ok = await deleteDiary(d.id)
    if (!ok) { showToast('삭제하지 못했어요'); return }
    setFeed((prev) => prev.filter((x) => x.id !== d.id))
  }

  return (
    <AppFrame>
      <BackHeader title="살아가는 이야기" />

      {/* 이달의 우수 사연 */}
      {best.length > 0 && (
        <section className="mx-5 mt-4 rounded-card border border-rule bg-quiet p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold text-ink">🏆 이달의 우수 사연</p>
            <span className="text-[11px] text-ink-faint">좋아요가 많은 글에 선물을 드려요</span>
          </div>
          <ul className="space-y-1.5">
            {best.map((b, i) => (
              <li key={b.id} className="flex items-center gap-2 text-[12px]">
                <span className="w-4 shrink-0 text-ink-faint font-semibold">{i + 1}</span>
                <span className="flex-1 truncate text-ink">{b.content}</span>
                <span className="shrink-0 text-ink-faint">♥ {b.like_count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 쓰기 */}
      <section className="px-5 mt-4">
        {!composing ? (
          <button
            onClick={() => { if (!loggedIn) { navigate('/app/login'); return } setComposing(true) }}
            className="w-full rounded-card border border-dashed border-rule px-4 py-3.5 text-left text-[13px] text-ink-soft"
          >
            ✏️ 오늘 어떤 하루였나요? 이야기를 남기면 포인트를 드려요
          </button>
        ) : (
          <div className="rounded-card border border-rule bg-paper p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="오늘의 이야기를 자유롭게 적어주세요. (5자 이상)"
              className="w-full resize-none text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
            />

            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {previews.map((src, i) => (
                  <div key={src} className="relative shrink-0">
                    <img src={src} alt="" className="w-20 h-20 rounded-lg object-cover" />
                    <button onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-paper text-[11px] leading-none">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-rule">
              <div className="flex items-center gap-3">
                <button onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_IMAGES}
                  className="text-[13px] text-ink-soft disabled:opacity-40">
                  📷 사진 {files.length}/{MAX_IMAGES}
                </button>
                <span className="text-[11px] text-ink-faint">{content.length}/1000</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={resetComposer} disabled={saving}
                  className="px-3 py-2 rounded-control text-[13px] text-ink-soft">취소</button>
                <button onClick={() => void submit()} disabled={saving}
                  className="px-4 py-2 rounded-control bg-signal-blue text-paper text-[13px] font-semibold disabled:opacity-50">
                  {saving ? '올리는 중…' : '올리기'}
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
          </div>
        )}
      </section>

      {/* 정렬 */}
      <div className="flex items-center gap-2 px-5 mt-5 mb-2">
        {([['recent', '최신'], ['popular', '인기']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSort(key)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
              sort === key ? 'bg-ink text-paper' : 'bg-ink/5 text-ink-soft'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 피드 */}
      {loading ? (
        <p className="px-5 py-10 text-[13px] text-ink-soft">불러오는 중…</p>
      ) : feed.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-[13px] text-ink-soft">아직 올라온 이야기가 없어요.<br />첫 번째 이야기를 남겨보세요.</p>
        </div>
      ) : (
        <ul className="px-5 pb-24 space-y-3">
          {feed.map((d) => (
            <li key={d.id} className="rounded-card border border-rule bg-paper p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-ink">{maskName(d.nickname)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-faint">{timeAgo(d.created_at)}</span>
                  {d.is_mine && (
                    <button onClick={() => void onDelete(d)} className="text-[11px] text-ink-faint underline">삭제</button>
                  )}
                </div>
              </div>

              <p className="text-[14px] text-ink whitespace-pre-wrap leading-relaxed">{d.content}</p>

              {d.images.length > 0 && (
                <div className={`grid gap-1.5 mt-3 ${d.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {d.images.map((src) => (
                    <img key={src} src={src} alt="" loading="lazy"
                      className={`w-full rounded-lg object-cover ${d.images.length === 1 ? 'max-h-80' : 'h-36'}`} />
                  ))}
                </div>
              )}

              <button onClick={() => void onLike(d)}
                className={`mt-3 inline-flex items-center gap-1.5 text-[13px] ${
                  d.liked_by_me ? 'text-signal-blue font-semibold' : 'text-ink-soft'}`}>
                <span>{d.liked_by_me ? '♥' : '♡'}</span>
                <span>{d.like_count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-ink text-paper text-[13px] shadow-lg">
          {toast}
        </div>
      )}
    </AppFrame>
  )
}
