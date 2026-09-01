import DesktopShopBody from './DesktopShopBody'
import type { HeroBanner } from '../../hooks/useHeroBanners'
import type { ShopProduct } from '../../hooks/useShopProducts'

// 2026-09-02 — 홈이 커뮤니티가 되면서 기존 PC 홈의 상품 화면을 그대로 이 '쇼핑' 탭에서 보여준다.
// 카테고리 목록은 DesktopShopBody 안의 CategoryRecommend 가 담당하므로 여기서 따로 그리지 않는다.
interface Props {
  banners: HeroBanner[]
  categories: string[]
  recommended: ShopProduct[]
  seasonLabel: string | null
  products: ShopProduct[]
  prodLoading: boolean
  saleProducts: ShopProduct[]
  saleLoading: boolean
  onProductClick: (id: string) => void
}


// PC 버전 — 카테고리 목록. 모바일의 세로 리스트를 넓은 화면에서는 카드 그리드로 펼친다.
// 원형·색 아이콘은 이 시스템에서 프로필/온에어 표시등에만 허용되므로 잉크 한 색 텍스트 카드로 유지.
export default function DesktopCategory(props: Props) {
  return <DesktopShopBody {...props} />
}
