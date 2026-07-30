import { useMemo } from 'react'
import { useShopProducts, type ShopProduct } from './useShopProducts'

// 홈의 "신상품"·"추천 상품" 두 레일을 채우는 로직 — 실제 구매자 화면(AppHome)과
// 관리자 미리보기(admin/Home)가 반드시 같은 결과를 내야 하므로 한 곳에 둔다.
// 전에는 관리자 미리보기가 최신순 원본 목록을 두 레일에 그대로(중복) 채워서
// 항상 스크롤이 되는 것처럼 보였는데, 실제 화면은 브랜드당 최대 2개로 걸러 두 레일에
// 나눠 담기 때문에 상품이 적을 땐 스크롤이 안 되는 게 정상이었다 — 미리보기가 거짓 정보였다.
export function useHomeProductSections() {
  const { products: latestProducts, loading } = useShopProducts({ sort: 'latest', pageSize: 40 })

  // 신상품: 한 브랜드가 향·옵션별로 여러 상품을 한꺼번에 등록해도 같은 썸네일로 도배되지 않게 브랜드당 최대 2개
  const products = useMemo(() => {
    const perBrand = new Map<string, number>()
    const out: ShopProduct[] = []
    for (const p of latestProducts) {
      const key = p.brand_name ?? p.id
      const n = perBrand.get(key) ?? 0
      if (n >= 2) continue
      perBrand.set(key, n + 1)
      out.push(p)
      if (out.length >= 10) break
    }
    return out
  }, [latestProducts])

  // 추천 상품: 신상품에 이미 나온 상품과 겹치지 않게 나머지 중에서 브랜드당 최대 2개
  // (별도 추천 로직·관리자 큐레이션은 아직 없음 — 우선 신상품과 안 겹치는 실제 판매중 상품으로 채움)
  const recommended = useMemo(() => {
    const shown = new Set(products.map((p) => p.id))
    const perBrand = new Map<string, number>()
    const out: ShopProduct[] = []
    for (const p of latestProducts) {
      if (shown.has(p.id)) continue
      const key = p.brand_name ?? p.id
      const n = perBrand.get(key) ?? 0
      if (n >= 2) continue
      perBrand.set(key, n + 1)
      out.push(p)
      if (out.length >= 10) break
    }
    return out
  }, [latestProducts, products])

  return { products, recommended, loading }
}
