import { useEffect, useState } from 'react'
import { IconTrash, IconPencil } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { won } from '../../lib/format'
import Button from '../../components/common/Button'

interface MembershipTierRow {
  id: string
  tier_key: string
  label: string
  min_spent: number
  reward_rate: number
  color: string
  bg: string
}

const inputCls =
  'w-full border border-rule rounded-control px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

interface FormState {
  id: string | null
  tierKey: string
  label: string
  minSpent: string
  rewardRate: string
  color: string
  bg: string
}

const EMPTY_FORM: FormState = { id: null, tierKey: '', label: '', minSpent: '', rewardRate: '', color: '#8E9199', bg: '#F4F5F7' }

export default function AdminMembershipTiers() {
  const [tiers, setTiers] = useState<MembershipTierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState<MembershipTierRow | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('membership_tiers').select('*').order('min_spent', { ascending: true })
    setTiers((data ?? []) as MembershipTierRow[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const startEdit = (tier: MembershipTierRow) => {
    setForm({
      id: tier.id,
      tierKey: tier.tier_key,
      label: tier.label,
      minSpent: String(tier.min_spent),
      rewardRate: String(tier.reward_rate),
      color: tier.color,
      bg: tier.bg,
    })
  }

  const resetForm = () => setForm(EMPTY_FORM)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.tierKey.trim()) { setError('등급 코드를 입력해 주세요. (예: BASIC)'); return }
    if (!form.label.trim()) { setError('등급명을 입력해 주세요.'); return }
    if (form.minSpent.trim() === '' || Number(form.minSpent) < 0) { setError('기준 누적구매금액을 입력해 주세요.'); return }
    if (form.rewardRate.trim() === '' || Number(form.rewardRate) < 0 || Number(form.rewardRate) > 100) {
      setError('적립률은 0~100 사이로 입력해 주세요.')
      return
    }

    setSubmitting(true)
    const payload = {
      tier_key: form.tierKey.trim().toUpperCase(),
      label: form.label.trim(),
      min_spent: Number(form.minSpent),
      reward_rate: Number(form.rewardRate),
      color: form.color,
      bg: form.bg,
    }

    const { error: err } = form.id
      ? await supabase.from('membership_tiers').update(payload).eq('id', form.id)
      : await supabase.from('membership_tiers').insert(payload)

    if (err) {
      setError(`저장 실패: ${err.message}`)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    resetForm()
    void load()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await supabase.from('membership_tiers').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    void load()
  }

  return (
    <>
      <header className="h-[60px] bg-paper border-b border-rule flex items-center px-8 sticky top-0 z-20">
        <p className="text-[15px] font-semibold text-ink">회원 등급 설정</p>
      </header>

      <main className="max-w-[1000px] p-8">
        <h1 className="text-[22px] font-bold text-ink mb-2">회원 등급 설정</h1>
        <p className="text-[13px] text-ink-soft mb-6">
          고객의 누적 구매금액이 기준 금액 이상이면 해당 등급이 적용됩니다. 저장 후 고객 화면(마이페이지)에는
          새로고침 시 반영됩니다.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-paper rounded-md border border-rule p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto] gap-3 items-end"
        >
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">등급 코드</label>
            <input
              value={form.tierKey} onChange={(e) => setForm((p) => ({ ...p, tierKey: e.target.value }))}
              placeholder="예: GOLD" className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">등급명(표시)</label>
            <input
              value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="예: GOLD" className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">기준 누적구매금액(원, 이상)</label>
            <input
              type="number" min={0}
              value={form.minSpent} onChange={(e) => setForm((p) => ({ ...p, minSpent: e.target.value }))}
              placeholder="0" className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">적립률(%)</label>
            <input
              type="number" min={0} max={100} step="0.1"
              value={form.rewardRate} onChange={(e) => setForm((p) => ({ ...p, rewardRate: e.target.value }))}
              placeholder="예: 3" className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">글자색</label>
            <input
              type="color"
              value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              className="w-12 h-[42px] border border-rule rounded-control cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">배경색</label>
            <input
              type="color"
              value={form.bg} onChange={(e) => setForm((p) => ({ ...p, bg: e.target.value }))}
              className="w-12 h-[42px] border border-rule rounded-control cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit" variant="ink" size="sm"
              label={submitting ? '저장 중...' : form.id ? '수정' : '추가'}
              disabled={submitting}
            />
            {form.id && (
              <Button type="button" variant="inkOutline" size="sm" label="취소" onClick={resetForm} />
            )}
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-md px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">불러오는 중…</div>
        ) : tiers.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-ink-faint">등록된 등급이 없습니다. 위에서 추가해 주세요.</div>
        ) : (
          <div className="bg-paper rounded-md border border-rule overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="border-b border-rule text-ink-soft">
                  <th className="px-4 py-3 font-medium whitespace-nowrap">배지</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">등급 코드</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">기준 누적구매금액</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">적립률</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-control px-2.5 py-1 text-[11px] font-bold border"
                        style={{ backgroundColor: tier.bg, color: tier.color, borderColor: tier.color }}
                      >
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">{tier.tier_key}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{won(tier.min_spent)} 이상</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{tier.reward_rate}%</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEdit(tier)} className="text-ink-faint hover:text-ink" aria-label="수정">
                          <IconPencil size={16} />
                        </button>
                        <button onClick={() => setConfirmDel(tier)} className="text-ink-faint hover:text-red-500" aria-label="삭제">
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmDel(null)}>
          <div className="bg-paper rounded-md w-full max-w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-ink mb-2">'{confirmDel.label}' 등급을 삭제할까요?</p>
            <p className="text-[13px] text-ink-soft mb-6 leading-relaxed">
              이 등급을 삭제하면 해당 구간 고객은 다음으로 낮은 등급으로 재산정됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="inkOutline" size="sm" label="취소" onClick={() => setConfirmDel(null)} />
              <Button variant="ink" size="sm" label="삭제" onClick={() => void handleDelete()} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
