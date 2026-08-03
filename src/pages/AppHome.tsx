import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/layout/BottomNav'
import AppFooter from '../components/layout/AppFooter'
import KakaoPromoBar from '../components/home/KakaoPromoBar'
import HomeBody from '../components/home/HomeBody'
import DesktopHome from '../components/home/DesktopHome'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import { useViewMode } from '../lib/viewMode'
import { useHomeProductSections } from '../hooks/useHomeProductSections'
import { useShopCategories } from '../hooks/useShopCategories'
import { useHeroBanners } from '../hooks/useHeroBanners'
import { useCategoryThumbnails } from '../hooks/useCategoryThumbnails'

// ── 방향 계약 (DESIGN.md「생방송 슬레이트」) ──
// THESIS: 이 홈은 매장의 방송 편성표다. 카테고리가 늘 배송하는 "배너 캐러셀 + 상품 그리드"를
//   거부하고, 무엇이 지금 방송 중인지를 첫 줄에서 선언한다.
// OWN-WORLD: 흰 바탕 + 원색 3개(빨강=지금 / 파랑=확정 / 노랑=조건부). 면은 직각, 조작 요소만 4px,
//   그림자 없음, 구획은 1px 선. 숫자는 전부 폭 고정(tabular). 서체는 맑은고딕 400·700 두 단계.
// STORY: 라이브를 보다 들어온 첫 방문자가 "이 매장은 실재한다 → 상품을 본다"를 스크롤 없이 이해한다.
// FIRST VIEWPORT: 카카오 띠(흰 바탕+노랑 칩) → 헤더 → 히어로 이미지 + 하단 자막바(이름 왼쪽,
//   가격 오른쪽 정렬). (쇼핑몰·라이브 화면을 당분간 분리하기로 해 온에어 슬레이트는 뺌 — 2026-07-29)
// FORM: 도출한 7개 중 6번 "한국 생방송 그래픽" 배정(seed e97251df). 스테이징은 배정된 것 대신
//   방송 자막(lower third) 구조를 택했다 — 이미지 위에 글자를 얹지 않고 아래 흰 면에 얹는다.
export default function AppHome() {
  const navigate = useNavigate()
  const { products, recommended, loading: prodLoading } = useHomeProductSections()
  const { categories } = useShopCategories()
  const { banners } = useHeroBanners()
  const { thumbnails: categoryThumbnails } = useCategoryThumbnails()
  const { mode, isDesktop, toggle } = useViewMode()

  const goProduct = (id: string) => navigate(`/app/product/${id}`)
  const goCategory = (cat: string | null) =>
    navigate(cat ? `/app/category/all?cat=${encodeURIComponent(cat)}` : '/app/category/all')

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopHome
          banners={banners}
          categories={categories}
          categoryThumbnails={categoryThumbnails}
          recommended={recommended}
          products={products}
          prodLoading={prodLoading}
          onProductClick={goProduct}
          onCategoryClick={goCategory}
        />
      </>
    )
  }

  return (
    // PC에서도 모바일 앱처럼 가운데 고정 폭 프레임.
    // 프레임 바깥(quiet)은 페이지 배경이 아니라 앱 밖 여백이라 흰색이 아니어도 된다.
    // 프레임을 띄우는 그림자는 쓰지 않고 좌우 1px 선으로만 경계를 만든다(무그림자 규칙).
    <div className="min-h-screen bg-quiet md:py-6">
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border-x md:border-rule pb-24">
        {/* 상단 카카오톡 채널 추가 배너 (직각·좌측 스크롤) */}
        <KakaoPromoBar />
        <HomeBody
          marqueeItems={[]}
          banners={banners}
          categories={categories}
          categoryThumbnails={categoryThumbnails}
          recommended={recommended}
          products={products}
          prodLoading={prodLoading}
          onProductClick={(id) => navigate(`/app/product/${id}`)}
          onCategoryClick={(cat) =>
            navigate(cat ? `/app/category/all?cat=${encodeURIComponent(cat)}` : '/app/category/all')
          }
        />
        <AppFooter />
        <BottomNav />
      </div>
    </div>
  )
}
