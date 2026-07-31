import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Host, HostSettlement, HostSettlementRow } from '../../lib/types'
import { won } from '../../lib/format'
import Button from '../../components/common/Button'

const inputCls =
  'w-full border border-rule rounded-control px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

function thisMonthKey() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

// 강조는 원색 1개(signal-blue)만 — 지급 완료=파랑, 정산 대기=회색.
const STATUS_BADGE: Record<HostSettlement['status'], { label: string; bg: string; text: string }> = {
  pending: { label: '정산 대기', bg: 'bg-quiet', text: 'text-ink-soft' },
  paid:    { label: '지급 완료', bg: 'bg-signal-blue/10', text: 'text-signal-blue' },
}

export default function AdminHostSettlements() {
  const [hosts, setHosts] = useState<Host[]>([])
  const [rows, setRows] = useState<HostSettlementRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)

  const [hostId, setHostId] = useState('')
  const [period, setPeriod] = useState(thisMonthKey())
  const [preview, setPreview] = useState<HostSettlement | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadHosts = async () => {
    const { data } = await supabase.from('hosts').select('*').eq('status', 'active').order('name')
    setHosts((data ?? []) as Host[])
  }

  const loadRows = async () => {
    setLoadingRows(true)
    const { data, error: err } = await supabase.rpc('admin_list_host_settlements')
    if (err) {
      setError(`목록 조회 실패: ${err.message}`)
      setLoadingRows(false)
      return
    }
    setRows((data ?? []) as HostSettlementRow[])
    setLoadingRows(false)
  }

  useEffect(() => {
    void loadHosts()
    void loadRows()
  }, [])

  const handlePreview = async () => {
    if (!hostId) { setError('진행자를 선택해 주세요.'); return }
    setError('')
    setPreviewing(true)
    setPreview(null)
    const { data, error: err } = await supabase.rpc('admin_generate_host_settlement', {
      p_host_id: hostId,
      p_period: period,
      p_dry_run: true,
    })
    setPreviewing(false)
    if (err) { setError(`미리보기 실패: ${err.message}`); return }
    setPreview(data as HostSettlement)
  }

  const handleGenerate = async () => {
    if (!hostId) { setError('진행자를 선택해 주세요.'); return }
    setError('')
    setGenerating(true)
    const { error: err } = await supabase.rpc('admin_generate_host_settlement', {
      p_host_id: hostId,
      p_period: period,
      p_dry_run: false,
    })
    setGenerating(false)
    if (err) { setError(`정산 생성 실패: ${err.message}`); return }
    setPreview(null)
    void loadRows()
  }

  const handleMarkPaid = async (row: HostSettlementRow) => {
    setPayingId(row.id)
    setError('')
    const { error: err } = await supabase.rpc('admin_mark_host_settlement_paid', { p_settlement_id: row.id })
    setPayingId(null)
    if (err) { setError(`지급 처리 실패: ${err.message}`); return }
    void loadRows()
  }

  const hostName = hosts.find((h) => h.id === hostId)?.name

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">진행자 정산 관리</p>
      </header>

      <main className="max-w-[1100px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-4">진행자 정산 관리</h1>

        {/* 정산 생성 패널 */}
        <div className="bg-paper rounded-md border border-rule p-6 mb-6">
          <h2 className="text-[14px] font-bold text-ink mb-4">정산 생성</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">진행자</label>
              <select value={hostId} onChange={(e) => { setHostId(e.target.value); setPreview(null) }} className={inputCls}>
                <option value="">선택하세요</option>
                {hosts.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">정산 기간</label>
              <input
                type="month" value={period}
                onChange={(e) => { setPeriod(e.target.value); setPreview(null) }}
                className={inputCls}
              />
            </div>
            <Button variant="inkOutline" size="sm" label={previewing ? '계산 중...' : '미리보기'} disabled={previewing} onClick={() => void handlePreview()} />
            <Button variant="accent" size="sm" label={generating ? '생성 중...' : '정산 생성'} disabled={generating} onClick={() => void handleGenerate()} />
          </div>

          {preview && (
            <div className="mt-5 bg-quiet rounded-md p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-ink-faint mb-1">진행자</p>
                <p className="text-[13px] font-semibold text-ink">{hostName}</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint mb-1">총매출</p>
                <p className="text-[13px] font-semibold text-ink">{won(preview.total_sales)}</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint mb-1">적용 등급 / 수수료율</p>
                <p className="text-[13px] font-semibold text-ink">{preview.tier_name ?? '-'} / {preview.commission_rate}%</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-faint mb-1">지급 예정액</p>
                <p className="text-[13px] font-bold text-ink">{won(preview.commission_amount)}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* 전체 정산 목록 */}
        {loadingRows ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">생성된 정산 내역이 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">진행자</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">기간</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">총매출</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">등급</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">수수료율</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">지급액</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const badge = STATUS_BADGE[row.status]
                  return (
                    <tr key={row.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">{row.host_name}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{row.period}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{won(row.total_sales)}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{row.tier_name ?? '-'}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{row.commission_rate}%</td>
                      <td className="px-4 py-3 text-ink font-semibold whitespace-nowrap">{won(row.commission_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.status === 'pending' ? (
                          <Button
                            variant="accent" size="sm" label={payingId === row.id ? '처리 중...' : '지급 완료 처리'}
                            disabled={payingId === row.id}
                            onClick={() => void handleMarkPaid(row)}
                          />
                        ) : (
                          <span className="text-ink-faint">-</span>
                        )}
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
