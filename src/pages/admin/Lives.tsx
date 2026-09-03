import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Live } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

type Filter = Live['status'] | 'all'
type LiveRow = Live & {
  partners: { brand_name: string } | null
  // 진행자 애칭 — 카드에 누가 진행하는 방송인지 바로 보이게 한다(2026-09-02)
  hosts: { name: string | null } | null
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'scheduled', label: '예정' },
  { value: 'live', label: '방송중' },
  { value: 'ended', label: '종료' },
]

// 강조는 원색 1개(signal-blue)만 — 방송중=파랑, 나머지(예정/종료)는 회색 톤.
const STATUS_BADGE: Record<Live['status'], { label: string; className: string }> = {
  scheduled: { label: '예정', className: 'bg-quiet text-ink-soft' },
  live: { label: '방송중', className: 'bg-signal-blue/10 text-signal-blue' },
  ended: { label: '종료', className: 'bg-quiet text-ink-faint' },
}

export default function AdminLives() {
  const [loading, setLoading] = useState(true)
  const [lives, setLives] = useState<LiveRow[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('lives')
      .select('*, partners(brand_name), hosts(name)')
      .order('created_at', { ascending: false })
    if (err) { setError(`목록 조회 실패: ${err.message}`); setLoading(false); return }
    setLives((data ?? []) as LiveRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const forceEnd = async (live: LiveRow) => {
    if (!window.confirm(`"${live.title}" 방송을 강제 종료할까요?`)) return
    setBusyId(live.id)
    setError('')
    const { error: err } = await supabase.from('lives').update({ status: 'ended' }).eq('id', live.id)
    setBusyId(null)
    if (err) { setError(`처리 실패: ${err.message}`); return }
    setLives((prev) => prev.map((l) => (l.id === live.id ? { ...l, status: 'ended' } : l)))
  }

  const setDeptKey = async (live: LiveRow, deptKey: string) => {
    setBusyId(live.id)
    setError('')
    const value = deptKey || null
    const { error: err } = await supabase.from('lives').update({ dept_key: value }).eq('id', live.id)
    setBusyId(null)
    if (err) { setError(`백화점 지정 실패: ${err.message}`); return }
    setLives((prev) => prev.map((l) => (l.id === live.id ? { ...l, dept_key: value as Live['dept_key'] } : l)))
  }

  const handleDelete = async (live: LiveRow) => {
    if (!window.confirm(`"${live.title}" 방송 정보를 삭제할까요? 되돌릴 수 없습니다.`)) return
    setBusyId(live.id)
    const { error: err } = await supabase.from('lives').delete().eq('id', live.id)
    setBusyId(null)
    if (err) { setError(`삭제 실패: ${err.message}`); return }
    setLives((prev) => prev.filter((l) => l.id !== live.id))
  }

  const visible = useMemo(() => (filter === 'all' ? lives : lives.filter((l) => l.status === filter)), [lives, filter])

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">라이브 방송 관리</p>
      </header>

      <main className="max-w-[1200px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">라이브 방송 관리</h1>
        <p className="text-[13px] text-ink-soft mb-5">전체 브랜드의 라이브 방송을 확인하고, 문제 있는 방송을 강제 종료·삭제할 수 있습니다.</p>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${
                filter === f.value ? 'bg-ink text-paper' : 'bg-paper border border-rule text-ink-soft'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        {/* 방송자 카드 — 진행자가 여러 명일 때 누가 방송 중인지 한눈에 보고, 눌러서 바로 지원 화면으로
            들어가기 위한 목록(2026-09-02). 이미지는 방송 썸네일(지원 화면에서 등록), 이름은 진행자 애칭. */}
        {!loading && visible.length > 0 && (
          <div className="mb-8">
            <p className="text-[13px] font-bold text-ink mb-3">
              방송자 목록 <span className="text-ink-soft font-normal">— 카드를 누르면 그 방송을 지원합니다</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {visible.map((l) => {
                const badge = STATUS_BADGE[l.status]
                return (
                  <Link
                    key={`card-${l.id}`}
                    to={`/admin/lives/${l.id}/support`}
                    className="bg-paper border border-rule overflow-hidden hover:border-ink transition-colors"
                  >
                    <div className="relative w-full aspect-[9/16] bg-quiet">
                      {l.thumbnail_url ? (
                        <img src={l.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[11.5px] text-ink-faint text-center px-2">
                          이미지 없음
                          <br />
                          (지원 화면에서 등록)
                        </div>
                      )}
                      <span
                        className={`absolute top-2 left-2 inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-bold ${badge.className}`}
                      >
                        {l.status === 'live' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-red mr-1 onair-dot" />
                        )}
                        {badge.label}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[12.5px] font-bold text-ink truncate">
                        {l.hosts?.name ?? l.partners?.brand_name ?? '진행자 미지정'}
                      </p>
                      <p className="text-[11.5px] text-ink-soft truncate mt-0.5">{l.title}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">해당하는 방송이 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">브랜드</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">제목</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">예정일시</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">최고 시청자</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">백화점</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const badge = STATUS_BADGE[l.status]
                  return (
                    <tr key={l.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{l.partners?.brand_name ?? '-'}</td>
                      <td className="px-4 py-3 text-ink max-w-[240px] truncate">{l.title}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{l.scheduled_at ? formatDateTime(l.scheduled_at) : '-'}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{l.peak_viewers ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={l.dept_key ?? ''}
                          disabled={busyId === l.id}
                          onChange={(e) => void setDeptKey(l, e.target.value)}
                          className="border border-rule rounded-md px-2 py-1.5 text-[12px] text-ink bg-paper"
                        >
                          <option value="">지정 안 함</option>
                          <option value="hyundai">현대백화점</option>
                          <option value="ak">AK플라자</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* 방송 지원 — 진행자 대신 상품을 걸고 채팅으로 응대하는 운영 화면 */}
                          <Link
                            to={`/admin/lives/${l.id}/support`}
                            className="text-[12px] font-bold text-paper bg-ink px-2.5 py-1.5 rounded-control whitespace-nowrap"
                          >
                            방송 지원
                          </Link>
                          {l.status !== 'ended' && (
                            <Button variant="danger" size="sm" label="강제 종료" disabled={busyId === l.id} onClick={() => void forceEnd(l)} />
                          )}
                          <Button variant="inkOutline" size="sm" label="삭제" disabled={busyId === l.id} onClick={() => void handleDelete(l)} />
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
