import type { DeptKey } from '../../types'

interface BadgeProps {
  type: 'live' | 'dept' | 'age' | 'tag' | 'vip'
  label: string
  deptKey?: DeptKey
  className?: string
}

const DEPT_BADGE_COLORS: Record<DeptKey, string> = {
  lotte: 'bg-[#FAECE7] text-[#712B13]',
  shinsegae: 'bg-[#E1F5EE] text-[#085041]',
  hyundai: 'bg-[#EEEDFE] text-[#3C3489]',
}

export default function Badge({ type, label, deptKey, className = '' }: BadgeProps) {
  let classes = ''

  if (type === 'live') {
    classes = 'bg-signal-red text-paper text-[9px] font-bold px-2 py-0.5 rounded-control tracking-wider'
  } else if (type === 'dept' && deptKey) {
    // 백화점별 실제 브랜드 색 — 우리 시스템 색이 아니라 파트너사(롯데·신세계·현대) 고유색이라 예외
    classes = `${DEPT_BADGE_COLORS[deptKey]} text-[11px] font-bold px-2.5 py-1 rounded-control`
  } else if (type === 'vip') {
    classes = 'bg-ink text-paper text-[10px] font-bold px-2.5 py-0.5 rounded-control'
  } else if (type === 'age') {
    classes = 'bg-quiet text-ink-soft text-[11px] font-bold px-2.5 py-1 rounded-control'
  } else {
    classes = 'bg-quiet text-ink-soft text-[12px] px-3 py-1 rounded-control'
  }

  return (
    <span className={[classes, className].join(' ')} aria-label={label}>
      {label}
    </span>
  )
}
