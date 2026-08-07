import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ColorSwatchPicker from '../../components/common/ColorSwatchPicker'
import { DEFAULT_THEME, type MallTheme } from '../../hooks/useMallTheme'

// 홈 테마 설정 — 두 구역으로 나뉜다.
// ① 시그널 색상: 저장하면 지금 홈페이지에 즉시 적용되는 실색상.
// ② 모바일 시안 연습장(draft.html iframe): 새 홈 디자인 시안을 조정·문구 수정하고
//    [시안 저장]하면 home_settings.theme.draft 에 기록 → /draft.html 을 어디서 열어도 그 상태로 보인다.
const COLOR_FIELDS: Array<{ key: keyof MallTheme; label: string; role: string }> = [
  { key: 'signalRed', label: '시그널 레드', role: '지금 벌어지는 일 — 라이브 표시, 취소·경고' },
  { key: 'signalBlue', label: '시그널 블루', role: '확정된 정보·행동 — 버튼, 상태 칩, 링크 강조' },
  { key: 'signalYellow', label: '시그널 옐로', role: '조건부 혜택 — 쿠폰·적립 안내 띠' },
]

type DraftCfg = {
  color: { a1: string; a2: string; ink: string; chip: string } | null
  radius: string | null
  w: string | null
  texts: string[]
}

