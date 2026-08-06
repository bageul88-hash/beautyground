export type Season = '봄' | '여름' | '가을' | '겨울' | '추석' | '설'

export const SEASONS: Season[] = ['봄', '여름', '가을', '겨울', '추석', '설']

// 명절(추석·설)은 음력 기준이라 달력 월로 자동 계산할 수 없어 관리자가 그 기간에만 수동으로 켠다.
// 그 외 4계절은 달력 월 기준 자동 판정을 기본값으로 쓴다.
export function autoSeasonByMonth(month: number): Season {
  if (month === 12 || month === 1 || month === 2) return '겨울'
  if (month >= 3 && month <= 5) return '봄'
  if (month >= 6 && month <= 8) return '여름'
  return '가을'
}

export function resolveActiveSeason(override: string | null | undefined): Season {
  if (override && (SEASONS as string[]).includes(override)) return override as Season
  return autoSeasonByMonth(new Date().getMonth() + 1)
}
