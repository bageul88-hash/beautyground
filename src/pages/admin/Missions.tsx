// 활동 미션 관리 — 걷기·일기·라이브시청 등 참여 리워드를 코드 수정 없이 등록/수정/온오프한다.
// ("살아 움직이는 앱" 원칙: 이벤트를 5분 만에 열고 닫을 수 있어야 함 — 2026-08-31 대표님 지시)
// 포인트 지급은 기존 point_transactions 원장을 그대로 사용한다(신규 원장 없음).
import { useEffect, useState } from 'react'
import { IconTrash, IconPencil } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import type { Mission, MissionMilestone } from '../../lib/types'
import Button from '../../components/common/Button'

const inputCls =
  'w-full border border-rule rounded-control px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors bg-paper'

const TYPE_LABEL: Record<Mission['type'], string> = {
  daily: '매일 반복',
  streak: '연속 달성',
  cumulative: '기간 누적',
  once: '1회성',
}

// metric = 무엇을 세는가. 새 활동을 추가할 땐 여기에 한 줄만 늘리면 된다.
const METRIC_LABEL: Record<string, string> = {
  steps: '걸음 수',
  attendance: '출석',
  diary_post: '일기 작성',
  review_post: '리뷰 작성',
  live_minutes: '라이브 시청(분)',
  custom: '기타(수동)',
}

interface FormState {
  id: string | null
  key: string
  title: string
  description: string
  icon: string
  type: Mission['type']
  metric: string
  targetValue: string
  rewardPoints: string
  milestones: string // "1000:5, 5000:10, 10000:15" 형식으로 입력받아 파싱
  rewardNote: string
  maxPerDay: string
  cooldownSec: string
  startsAt: string
  endsAt: string
  pointExpireDays: string
  sortOrder: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  id: null, key: '', title: '', description: '', icon: '',
  type: 'daily', metric: 'steps', targetValue: '1', rewardPoints: '0',
  milestones: '', rewardNote: '', maxPerDay: '1', cooldownSec: '0',
  startsAt: '', endsAt: '', pointExpireDays: '30', sortOrder: '0', active: false,
}

// "1000:5, 5000:10" → [{value:1000,points:5},{value:5000,points:10}]
function parseMilestones(raw: string): MissionMilestone[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [v, p] = pair.split(':').map((x) => Number(x.trim()))
      return { value: v, points: p }
    })
    .filter((m) => Number.isFinite(m.value) && Number.isFinite(m.points))
    .sort((a, b) => a.value - b.value)
}

function formatMilestones(list: MissionMilestone[] | null): string {
  if (!list || list.length === 0) return ''
  return list.map((m) => `${m.value}:${m.points}`).join(', ')
}

