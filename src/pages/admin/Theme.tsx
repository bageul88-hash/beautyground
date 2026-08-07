import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ColorSwatchPicker from '../../components/common/ColorSwatchPicker'
import { DEFAULT_THEME, type MallTheme } from '../../hooks/useMallTheme'

// 홈 테마 설정 — 시그널 3색을 골라 저장하면 홈페이지 전체(라이브 표시·버튼·혜택 칩)에
// 재배포 없이 즉시 적용된다. 오른쪽 미리보기는 실제 홈(/)을 임시 색으로 띄운 것.
const COLOR_FIELDS: Array<{ key: keyof MallTheme; label: string; role: string }> = [
  { key: 'signalRed', label: '시그널 레드', role: '지금 벌어지는 일 — 라이브 표시, 취소·경고' },
  { key: 'signalBlue', label: '시그널 블루', role: '확정된 정보·행동 — 버튼, 상태 칩, 링크 강조' },
  { key: 'signalYellow', label: '시그널 옐로', role: '조건부 혜택 — 쿠폰·적립 안내 띠' },
]

export default function AdminTheme() {
  const [theme, setTheme] = useState<Required<MallTheme>>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // 미리보기 iframe은 타이핑마다 새로고침되지 않게 300ms 디바운스
  const [previewTheme, setPreviewTheme] = useState<Required<MallTheme>>(DEFAULT_THEME)

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('home_settings')
        .select('theme')
        .eq('id', 1)
        .maybeSingle()
      if (!error && data?.theme) {
        const saved = data.theme as MallTheme
        setTheme({ ...DEFAULT_THEME, ...saved })
        setPreviewTheme({ ...DEFAULT_THEME, ...saved })
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

  const save = async () => {
    setSaving(true)
    setMessage(null)
    // 기본색 그대로면 null 저장(=기본색 사용)으로 깔끔하게 비운다
    const payload = isDefault ? null : theme
    const { error } = await supabase
      .from('home_settings')
      .update({ theme: payload, updated_at: new Date().toISOString() })
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
            시그널 3색을 바꿔 저장하면 재배포 없이 홈페이지 전체에 적용됩니다. 색은 사실을 말할 때만 켜집니다 —
            역할이 섞이지 않게 3색의 대비를 유지해 주세요.
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
            <p className="text-[14px] font-bold text-ink">시그널 색상</p>
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
    </div>
  )
}
