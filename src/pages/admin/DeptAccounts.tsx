import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { DeptAccount } from '../../lib/types'
import { DEPT_NAMES } from '../../lib/deptAccount'
import { formatDateTime } from '../../lib/format'
import Button from '../../components/common/Button'

// 백화점 담당자 계정 관리 — 가입은 담당자 본인이 /dept/register 링크에서 직접 한다(코드 없음,
// 링크 자체를 필요한 사람에게만 전달하는 방식, 2026-08-15). 여기서는 가입된 계정 조회·정지만 한다.
export default function AdminDeptAccounts() {
  const [accounts, setAccounts] = useState<DeptAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('dept_accounts').select('*').order('created_at', { ascending: false })
    if (err) { setError(`목록 조회 실패: ${err.message}`); setLoading(false); return }
    setAccounts((data ?? []) as DeptAccount[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const changeStatus = async (account: DeptAccount, status: DeptAccount['status']) => {
    setBusyId(account.id)
    setError('')
    const { error: err } = await supabase.from('dept_accounts').update({ status }).eq('id', account.id)
    setBusyId(null)
    if (err) { setError(`상태 변경 실패: ${err.message}`); return }
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, status } : a)))
  }

  const registerUrl = 'https://beautyground.vercel.app/dept/register'
  const copyLink = () => {
    void navigator.clipboard.writeText(registerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">백화점 계정 관리</p>
      </header>

      <main className="max-w-[1100px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">백화점 계정 관리</h1>
        <p className="text-[13px] text-ink-soft mb-5">
          담당자가 아래 가입 링크에서 백화점·지점명·아이디·비밀번호를 직접 입력해 바로 가입합니다.
          링크를 필요한 담당자에게만 전달하세요.
        </p>

        <div className="bg-paper rounded-md border border-rule p-6 mb-6 flex items-center gap-3">
          <code className="flex-1 text-[13px] text-ink bg-quiet px-3 py-2 rounded-md">{registerUrl}</code>
          <Button variant="accent" size="sm" label={copied ? '복사됨' : '링크 복사'} onClick={copyLink} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">{error}</div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">아직 가입한 담당자가 없습니다.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">지점명</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">백화점</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">가입일</th>
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
                    <td className="px-4 py-3 whitespace-nowrap">
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
