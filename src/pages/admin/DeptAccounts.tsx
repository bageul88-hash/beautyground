import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { DeptAccount } from '../../lib/types'
import { DEPT_NAMES } from '../../lib/deptAccount'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

const inputCls =
  'w-full border border-rule rounded-control px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

function registerUrl(id: string) {
  return `https://beautyground.vercel.app/dept/register/${id}`
}

// 백화점 담당자 계정 관리 — 지점을 등록하면 그 지점 "전용" 가입링크가 생긴다(/dept/register/:id).
// 링크 안에 백화점·지점명이 이미 정해져 있어 담당자는 이메일·비밀번호만 입력하면 된다
// (2026-08-15, 대표님 지시: 담당자가 지점명을 직접 고를 여지 없이 링크=신원 보증 방식으로).
export default function AdminDeptAccounts() {
  const [accounts, setAccounts] = useState<DeptAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [deptKey, setDeptKey] = useState<'hyundai' | 'ak'>('ak')
  const [branchName, setBranchName] = useState('')
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
    if (!branchName.trim()) { setError('지점명을 입력해 주세요.'); return }
    setCreating(true)
    setError('')
    const { data, error: err } = await supabase
      .from('dept_accounts')
      .insert({ dept_key: deptKey, display_name: `${DEPT_NAMES[deptKey]}_${branchName.trim()}` })
      .select('*')
      .single()
    setCreating(false)
    if (err) { setError(`지점 등록 실패: ${err.message}`); return }
    setBranchName('')
    void load()
    if (data) copyLink(data as DeptAccount)
  }

  const changeStatus = async (account: DeptAccount, status: DeptAccount['status']) => {
    setBusyId(account.id)
    setError('')
    const { error: err } = await supabase.from('dept_accounts').update({ status }).eq('id', account.id)
    setBusyId(null)
    if (err) { setError(`상태 변경 실패: ${err.message}`); return }
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, status } : a)))
  }

  const copyLink = (account: DeptAccount) => {
    void navigator.clipboard.writeText(registerUrl(account.id))
    setCopiedId(account.id)
    setTimeout(() => setCopiedId((id) => (id === account.id ? null : id)), 1500)
  }

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">백화점 계정 관리</p>
      </header>

      <main className="max-w-[1100px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">백화점 계정 관리</h1>
        <p className="text-[13px] text-ink-soft mb-5">
          지점을 등록하면 그 지점 전용 가입링크가 자동으로 클립보드에 복사됩니다. 그 링크를
          담당자에게 전달하면, 담당자는 이메일·비밀번호만 입력해 바로 가입합니다.
        </p>

        <form onSubmit={handleCreate} className="bg-paper rounded-md border border-rule p-6 mb-6">
          <h2 className="text-[14px] font-bold text-ink mb-4">지점 등록 · 가입링크 발급</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">백화점</label>
              <select value={deptKey} onChange={(e) => setDeptKey(e.target.value as 'hyundai' | 'ak')} className={inputCls}>
                <option value="ak">AK플라자</option>
                <option value="hyundai">현대백화점</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">지점명</label>
              <input
                type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)}
                placeholder="광명"
                className={inputCls}
              />
            </div>
            <Button type="submit" variant="accent" size="sm" label={creating ? '등록 중...' : '등록 · 링크 복사'} disabled={creating} />
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">등록된 지점이 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">지점명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">백화점</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">등록일</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">가입 상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">{a.display_name}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{DEPT_NAMES[a.dept_key]}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {a.user_id ? (
                        <span className="inline-flex items-center rounded-pill px-2.5 py-1 text-[12px] font-medium bg-signal-blue/10 text-signal-blue">
                          가입완료
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => copyLink(a)}
                          className="text-[12px] text-ink-soft hover:text-ink underline"
                        >
                          {copiedId === a.id ? '링크 복사됨' : '가입링크 복사'}
                        </button>
                      )}
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
