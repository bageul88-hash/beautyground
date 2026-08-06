import { useMemo } from 'react'
import { useShopProducts, type ShopProduct } from './useShopProducts'

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

  const products = useMemo(() => curate(latestProducts, 10), [latestProducts])

  // 추천 상품: 신상품에 이미 나온 상품과 겹치지 않게 나머지 풀에서 동일한 카테고리×브랜드 로직으로 큐레이션
  const recommended = useMemo(() => {
    const shown = new Set(products.map((p) => p.id))
    return curate(latestProducts.filter((p) => !shown.has(p.id)), 10)
  }, [latestProducts, products])

  return { products, recommended, loading }
}
