// 기간 필터 계산 — 브랜드 판매내역/백화점 판매실적 공용.
export type PeriodKey = 'all' | 'thisMonth' | 'lastMonth' | 'custom'

export interface PeriodRange {
  start: string | null // ISO, inclusive
  end: string | null // ISO, exclusive
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function computePeriodRange(key: PeriodKey, customStart?: string, customEnd?: string): PeriodRange {
  const now = new Date()
  if (key === 'thisMonth') {
    const start = startOfMonth(now)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return { start: start.toISOString(), end: end.toISOString() }
  }
  if (key === 'lastMonth') {
    const thisStart = startOfMonth(now)
    const start = new Date(thisStart.getFullYear(), thisStart.getMonth() - 1, 1)
    return { start: start.toISOString(), end: thisStart.toISOString() }
  }
  if (key === 'custom') {
    const start = customStart ? new Date(`${customStart}T00:00:00`).toISOString() : null
    // end는 배타적 경계라 선택한 날짜의 "다음 날 0시"로 — 그래야 종료일 당일 데이터가 포함된다.
    const end = customEnd ? new Date(new Date(`${customEnd}T00:00:00`).getTime() + 86400000).toISOString() : null
    return { start, end }
  }
  return { start: null, end: null }
}

export function inRange(createdAt: string, range: PeriodRange): boolean {
  if (range.start && createdAt < range.start) return false
  if (range.end && createdAt >= range.end) return false
  return true
}
