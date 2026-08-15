import type { PeriodKey } from '../../lib/period'

const TABS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'thisMonth', label: '이번 달' },
  { key: 'lastMonth', label: '지난 달' },
  { key: 'custom', label: '직접 선택' },
]

const THEMES = {
  gold: {
    active: 'bg-[#1a1e36] text-white',
    inactive: 'bg-white text-[#9a9080] border border-[#e5e0d8]',
    input: 'border border-[#e5e0d8] bg-white text-[#111]',
  },
  navy: {
    active: 'bg-[#1a1e36] text-white',
    inactive: 'bg-white text-[#8b90ad] border border-[#d5d8e2]',
    input: 'border border-[#d5d8e2] bg-white text-[#1a1e36]',
  },
} as const

interface Props {
  value: PeriodKey
  customStart: string
  customEnd: string
  onChange: (key: PeriodKey) => void
  onCustomChange: (start: string, end: string) => void
  theme?: keyof typeof THEMES
}

// 브랜드 판매내역/백화점 판매실적 공용 기간 필터 — 전체/이번달/지난달/직접선택(날짜 범위).
export default function PeriodFilter({ value, customStart, customEnd, onChange, onCustomChange, theme = 'gold' }: Props) {
  const t = THEMES[theme]
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${
            value === tab.key ? t.active : t.inactive
          }`}
        >
          {tab.label}
        </button>
      ))}
      {value === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date" value={customStart}
            onChange={(e) => onCustomChange(e.target.value, customEnd)}
            className={`${t.input} rounded-md px-2.5 py-1.5 text-[12.5px]`}
          />
          <span className="text-[12px] text-[#9a9080]">~</span>
          <input
            type="date" value={customEnd}
            onChange={(e) => onCustomChange(customStart, e.target.value)}
            className={`${t.input} rounded-md px-2.5 py-1.5 text-[12.5px]`}
          />
        </div>
      )}
    </div>
  )
}
