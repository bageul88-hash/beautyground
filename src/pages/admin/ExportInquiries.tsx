import { useEffect, useState } from 'react'
import { IconSearch, IconWorld } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import type { ExportInquiry } from '../../lib/types'
import { formatDateTime } from '../../lib/format'

type StatusFilter = ExportInquiry['status'] | 'all'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'new', label: '신규' },
  { value: 'contacted', label: '연락완료' },
  { value: 'closed', label: '종료' },
]

const STATUS_BADGE: Record<ExportInquiry['status'], { label: string; className: string }> = {
  new:       { label: '신규', className: 'bg-signal-blue/10 text-signal-blue' },
  contacted: { label: '연락완료', className: 'bg-quiet text-ink-soft' },
  closed:    { label: '종료', className: 'bg-quiet text-ink-faint' },
}

const STATUS_OPTIONS: { value: ExportInquiry['status']; label: string }[] = [
  { value: 'new', label: '신규' },
  { value: 'contacted', label: '연락완료' },
  { value: 'closed', label: '종료' },
]

export default function AdminExportInquiries() {
  const [loading, setLoading] = useState(true)
  const [inquiries, setInquiries] = useState<ExportInquiry[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('export_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    setInquiries((data ?? []) as ExportInquiry[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleStatusChange = async (inquiry: ExportInquiry, next: ExportInquiry['status']) => {
    const prev = inquiry.status
    setInquiries((list) => list.map((i) => (i.id === inquiry.id ? { ...i, status: next } : i)))
    const { error } = await supabase.from('export_inquiries').update({ status: next }).eq('id', inquiry.id)
    if (error) setInquiries((list) => list.map((i) => (i.id === inquiry.id ? { ...i, status: prev } : i)))
  }

  const newCount = inquiries.filter((i) => i.status === 'new').length

  const visible = inquiries.filter((i) => {
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      i.company_name.toLowerCase().includes(q) ||
      i.contact_name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      i.country.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">해외 바이어 문의</p>
      </header>

      <main className="max-w-[1300px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">해외 바이어 문의</h1>
        <p className="text-[13px] text-ink-soft mb-6">
          /export 페이지로 들어온 해외 바이어 문의를 확인·관리합니다.
          {newCount > 0 && <span className="ml-2 text-signal-blue font-semibold">신규 {newCount}건</span>}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="업체명·담당자명·이메일·국가 검색"
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
            <IconWorld size={40} className="text-rule mx-auto mb-3" />
            <p className="text-[14px] text-ink-faint">{search || statusFilter !== 'all' ? '조건에 맞는 문의가 없습니다' : '아직 문의가 없습니다'}</p>
          </div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">접수일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">업체명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">담당자</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">이메일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">연락처</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">국가</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관심 카테고리</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">메시지</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => {
                  const badge = STATUS_BADGE[i.status] ?? { label: i.status, className: 'bg-quiet text-ink-faint' }
                  return (
                    <tr key={i.id} className="border-b border-rule last:border-b-0">
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(i.created_at)}</td>
                      <td className="px-4 py-3 text-ink font-semibold whitespace-nowrap">{i.company_name}</td>
                      <td className="px-4 py-3 text-ink whitespace-nowrap">{i.contact_name}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                        <a href={`mailto:${i.email}`} className="hover:text-ink underline">{i.email}</a>
                      </td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{i.phone ?? '-'}</td>
                      <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{i.country}</td>
                      <td className="px-4 py-3 text-ink-soft max-w-[180px]">{i.interested_categories?.join(', ') ?? '-'}</td>
                      <td className="px-4 py-3 text-ink-soft max-w-[220px] truncate" title={i.message ?? ''}>{i.message ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={i.status}
                          onChange={(e) => void handleStatusChange(i, e.target.value as ExportInquiry['status'])}
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
