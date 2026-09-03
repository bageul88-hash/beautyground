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

// 하루를 8시간씩 3등분 — 아침 06~14시 · 점심 14~22시 · 저녁 22~06시(익일)(2026-09-04 대표님 확정).
export type TimeSlot = '아침' | '점심' | '저녁'

export function timeSlotByHour(hour: number): TimeSlot {
  if (hour >= 6 && hour < 14) return '아침'
  if (hour >= 14 && hour < 22) return '점심'
  return '저녁'
}

// 계절×시간대별로 지금 눈에 먼저 띄면 좋을 카테고리 — "지금 확인할 상품" 큐레이션의 우선순위로만 쓰인다
// (해당 카테고리 상품이 부족하면 계절 전체 → 전체 상품 순으로 자연스럽게 채워짐, 섹션이 비지 않음).
// products.category 값(한글 라벨)과 그대로 매칭 — src/constants/index.ts의 CATEGORIES.label 참고.
export const SEASON_TIMESLOT_CATEGORIES: Record<Season, Record<TimeSlot, string[]>> = {
  봄: {
    아침: ['스킨케어'],
    점심: ['메이크업'],
    저녁: ['바디케어'],
  },
  여름: {
    아침: ['스킨케어'],
    점심: ['향수', '메이크업'],
    저녁: ['바디케어'],
  },
  가을: {
    아침: ['스킨케어'],
    점심: ['메이크업'],
    저녁: ['헤어케어', '바디케어'],
  },
  겨울: {
    아침: ['스킨케어'],
    점심: ['메이크업'],
    저녁: ['바디케어', '뷰티 디바이스'],
  },
  추석: {
    아침: ['스킨케어'],
    점심: ['메이크업'],
    저녁: ['바디케어'],
  },
  설: {
    아침: ['스킨케어'],
    점심: ['메이크업'],
    저녁: ['바디케어'],
  },
}
