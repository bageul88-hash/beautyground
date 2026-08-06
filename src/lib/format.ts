// 숫자/금액 포맷 헬퍼

export const comma = (n: number | null | undefined): string =>
  (n ?? 0).toLocaleString('ko-KR')

export const won = (n: number | null | undefined): string => `${comma(n)}원`

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

// 방송 예고를 날짜별로 묶어 보여줄 때 쓰는 날짜 헤더용("8월 10일 (월)") — 시간은 뺀 날짜만.
export const formatDateOnly = (iso: string | null | undefined): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`
}

// 날짜 헤더 아래 각 방송 카드엔 시간만("오후 7:00") — 날짜는 헤더에 이미 있어 중복 표기 안 함.
export const formatTimeOnly = (iso: string | null | undefined): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// 같은 날짜(YYYY-MM-DD, 로컬 기준)로 그룹핑할 때 쓰는 키.
export const dateKey = (iso: string | null | undefined): string => {
  if (!iso) return 'unknown'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
