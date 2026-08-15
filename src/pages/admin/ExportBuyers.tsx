import { useEffect, useState } from 'react'
import { IconSearch, IconTargetArrow } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import type { ExportBuyer } from '../../lib/types'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

type StatusFilter = ExportBuyer['status'] | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'target', label: '발굴' },
  { value: 'contacted', label: '컨택함' },
  { value: 'responded', label: '회신옴' },
  { value: 'declined', label: '거절' },
  { value: 'won', label: '성사' },
]

const STATUS_BADGE: Record<ExportBuyer['status'], { label: string; className: string }> = {
  target:    { label: '발굴', className: 'bg-quiet text-ink-faint' },
  contacted: { label: '컨택함', className: 'bg-signal-blue/10 text-signal-blue' },
  responded: { label: '회신옴', className: 'bg-signal-blue/10 text-signal-blue' },
  declined:  { label: '거절', className: 'bg-quiet text-ink-faint' },
  won:       { label: '성사', className: 'bg-signal-red/10 text-signal-red' }, // 강조는 원색 1개 원칙 — 가장 중요한 결과이니 danger 톤 재사용
}

const STATUS_OPTIONS: { value: ExportBuyer['status']; label: string }[] = [
  { value: 'target', label: '발굴' },
  { value: 'contacted', label: '컨택함' },
  { value: 'responded', label: '회신옴' },
  { value: 'declined', label: '거절' },
  { value: 'won', label: '성사' },
]

const inputCls =
  'w-full border border-rule rounded-control px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

interface PartnerOption { id: string; brand_name: string }

const EMPTY_FORM = { company_name: '', country: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' }

export default function AdminExportBuyers() {
  const [loading, setLoading] = useState(true)
  const [buyers, setBuyers] = useState<ExportBuyer[]>([])
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [formPartnerIds, setFormPartnerIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: buyerRows }, { data: partnerRows }] = await Promise.all([
      supabase.from('export_buyers').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('partners').select('id,brand_name').order('brand_name'),
    ])
    setBuyers((buyerRows ?? []) as ExportBuyer[])
    setPartners((partnerRows ?? []) as PartnerOption[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const brandNames = (ids: string[]) =>
    ids.map((id) => partners.find((p) => p.id === id)?.brand_name ?? '알수없음').join(', ')

  const toggleFormPartner = (id: string) => {
    setFormPartnerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleAdd = async () => {
    if (!form.company_name.trim() || !form.country.trim()) {
      setError('업체명과 국가는 필수입니다.')
      return
    }
    setAdding(true)
    setError('')
    const { data, error: err } = await supabase
      .from('export_buyers')
      .insert({
        company_name: form.company_name.trim(),
        country: form.country.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
        proposed_partner_ids: formPartnerIds,
      })
      .select()
      .single()
    setAdding(false)
    if (err) { setError(`추가 실패: ${err.message}`); return }
    setBuyers((prev) => [data as ExportBuyer, ...prev])
    setForm(EMPTY_FORM)
    setFormPartnerIds([])
  }

  const handleStatusChange = async (buyer: ExportBuyer, next: ExportBuyer['status']) => {
    const prev = buyer.status
    setBuyers((list) => list.map((b) => (b.id === buyer.id ? { ...b, status: next } : b)))
    const { error: err } = await supabase.from('export_buyers').update({ status: next }).eq('id', buyer.id)
    if (err) setBuyers((list) => list.map((b) => (b.id === buyer.id ? { ...b, status: prev } : b)))
  }

  const visible = buyers.filter((b) => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      b.company_name.toLowerCase().includes(q) ||
      b.country.toLowerCase().includes(q) ||
      (b.contact_name ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">해외 바이어 타겟 관리</p>
      </header>

      <main className="max-w-[1300px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">해외 바이어 타겟 관리</h1>
        <p className="text-[13px] text-ink-soft mb-6">
          발굴한 해외 바이어 업체와 컨택 상태를 관리합니다. 이 정보는 브랜드사에는 공개되지 않습니다.
        </p>

        {/* 신규 타겟 추가 */}
        <div className="bg-paper rounded-md border border-rule p-5 mb-6">
          <p className="text-[13px] font-semibold text-ink mb-3">신규 바이어 타겟 추가</p>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <input placeholder="업체명 *" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className={inputCls} />
            <input placeholder="국가 *" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputCls} />
            <input placeholder="담당자명" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} className={inputCls} />
            <input placeholder="이메일" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} className={inputCls} />
            <input placeholder="연락처" value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} className={inputCls} />
            <input placeholder="메모" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
          {partners.length > 0 && (
            <div className="mb-3">
              <p className="text-[12px] text-ink-faint mb-1.5">제안할 브랜드</p>
              <div className="flex flex-wrap gap-2">
                {partners.map((p) => {
                  const active = formPartnerIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleFormPartner(p.id)}
                      className={`px-3 py-1.5 rounded-pill text-[12px] border transition-colors ${
                        active ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink-soft border-rule hover:border-ink-faint'
                      }`}
                    >
                      {p.brand_name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <Button variant="accent" size="sm" label={adding ? '추가 중…' : '타겟 추가'} disabled={adding} onClick={() => void handleAdd()} />
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
              placeholder="업체명·국가·담당자 검색"
              className="w-full pl-9 pr-4 py-2.5 border border-rule rounded-control text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-2.5 rounded-pill text-[13px] border transition-colors ${
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
            <IconTargetArrow size={40} className="text-rule mx-auto mb-3" />
            <p className="text-[14px] text-ink-faint">{search || statusFilter !== 'all' ? '조건에 맞는 타겟이 없습니다' : '아직 등록된 바이어 타겟이 없습니다'}</p>
          </div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">등록일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">업체명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">국가</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">담당자</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">연락처</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">제안 브랜드</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">메모</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => {
                  const badge = STATUS_BADGE[b.status] ?? { label: b.status, className: 'bg-quiet text-ink-faint' }
                  return (
                    <tr key={b.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(b.created_at)}</td>
                      <td className="px-4 py-3 text-ink font-semibold whitespace-nowrap">{b.company_name}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{b.country}</td>
                      <td className="px-4 py-3 text-ink whitespace-nowrap">{b.contact_name ?? '-'}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        {b.contact_email ? <a href={`mailto:${b.contact_email}`} className="hover:text-ink underline block">{b.contact_email}</a> : null}
                        {b.contact_phone ?? (b.contact_email ? null : '-')}
                      </td>
                      <td className="px-4 py-3 text-ink-soft max-w-[180px]">{b.proposed_partner_ids.length > 0 ? brandNames(b.proposed_partner_ids) : '-'}</td>
                      <td className="px-4 py-3 text-ink-soft max-w-[200px] truncate" title={b.notes ?? ''}>{b.notes ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={b.status}
                          onChange={(e) => void handleStatusChange(b, e.target.value as ExportBuyer['status'])}
                          className="border border-rule rounded-control px-2 py-1.5 text-[12px] text-ink-soft focus:outline-none focus:border-ink transition-colors bg-paper"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
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
