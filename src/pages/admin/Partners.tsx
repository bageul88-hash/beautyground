import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Partner } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

type StatusFilter = Partner['status'] | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활동중' },
  { value: 'suspended', label: '정지됨' },
]

// 강조는 원색 1개(signal-blue)만 — 활동중=파랑, 정지됨=회색.
const statusBadge: Record<Partner['status'], { label: string; className: string }> = {
  active: { label: '활동중', className: 'bg-signal-blue/10 text-signal-blue' },
  suspended: { label: '정지됨', className: 'bg-quiet text-ink-faint' },
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('partners').select('*').order('created_at', { ascending: false })
    if (err) { setError(`목록 조회 실패: ${err.message}`); setLoading(false); return }
    setPartners((data ?? []) as Partner[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const updateLocal = (id: string, patch: Partial<Partner>) => {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const changeStatus = async (partner: Partner, status: Partner['status']) => {
    setBusyId(partner.id)
    setError('')
    const { error: updErr } = await supabase.from('partners').update({ status }).eq('id', partner.id)
    if (updErr) { setError(`처리 실패: ${updErr.message}`); setBusyId(null); return }
    updateLocal(partner.id, { status })
    setBusyId(null)
  }

  const saveRate = async (partner: Partner) => {
    const raw = rateDraft[partner.id]
    if (raw === undefined) return
    const rate = Number(raw)
    if (isNaN(rate) || rate < 0 || rate > 100) { setError('수수료율은 0~100 사이여야 합니다'); return }
    setBusyId(partner.id)
    setError('')
    const { error: updErr } = await supabase.from('partners').update({ commission_rate: rate }).eq('id', partner.id)
    setBusyId(null)
    if (updErr) { setError(`수수료율 수정 실패: ${updErr.message}`); return }
    updateLocal(partner.id, { commission_rate: rate })
    setRateDraft((prev) => { const n = { ...prev }; delete n[partner.id]; return n })
  }

  const visible = filter === 'all' ? partners : partners.filter((p) => p.status === filter)

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">파트너 관리</p>
      </header>

      <main className="max-w-[1100px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">파트너 관리</h1>
        <p className="text-[13px] text-ink-soft mb-5">승인된 입점 브랜드의 활동 상태와 수수료율을 관리합니다. 신규 입점 심사는 "파트너 신청 관리"에서 처리합니다.</p>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
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

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">해당하는 파트너가 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">입점일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">브랜드명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">수수료율</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const badge = statusBadge[p.status]
                  const draft = rateDraft[p.id]
                  return (
                    <tr key={p.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(p.created_at)}</td>
                      <td className="px-4 py-3 text-ink font-medium">{p.brand_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min={0} max={100} step="0.1"
                            value={draft ?? String(p.commission_rate)}
                            onChange={(e) => setRateDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-16 border border-rule rounded-control px-2 py-1 text-[12px] text-ink focus:outline-none focus:border-ink"
                          />
                          <span className="text-ink-faint text-[12px]">%</span>
                          {draft !== undefined && draft !== String(p.commission_rate) && (
                            <Button variant="accent" size="sm" label="저장" disabled={busyId === p.id} onClick={() => void saveRate(p)} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {p.status !== 'active' && (
                            <Button variant="accent" size="sm" label="활성화" disabled={busyId === p.id} onClick={() => void changeStatus(p, 'active')} />
                          )}
                          {p.status !== 'suspended' && (
                            <Button variant="danger" size="sm" label="정지" disabled={busyId === p.id} onClick={() => void changeStatus(p, 'suspended')} />
                          )}
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
