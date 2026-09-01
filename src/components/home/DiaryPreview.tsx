import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { IconChevronRight } from '../common/Icon'

// 홈에 붙는 "살아가는 이야기" 미리보기 (2026-09-02)
// 홈이 상품만 쌓여 있어 커뮤니티가 있는지조차 보이지 않던 문제를 고치기 위해,
// 배너 바로 아래에 최근 글 몇 개를 얇게 노출한다.
// 글이 하나도 없을 때도 숨기지 않고 "첫 이야기를 남겨보세요" 입구를 보여준다 —
// 지금은 글이 없는 게 정상이고, 이 자리 자체가 참여를 만드는 장치이기 때문.

interface DiaryRow {
  id: string
  content: string | null
  images: string[] | null
  like_count: number | null
  created_at: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

export default function DiaryPreview() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<DiaryRow[] | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('diaries')
      .select('id, content, images, like_count, created_at')
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (active) setRows((data ?? []) as DiaryRow[])
      })
    return () => { active = false }
  }, [])

  if (rows === null) return null // 첫 로딩 중엔 자리를 비워 깜빡임을 막는다

  return (
    <section className="px-5 pt-5 pb-1">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink leading-tight">살아가는 이야기</h2>
          <p className="text-[12px] text-ink-faint mt-0.5">오늘 하루를 남기고 포인트를 받아보세요</p>
        </div>
        <button
          onClick={() => navigate('/app/diary')}
          className="shrink-0 flex items-center gap-0.5 text-[12px] text-ink-soft focus:outline-none focus-visible:shadow-ring"
        >
          더보기 <IconChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {rows.length === 0 ? (
        <button
          onClick={() => navigate('/app/diary')}
          className="w-full rounded-card border border-dashed border-rule bg-quiet/50 px-4 py-5 text-center focus:outline-none focus-visible:shadow-ring"
        >
          <p className="text-[13.5px] text-ink font-semibold">아직 올라온 이야기가 없어요</p>
          <p className="text-[12px] text-ink-faint mt-1">첫 번째 이야기를 남겨보세요</p>
        </button>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-1 px-1 snap-x">
          {rows.map((d) => {
            const thumb = d.images?.[0] ?? null
            return (
              <button
                key={d.id}
                onClick={() => navigate('/app/diary')}
                className="shrink-0 w-[150px] snap-start text-left rounded-card border border-rule bg-paper overflow-hidden focus:outline-none focus-visible:shadow-ring"
              >
                {thumb ? (
                  <div className="aspect-[4/3] bg-quiet">
                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-quiet flex items-center justify-center px-3">
                    <p className="text-[12px] text-ink-soft line-clamp-3 leading-snug">{d.content ?? ''}</p>
                  </div>
                )}
                <div className="px-2.5 py-2">
                  <p className="text-[12px] text-ink line-clamp-2 leading-snug min-h-[2.4em]">{d.content ?? ''}</p>
                  <p className="text-[11px] text-ink-faint mt-1.5">
                    {timeAgo(d.created_at)}
                    {(d.like_count ?? 0) > 0 && <span className="ml-2">👏 {d.like_count}</span>}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
