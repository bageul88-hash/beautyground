import { useMemo } from 'react'
import { useShopProducts, type ShopProduct } from './useShopProducts'
import { useHomeSettings } from './useHomeSettings'
import { timeSlotByHour, SEASON_TIMESLOT_CATEGORIES, type Season } from '../lib/season'

// "지금 확인할 상품"에 계절 태그가 붙은 상품이 이만큼 이상 있어야 계절 추천으로 노출한다.
// 너무 적으면(1~2개) "추천"이라 부르기 민망해서 그냥 평소 큐레이션으로 대체한다.
const MIN_SEASONAL_FOR_LABEL = 4

// 홈의 "신상품"·"추천 상품" 두 레일을 채우는 로직 — 실제 구매자 화면(AppHome)과
// 관리자 미리보기(admin/Home)가 반드시 같은 결과를 내야 하므로 한 곳에 둔다.
//
// 예전엔 브랜드당 최대 2개로만 걸렀는데, 한 브랜드가 향/옵션별로 여러 상품을 연달아
// 등록하면 "브랜드당 2개"는 지켜져도 그 2개가 나란히 붙어 사진까지 비슷해 보여
// 큐레이션이 아니라 "그냥 최신순 나열"처럼 읽혔다. 게다가 브랜드만 분산시키고
// 카테고리(스킨케어/메이크업/향수 등)는 전혀 안 섞여서, 최근 등록이 특정 카테고리에
// 몰리면 그 카테고리만 계속 나오는 문제도 있었다(2026-08-06, 대표님 지적).
// → 카테고리 → 브랜드 2단 라운드로빈으로 최신순을 유지하되 같은 브랜드·같은 카테고리가
//   연달아 나오지 않게 섞는다.
const MAX_PER_BRAND = 2

function interleaveByBrand(list: ShopProduct[]): ShopProduct[] {
  const byBrand = new Map<string, ShopProduct[]>()
  const brandOrder: string[] = []
  for (const p of list) {
    const key = p.brand_name ?? p.id
    if (!byBrand.has(key)) {
      byBrand.set(key, [])
      brandOrder.push(key)
    }
    byBrand.get(key)!.push(p)
  }
  const out: ShopProduct[] = []
  let remaining = true
  while (remaining) {
    remaining = false
    for (const key of brandOrder) {
      const bucket = byBrand.get(key)!
      if (bucket.length === 0) continue
      out.push(bucket.shift()!)
      if (bucket.length > 0) remaining = true
    }
  }
  return out
}

// 카테고리별로 묶고(최신 등장 순서 유지) → 각 카테고리 안에서 브랜드 라운드로빈 →
// 카테고리끼리도 라운드로빈으로 한 장씩 뽑는다. 브랜드당 전체 개수는 MAX_PER_BRAND로 제한.
function curate(pool: ShopProduct[], targetCount: number): ShopProduct[] {
  const byCategory = new Map<string, ShopProduct[]>()
  const categoryOrder: string[] = []
  for (const p of pool) {
    const key = p.category ?? '기타'
    if (!byCategory.has(key)) {
      byCategory.set(key, [])
      categoryOrder.push(key)
    }
    byCategory.get(key)!.push(p)
  }
  const queues = new Map(categoryOrder.map((c) => [c, interleaveByBrand(byCategory.get(c)!)]))

  const out: ShopProduct[] = []
  const brandCount = new Map<string, number>()
  let remaining = true
  while (remaining && out.length < targetCount) {
    remaining = false
    for (const cat of categoryOrder) {
      if (out.length >= targetCount) break
      const queue = queues.get(cat)!
      while (queue.length > 0) {
        const candidate = queue[0]
        const brandKey = candidate.brand_name ?? candidate.id
        const count = brandCount.get(brandKey) ?? 0
        if (count >= MAX_PER_BRAND) {
          queue.shift() // 이 브랜드는 한도 초과 — 버리고 다음 후보
          continue
        }
        queue.shift()
        brandCount.set(brandKey, count + 1)
        out.push(candidate)
        break
      }
      if (queue.length > 0) remaining = true
    }
  }
  return out
}

export function useHomeProductSections() {
  const { products: latestProducts, loading } = useShopProducts({ sort: 'latest', pageSize: 60 })
  const { activeSeason } = useHomeSettings()

  const products = useMemo(() => curate(latestProducts, 10), [latestProducts])

  // 추천 상품: 신상품에 이미 나온 상품과 겹치지 않는 나머지 풀에서 우선 계절 태그가 맞는 상품을
  // 큐레이션하고, 부족한 자리만 평소 로직(카테고리×브랜드 큐레이션)으로 채운다.
  // 계절 태그가 없는 상품이 대다수라 태그된 게 너무 적으면(신뢰 있는 "추천"이 아니라) 조용히
  // 평소 로직으로 대체한다 — season 라벨이 null이면 화면에도 "계절 추천"이라 안 붙인다.
  const { recommended, seasonLabel } = useMemo(() => {
    const shown = new Set(products.map((p) => p.id))
    const pool = latestProducts.filter((p) => !shown.has(p.id))
    const seasonal = pool.filter((p) => p.seasonTags.includes(activeSeason))

    if (seasonal.length < MIN_SEASONAL_FOR_LABEL) {
      return { recommended: curate(pool, 10), seasonLabel: null as string | null }
    }

    // 지금 시간대(아침/점심/저녁)에 어울리는 카테고리를 우선 노출 — 부족하면 계절 전체로,
    // 그래도 부족하면 전체 상품으로 자연스럽게 채운다(섹션이 비지 않게, 2026-09-04).
    const timeSlot = timeSlotByHour(new Date().getHours())
    const timeCategories = SEASON_TIMESLOT_CATEGORIES[activeSeason as Season][timeSlot]
    const seasonalNow = seasonal.filter((p) => p.category && timeCategories.includes(p.category))
    const seasonalPool = seasonalNow.length >= MIN_SEASONAL_FOR_LABEL ? seasonalNow : seasonal

    const curatedSeasonal = curate(seasonalPool, 10)
    if (curatedSeasonal.length >= 10) {
      return { recommended: curatedSeasonal, seasonLabel: activeSeason as string | null }
    }
    const shownIds = new Set(curatedSeasonal.map((p) => p.id))
    // 시간대로 좁힌 풀이 모자라면 나머지 계절 상품으로, 그래도 모자라면 전체 상품으로 채운다.
    const seasonFill = seasonalPool === seasonal ? [] : curate(seasonal.filter((p) => !shownIds.has(p.id)), 10 - curatedSeasonal.length)
    seasonFill.forEach((p) => shownIds.add(p.id))
    const generalFill = curate(pool.filter((p) => !shownIds.has(p.id)), 10 - curatedSeasonal.length - seasonFill.length)
    return { recommended: [...curatedSeasonal, ...seasonFill, ...generalFill], seasonLabel: activeSeason as string | null }
  }, [latestProducts, products, activeSeason])

  return { products, recommended, seasonLabel, loading }
}