export default function AdminTheme() {
  const [theme, setTheme] = useState<Required<MallTheme>>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // 실제 홈 미리보기는 타이핑마다 새로고침되지 않게 300ms 디바운스
  const [previewTheme, setPreviewTheme] = useState<Required<MallTheme>>(DEFAULT_THEME)

  // 연습장(draft) — iframe이 postMessage로 보내주는 최신 상태
  const liveDraftRef = useRef<DraftCfg | null>(null)
  const savedDraftRef = useRef<DraftCfg | null>(null)
  const [draftDirty, setDraftDirty] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftMsg, setDraftMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('home_settings')
        .select('theme')
        .eq('id', 1)
        .maybeSingle()
      if (!error && data?.theme) {
        const saved = data.theme as MallTheme & { draft?: DraftCfg }
        setTheme({ ...DEFAULT_THEME, ...saved })
        setPreviewTheme({ ...DEFAULT_THEME, ...saved })
        if (saved.draft) savedDraftRef.current = saved.draft
      }
      if (error) {
        setMessage({
          kind: 'err',
          text: 'theme 컬럼을 찾지 못했습니다. supabase/home_theme.sql을 SQL Editor에서 한 번 실행해 주세요. (미리보기는 동작합니다)',
        })
      }
      setLoading(false)
    })()
  }, [])

  // 연습장 iframe → 부모창 상태 수신
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      const d = e.data as { type?: string; cfg?: DraftCfg }
      if (d?.type === 'bgDraftCfg' && d.cfg) {
        const changed = JSON.stringify(liveDraftRef.current) !== JSON.stringify(d.cfg)
        liveDraftRef.current = d.cfg
        if (changed && JSON.stringify(savedDraftRef.current) !== JSON.stringify(d.cfg)) setDraftDirty(true)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setPreviewTheme(theme), 300)
    return () => clearTimeout(t)
  }, [theme])

  const previewSrc = useMemo(
    () => `/?themePreview=${encodeURIComponent(JSON.stringify(previewTheme))}`,
    [previewTheme],
  )

  const isDefault =
    theme.signalRed === DEFAULT_THEME.signalRed &&
    theme.signalBlue === DEFAULT_THEME.signalBlue &&
    theme.signalYellow === DEFAULT_THEME.signalYellow

  // 시그널 색 + draft를 합쳐 theme jsonb 페이로드 구성 (서로를 지우지 않게 항상 병합)
  const buildPayload = (draft: DraftCfg | null) => {
    const base: Record<string, unknown> = {}
    if (!isDefault) {
      base.signalRed = theme.signalRed
      base.signalBlue = theme.signalBlue
      base.signalYellow = theme.signalYellow
    }
    if (draft) base.draft = draft
    return Object.keys(base).length > 0 ? base : null
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('home_settings')
      .update({ theme: buildPayload(savedDraftRef.current), updated_at: new Date().toISOString() })
      .eq('id', 1)
    setSaving(false)
    if (error) {
      setMessage({
        kind: 'err',
        text: `저장 실패: ${error.message} — theme 컬럼이 없다면 supabase/home_theme.sql을 먼저 실행해 주세요.`,
      })
    } else {
      setMessage({ kind: 'ok', text: '저장했습니다. 홈페이지에 바로 적용됩니다 (방문자는 새로고침 시 반영).' })
    }
  }

  const saveDraft = async () => {
    const draft = liveDraftRef.current
    if (!draft) return
    setDraftSaving(true)
    setDraftMsg(null)
    const { error } = await supabase
      .from('home_settings')
      .update({ theme: buildPayload(draft), updated_at: new Date().toISOString() })
      .eq('id', 1)
    setDraftSaving(false)
    if (error) {
      setDraftMsg({
        kind: 'err',
        text: `시안 저장 실패: ${error.message} — theme 컬럼이 없다면 supabase/home_theme.sql을 먼저 실행해 주세요.`,
      })
    } else {
      savedDraftRef.current = draft
      setDraftDirty(false)
      setDraftMsg({ kind: 'ok', text: '시안을 서버에 저장했습니다. 이제 /draft.html을 어디서 열어도 이 상태로 보입니다.' })
    }
  }

  const resetToDefault = () => {
    setTheme(DEFAULT_THEME)
    setMessage(null)
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-baseline justify-between max-w-[1040px]">
        <div>
          <h1 className="text-[20px] font-bold text-ink">홈 테마 설정</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            시그널 3색은 저장 즉시 실제 홈페이지에 적용됩니다. 아래 모바일 시안 연습장은 새 홈 디자인을
            실험하는 공간이며, [시안 저장]하면 서버에 기록되어 어디서든 같은 상태로 이어서 볼 수 있습니다.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`max-w-[1040px] mt-4 border px-4 py-3 text-[13px] ${
            message.kind === 'ok'
              ? 'border-signal-blue/30 bg-signal-blue/5 text-signal-blue'
              : 'border-signal-red/30 bg-signal-red/5 text-signal-red'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-8 mt-6 max-w-[1040px] items-start flex-wrap">
        {/* 색상 편집 */}
        <section className="flex-1 min-w-[320px] border border-rule">
          <div className="px-5 py-4 border-b border-rule">
            <p className="text-[14px] font-bold text-ink">시그널 색상 (실제 홈 즉시 적용)</p>
          </div>
          <div className="px-5">
            {COLOR_FIELDS.map(({ key, label, role }) => (
              <div key={key} className="flex items-center gap-4 py-4 border-b border-rule last:border-b-0">
                <ColorSwatchPicker
                  label={label}
                  value={theme[key]}
                  onChange={(hex) => setTheme((t) => ({ ...t, [key]: hex }))}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-ink">{label}</p>
                  <p className="text-[12px] text-ink-soft mt-0.5">{role}</p>
                </div>
                <span className="text-[12px] text-ink-faint font-mono">{theme[key].toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-rule flex gap-2">
            <button
              onClick={() => void save()}
              disabled={loading || saving}
              className="rounded-control bg-ink text-paper text-[13px] font-bold px-5 py-2.5 disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장하고 홈페이지에 적용'}
            </button>
            <button
              onClick={resetToDefault}
              disabled={loading || saving || isDefault}
              className="rounded-control border border-rule text-ink-soft text-[13px] font-bold px-4 py-2.5 disabled:opacity-40"
            >
              기본색으로
            </button>
          </div>
        </section>

        {/* 실제 홈 미리보기 */}
        <section className="border border-rule">
          <div className="px-5 py-4 border-b border-rule flex items-center justify-between gap-6">
            <p className="text-[14px] font-bold text-ink">미리보기 (실제 홈)</p>
            <a href={previewSrc} target="_blank" rel="noreferrer" className="text-[12px] text-signal-blue">
              새 탭에서 크게 보기
            </a>
          </div>
          <iframe
            title="홈 미리보기"
            src={previewSrc}
            className="block w-[400px] h-[680px] bg-paper"
          />
        </section>
      </div>

      {/* 모바일 시안 연습장 — draft.html을 관리자 안에서 편집하고 서버에 저장 */}
      <div className="max-w-[1040px] mt-10">
        <section className="border border-rule">
          <div className="px-5 py-4 border-b border-rule flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-ink">모바일 시안 연습장</p>
              <p className="text-[12px] text-ink-soft mt-0.5">
                포인트 컬러·라운드·굵기 조정과 ✏️ 텍스트 직접 수정 후 [시안 저장]을 누르면 서버에 기록됩니다.
                확정 조합을 알려주시면 실제 홈 구조에 반영합니다.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => void saveDraft()}
                disabled={draftSaving || !draftDirty}
                className="rounded-control bg-ink text-paper text-[13px] font-bold px-5 py-2.5 disabled:opacity-40"
              >
                {draftSaving ? '저장 중…' : draftDirty ? '시안 저장' : '시안 저장됨'}
              </button>
              <a href="/draft.html" target="_blank" rel="noreferrer" className="text-[12px] text-signal-blue">
                새 탭에서 크게 보기
              </a>
            </div>
          </div>
          {draftMsg && (
            <div
              className={`border-b px-5 py-2.5 text-[12.5px] ${
                draftMsg.kind === 'ok'
                  ? 'border-rule bg-signal-blue/5 text-signal-blue'
                  : 'border-rule bg-signal-red/5 text-signal-red'
              }`}
            >
              {draftMsg.text}
            </div>
          )}
          <iframe title="모바일 시안 연습장" src="/draft.html" className="block w-full h-[920px] bg-paper" />
        </section>
      </div>
    </div>
  )
}
