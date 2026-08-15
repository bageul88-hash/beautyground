import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { DeptAccount } from '../../lib/types'
import { DEPT_NAMES } from '../../lib/deptAccount'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

const inputCls =
  'w-full border border-rule rounded-control px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

// 백화점 담당자 계정 관리 — 지점별로 계정을 발급한다(예: "AK플라자_광명").
// 로그인 계정은 Supabase 대시보드 → Authentication에서 먼저 만든 뒤 이메일로 연결한다
// (admin_create_dept_account RPC, AdminPartners.tsx의 계정 연결과 동일한 2단계 방식).
export default function AdminDeptAccounts() {
  const [accounts, setAccounts] = useState<DeptAccount[]>([]);
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [deptKey, setDeptKey] = useState<'hyundai' | 'ak'>('ak')
  const [displayName, setDisplayName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('dept_accounts').select('*').order('created_at', { ascending: false })
    if (err) { setError(`목록 조회 실패: ${err.message}`); setLoading(false); return }
    setAccounts((data ?? []) as DeptAccount[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !displayName.trim()) { setError('아이디(이메일)와 지점명을 입력해 주세요.'); return }
    setCreating(true)
    setError('')
    const { error: err } = await supabase.rpc('admin_create_dept_account', {
      p_email: email.trim(),
      p_dept_key: deptKey,
      p_display_name: displayName.trim(),
    })
    setCreating(false)
    if (err) { setError(`계정 생성 실패: ${err.message}`); return }
    setEmail('')
    setDisplayName('')
    void load()
  }

  const changeStatus = async (account: DeptAccount, status: DeptAccount['status']) => {
    setBusyId(account.id)
    setError('')
    const { error: err } = await supabase.from('dept_accounts').update({ status }).eq('id', account.id)
    setBusyId(null)
    if (err) { setError(`상태 변경 실패: ${err.message}`); return }
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, status } : a)))
  }

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">백화점 계정 관리</p>
      </header>

      <main className="max-w-[1100px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">백화점 계정 관리</h1>
        <p className="text-[13px] text-ink-soft mb-5">
          지점별로 로그인 계정을 발급합니다. 계정은 Supabase 대시보드 → Authentication에서 먼저
          만든 뒤 이메일로 연결하세요.
        </p>

        <form onSubmit={handleCreate} className="bg-paper rounded-md border border-rule p-6 mb-6">
          <h2 className="text-[14px] font-bold text-ink mb-4">계정 발급</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">아이디(이메일)</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ak-gwangmyeong@beautyground.co.kr"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">백화점</label>
              <select value={deptKey} onChange={(e) => setDeptKey(e.target.value as 'hyundai' | 'ak')} className={inputCls}>
                <option value="ak">AK플라자</option>
                <option value="hyundai">현대백화점</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">지점명 표시</label>
              <input
                type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="AK플라자_광명"
                className={inputCls}
              />
            </div>
            <Button type="submit" variant="accent" size="sm" label={creating ? '생성 중...' : '계정 발급'} disabled={creating} />
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">발급된 계정이 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">지점명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">백화점</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">발급일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">{a.display_name}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{DEPT_NAMES[a.dept_key]}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium ${
                          a.status === 'active' ? 'bg-signal-blue/10 text-signal-blue' : 'bg-quiet text-ink-faint'
                        }`}
                      >
                        {a.status === 'active' ? '이용중' : '정지됨'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.status !== 'suspended' ? (
                        <Button variant="inkOutline" size="sm" label="정지" disabled={busyId === a.id} onClick={() => void changeStatus(a, 'suspended')} />
                      ) : (
                        <Button variant="accent" size="sm" label="재활성화" disabled={busyId === a.id} onClick={() => void changeStatus(a, 'active')} />
                      )}
                    </td>
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