export default function AdminMissions() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState<Mission | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('missions').select('*').order('sort_order', { ascending: true })
    setMissions((data ?? []) as Mission[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const startEdit = (m: Mission) => {
    setForm({
      id: m.id,
      key: m.key,
      title: m.title,
      description: m.description ?? '',
      icon: m.icon ?? '',
      type: m.type,
      metric: m.metric,
      targetValue: String(m.target_value),
      rewardPoints: String(m.reward_points),
      milestones: formatMilestones(m.milestones),
      rewardNote: m.reward_note ?? '',
      maxPerDay: String(m.max_per_day),
      cooldownSec: String(m.cooldown_sec),
      startsAt: m.starts_at ? m.starts_at.slice(0, 10) : '',
      endsAt: m.ends_at ? m.ends_at.slice(0, 10) : '',
      pointExpireDays: String(m.point_expire_days),
      sortOrder: String(m.sort_order),
      active: m.active,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.key.trim()) { setError('미션 키를 입력해 주세요. (영문 소문자·언더바, 예: walk_daily)'); return }
    if (!form.title.trim()) { setError('미션 이름을 입력해 주세요.'); return }
    if (Number(form.targetValue) < 1) { setError('목표값은 1 이상이어야 합니다.'); return }

    const parsedMilestones = parseMilestones(form.milestones)
    if (form.milestones.trim() && parsedMilestones.length === 0) {
      setError('구간 보상 형식이 올바르지 않습니다. 예) 1000:5, 5000:10, 10000:15')
      return
    }
    if (parsedMilestones.length === 0 && Number(form.rewardPoints) <= 0) {
      setError('구간 보상 또는 기본 보상 중 하나는 반드시 있어야 합니다.')
      return
    }

    setSubmitting(true)
    const payload = {
      key: form.key.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
      type: form.type,
      metric: form.metric,
      target_value: Number(form.targetValue),
      reward_points: Number(form.rewardPoints) || 0,
      milestones: parsedMilestones,
      reward_note: form.rewardNote.trim() || null,
      max_per_day: Number(form.maxPerDay) || 1,
      cooldown_sec: Number(form.cooldownSec) || 0,
      starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      ends_at: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
      point_expire_days: Number(form.pointExpireDays) || 30,
      sort_order: Number(form.sortOrder) || 0,
      active: form.active,
    }

    const { error: err } = form.id
      ? await supabase.from('missions').update(payload).eq('id', form.id)
      : await supabase.from('missions').insert(payload)

    setSubmitting(false)
    if (err) { setError(err.message); return }
    resetForm()
    void load()
  }

  const toggleActive = async (m: Mission) => {
    await supabase.from('missions').update({ active: !m.active }).eq('id', m.id)
    void load()
  }

  const handleDelete = async () => {
    if (!confirmDel) return
    await supabase.from('missions').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    void load()
  }

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[22px] font-bold text-ink">활동 미션 관리</h1>
        {!showForm && (
          <Button variant="accent" size="sm" label="+ 새 미션"
            onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }} />
        )}
      </div>
      <p className="text-[13px] text-ink-soft mb-6">
        걷기·일기·라이브 시청 등 참여 활동을 여기서 만들고 켜고 끕니다. 코드 수정 없이 이벤트를 열고 닫을 수 있어요.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-rule rounded-card p-5 mb-8 bg-paper">
          <h2 className="text-[15px] font-bold text-ink mb-4">{form.id ? '미션 수정' : '새 미션 등록'}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">미션 키 *</span>
              <input className={inputCls} value={form.key} disabled={!!form.id}
                onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="walk_daily" />
              <span className="text-[11px] text-ink-faint">영문 소문자·언더바. 등록 후 변경 불가</span>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">미션 이름 *</span>
              <input className={inputCls} value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="걷고 포인트 받기" />
            </label>

            <label className="block md:col-span-2">
              <span className="text-[12px] font-semibold text-ink-soft">설명</span>
              <input className={inputCls} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="오늘 걸은 만큼 포인트를 드려요" />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">아이콘(이모지)</span>
              <input className={inputCls} value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="👟" />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">유형</span>
              <select className={inputCls} value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as Mission['type'] })}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">측정 지표</span>
              <select className={inputCls} value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}>
                {Object.entries(METRIC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">목표값 *</span>
              <input className={inputCls} type="number" value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })} placeholder="10000" />
            </label>

            <label className="block md:col-span-2">
              <span className="text-[12px] font-semibold text-ink-soft">구간 보상</span>
              <input className={inputCls} value={form.milestones}
                onChange={(e) => setForm({ ...form, milestones: e.target.value })}
                placeholder="1000:5, 5000:10, 10000:15" />
              <span className="text-[11px] text-ink-faint">
                “목표값:포인트” 쉼표 구분. 예) 1,000보 5P · 5,000보 10P · 10,000보 15P
              </span>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">기본 보상(P)</span>
              <input className={inputCls} type="number" value={form.rewardPoints}
                onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} />
              <span className="text-[11px] text-ink-faint">구간 보상이 없을 때 달성 시 지급</span>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">보상 부가설명</span>
              <input className={inputCls} value={form.rewardNote}
                onChange={(e) => setForm({ ...form, rewardNote: e.target.value })}
                placeholder="이달의 우수 사연 선정 시 선물 별도 지급" />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">하루 최대 지급 횟수</span>
              <input className={inputCls} type="number" value={form.maxPerDay}
                onChange={(e) => setForm({ ...form, maxPerDay: e.target.value })} />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">재지급 최소 간격(초)</span>
              <input className={inputCls} type="number" value={form.cooldownSec}
                onChange={(e) => setForm({ ...form, cooldownSec: e.target.value })} placeholder="60" />
              <span className="text-[11px] text-ink-faint">1분 체류형 미션은 60</span>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">시작일</span>
              <input className={inputCls} type="date" value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              <span className="text-[11px] text-ink-faint">비우면 상시</span>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">종료일</span>
              <input className={inputCls} type="date" value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">포인트 만료(일)</span>
              <input className={inputCls} type="number" value={form.pointExpireDays}
                onChange={(e) => setForm({ ...form, pointExpireDays: e.target.value })} />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ink-soft">정렬 순서</span>
              <input className={inputCls} type="number" value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </label>

            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className="text-[13px] text-ink">활성화 (체크하면 앱에 즉시 노출됩니다)</span>
            </label>
          </div>

          {error && <p className="text-[13px] text-signal-red mt-4">{error}</p>}

          <div className="flex gap-2 mt-5">
            <Button type="submit" variant="accent" size="sm" disabled={submitting}
              label={submitting ? '저장 중…' : '저장'} />
            <Button type="button" variant="inkOutline" size="sm" label="취소" onClick={resetForm} />
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-[13px] text-ink-soft">불러오는 중…</p>
      ) : missions.length === 0 ? (
        <p className="text-[13px] text-ink-soft">등록된 미션이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-rule text-ink-soft text-left">
                <th className="py-2.5 pr-3">상태</th>
                <th className="py-2.5 pr-3">미션</th>
                <th className="py-2.5 pr-3">유형</th>
                <th className="py-2.5 pr-3">지표·목표</th>
                <th className="py-2.5 pr-3">보상</th>
                <th className="py-2.5 pr-3">기간</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id} className="border-b border-rule/60">
                  <td className="py-3 pr-3">
                    <button onClick={() => void toggleActive(m)}
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        m.active ? 'bg-signal-green/15 text-signal-green' : 'bg-ink/10 text-ink-faint'
                      }`}>
                      {m.active ? '진행중' : '중지'}
                    </button>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-ink">{m.icon} {m.title}</div>
                    <div className="text-[11px] text-ink-faint">{m.key}</div>
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">{TYPE_LABEL[m.type]}</td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {METRIC_LABEL[m.metric] ?? m.metric} / {m.target_value.toLocaleString()}
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">
                    {m.milestones && m.milestones.length > 0
                      ? m.milestones.map((s) => `${s.value.toLocaleString()}→${s.points}P`).join(' · ')
                      : `${m.reward_points}P`}
                    {m.max_per_day > 1 && <span className="text-[11px] text-ink-faint"> (하루 {m.max_per_day}회)</span>}
                  </td>
                  <td className="py-3 pr-3 text-ink-soft text-[12px]">
                    {m.starts_at || m.ends_at
                      ? `${m.starts_at?.slice(0, 10) ?? ''} ~ ${m.ends_at?.slice(0, 10) ?? ''}`
                      : '상시'}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(m)} className="p-1.5 text-ink-soft hover:text-ink" title="수정">
                      <IconPencil size={16} />
                    </button>
                    <button onClick={() => setConfirmDel(m)} className="p-1.5 text-ink-soft hover:text-signal-red" title="삭제">
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmDel(null)}>
          <div className="bg-paper rounded-card p-5 max-w-[380px] w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-[14px] text-ink mb-1 font-semibold">미션을 삭제할까요?</p>
            <p className="text-[13px] text-ink-soft mb-4">
              “{confirmDel.title}”과 참여 기록이 함께 삭제됩니다. 잠시 멈추려면 삭제 대신 ‘중지’를 쓰세요.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="inkOutline" size="sm" label="취소" onClick={() => setConfirmDel(null)} />
              <Button variant="danger" size="sm" label="삭제" onClick={() => void handleDelete()} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
