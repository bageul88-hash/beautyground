import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconVideo, IconCopy, IconCheck } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { getMyHost } from '../../lib/host'
import type { Host, Live } from '../../lib/types'
import Button from '../../components/common/Button'

type StatusFilter = Live['status'] | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'scheduled', label: '예정' },
  { value: 'live', label: '진행중' },
  { value: 'ended', label: '완료' },
]

const STATUS_MAP: Record<Live['status'], { label: string; bg: string; text: string }> = {
  scheduled: { label: '예정', bg: 'bg-[#FAEEDA]', text: 'text-[#633806]' },
  live:      { label: 'LIVE', bg: 'bg-[#FBEAF0]', text: 'text-[#993556]' },
  ended:     { label: '완료', bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]' },
}

function formatScheduled(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 방송 예정일시 입력의 최소값(지금) — datetime-local input용 로컬시간 문자열
function nowLocalInput() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// 새 라이브 만들기 — 승인된 진행자가 직접 방송을 만들고 자기 링크를 그 자리에서 받아간다.
// host_token은 RLS로 select가 막혀있어(supabase/lives_host_token.sql) create_my_live RPC(SECURITY
// DEFINER, supabase/host_create_live.sql)로만 받아올 수 있다.
function CreateLiveForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [createdLink, setCreatedLink] = useState('')
  const [copied, setCopied] = useState(false)

  const submit = async () => {
    if (creating) return
    setError('')
    if (!title.trim()) { setError('제목을 입력하세요.'); return }
    if (!scheduledAt) { setError('방송 예정일시를 입력하세요.'); return }
    setCreating(true)
    const { data, error: rpcErr } = await supabase.rpc('create_my_live', {
      p_title: title.trim(),
      p_scheduled_at: new Date(scheduledAt).toISOString(),
    })
    setCreating(false)
    if (rpcErr || !data || !data[0]) {
      setError(rpcErr?.message ?? '라이브 생성에 실패했습니다.')
      return
    }
    const token = data[0].host_token as string
    setCreatedLink(`${window.location.origin}/host/go/${token}`)
    setTitle(''); setScheduledAt('')
    onCreated()
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* 클립보드 권한 없으면 무시 — 링크는 화면에 그대로 보임 */ }
  }

  if (createdLink) {
    return (
      <div className="bg-[#E1F5EE] rounded-[14px] border border-[#b8e0d2] p-5 mb-6">
        <p className="text-[13px] font-semibold text-[#085041] mb-2">✅ 라이브가 만들어졌습니다</p>
        <p className="text-[12px] text-[#3c6659] mb-3">
          이 링크를 방송 시작 6시간 전부터 핸드폰 브라우저로 열면 바로 방송을 켤 수 있어요. 이 링크가 곧 방송 열쇠이니 본인만 보관하세요.
        </p>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-[#b8e0d2] p-3">
          <p className="text-[12px] text-[#111] flex-1 truncate">{createdLink}</p>
          <button
            onClick={copyLink}
            className="shrink-0 flex items-center gap-1 text-[12px] font-medium text-[#085041] hover:underline"
          >
            {copied ? <><IconCheck size={14} /> 복사됨</> : <><IconCopy size={14} /> 복사</>}
          </button>
        </div>
        <button
          onClick={() => setCreatedLink('')}
          className="mt-3 text-[12px] text-[#3c6659] hover:underline"
        >
          + 또 만들기
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[14px] border border-[#e5e0d8] p-5 mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-[13px] font-semibold text-ink hover:underline text-left"
        >
          + 새 라이브 만들기
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] font-semibold text-[#111]">새 라이브 만들기</p>
          <div>
            <label className="block text-[12px] text-[#666] mb-1">방송 제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 8월 28일 라이브 방송"
              className="w-full border border-[#e5e0d8] rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#666] mb-1">방송 예정일시</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={nowLocalInput()}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-[#e5e0d8] rounded-md px-3 py-2.5 text-[13px] focus:outline-none focus:border-ink"
            />
          </div>
          {error && <p className="text-[12px] text-[#FF4757]">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ink" size="sm" label={creating ? '만드는 중…' : '만들기'} disabled={creating} onClick={submit} />
            <button onClick={() => { setOpen(false); setError('') }} className="text-[12px] text-[#999] px-2">취소</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HostLives() {
  const [loading, setLoading] = useState(true)
  const [host, setHost] = useState<Host | null>(null)
  const [lives, setLives] = useState<Live[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')

  const load = async () => {
    const h = await getMyHost()
    setHost(h)
    if (!h) { setLoading(false); return }
    const { data } = await supabase
      .from('lives')
      .select('*')
      .eq('host_id', h.id)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
    setLives((data as Live[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = filter === 'all' ? lives : lives.filter((l) => l.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[14px] text-[#9a9080]">불러오는 중...</p>
      </div>
    )
  }

  return (
    <>
      {host?.status === 'active' && <CreateLiveForm onCreated={load} />}

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${
              filter === f.value ? 'bg-ink text-white' : 'bg-white border border-[#e5e0d8] text-[#555]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[14px] border border-[#e5e0d8]">
          <IconVideo size={32} className="text-[#e5e0d8] mx-auto mb-3" />
          <p className="text-[14px] text-[#9a9080]">진행한 방송이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((live) => {
            const badge = STATUS_MAP[live.status]
            return (
              <Link
                key={live.id}
                to={`/host/live/${live.id}`}
                className="block bg-white rounded-[14px] border border-[#e5e0d8] p-5 hover:border-ink transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[14px] font-semibold text-[#111] leading-tight">{live.title}</p>
                  <span className={`ml-2 shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-[12px] text-[#9a9080]">{formatScheduled(live.scheduled_at)}</p>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
