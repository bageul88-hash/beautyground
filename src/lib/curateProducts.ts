// 상품 목록에서 한 브랜드가 너무 많이 몰려 보이지 않게 브랜드당 최대 개수를 제한한다.
// 순서(정렬 기준)는 그대로 유지하고, 한도를 넘긴 항목만 건너뛴다 — useHomeProductSections.ts의
// interleaveByBrand/curate(신상품·추천)와 별개로, 정렬 순서(할인율순 등)를 지켜야 하는
// 특가세일·카테고리별 추천 레일에 쓴다(2026-09-04 — 한 브랜드가 화면을 도배한다는 지적).
export function capPerBrand<T>(items: T[], brandKey: (item: T) => string, maxPerBrand: number): T[] {
  const count = new Map<string, number>()
  const out: T[] = []
  for (const item of items) {
    const key = brandKey(item)
    const used = count.get(key) ?? 0
    if (used >= maxPerBrand) continue
    count.set(key, used + 1)
    out.push(item)
  }
  return out
}
