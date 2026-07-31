import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { won, formatDateTime } from '../../lib/format'

interface MemberRow {
  id: string
  email: string
  name: string
  phone: string
  provider: string
  created_at: string
  total_spent: number
  order_count: number
  tier_label: string
}

const PROVIDER_LABEL: Record<string, string> = {
  email: '이메일',
  kakao: '카카오',
  naver: '네이버',
}

export default function AdminMembers() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.rpc('admin_list_members')
    if (err) {
      setError(`회원 목록 조회 실패: ${err.message}`)
      setLoading(false)
      return
    }
    setMembers((data ?? []) as MemberRow[])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.email?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        m.phone?.includes(q)
    )
  }, [members, query])

  return (
    <>
      <header className="h-[60px] bg-white border-b border-[#eee] flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-[#111]">회원 관리</p>
      </header>

      <main className="max-w-[1200px] p-8">
        <h1 className="text-[22px] font-bold text-text mb-2">회원 관리</h1>
        <p className="text-[13px] text-text-sub mb-6">
          총 {members.length}명 가입. 등급은 회원 등급 설정(누적구매금액 기준)에 따라 자동 산정됩니다.
        </p>

        <div className="mb-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이메일·이름·연락처로 검색"
            className="w-full max-w-[360px] border border-[#e5e0d8] rounded-lg px-3.5 py-2.5 text-[13px] text-[#111] placeholder:text-[#bbb] focus:outline-none focus:border-[#b8924a] transition-colors bg-white"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-text-hint">불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-text-hint">
            {members.length === 0 ? '가입된 회원이 없습니다.' : '검색 결과가 없습니다.'}
          </div>
        ) : (
          <div className="bg-white rounded-md border overflow-x-auto" style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}>
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-cream-2 text-text-sub">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">가입일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">이메일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">이름</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">연락처</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">가입경로</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">등급</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">누적구매금액</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">주문수</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-cream-2 last:border-b-0">
                    <td className="px-4 py-3 text-text-sub whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-3 text-text font-medium whitespace-nowrap">{m.email || '-'}</td>
                    <td className="px-4 py-3 text-text-sub whitespace-nowrap">{m.name || '-'}</td>
                    <td className="px-4 py-3 text-text-sub whitespace-nowrap">{m.phone || '-'}</td>
                    <td className="px-4 py-3 text-text-sub whitespace-nowrap">{PROVIDER_LABEL[m.provider] ?? m.provider}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium bg-[#f4f0e8] text-[#8a6d2f]">
                        {m.tier_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-sub whitespace-nowrap">{won(m.total_spent)}</td>
                    <td className="px-4 py-3 text-text-sub whitespace-nowrap">{m.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
