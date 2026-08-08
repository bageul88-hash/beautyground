import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { mergeGuestCartToServer } from './lib/cart'
import { logVisitOnce, syncAttributionToUser } from './lib/attribution'
import WebHome from './pages/WebHome'
import CompanyProposal from './pages/CompanyProposal'
import CompanyIntro from './pages/CompanyIntro'
import AppHome from './pages/AppHome'
import AppCategory from './pages/AppCategory'
import AppCategoryDetail from './pages/AppCategoryDetail'
import AppBrandDetail from './pages/AppBrandDetail'
import AppProductDetail from './pages/AppProductDetail'
import AppProductReviews from './pages/AppProductReviews'
import AppMyPage from './pages/AppMyPage'
import AppCart from './pages/AppCart'
import AppOrder from './pages/AppOrder'
import AppOrders from './pages/AppOrders'
import AppLogin from './pages/AppLogin'
import AppSignup from './pages/AppSignup'
import AppSignupEmail from './pages/AppSignupEmail'
import AppNaverCallback from './pages/AppNaverCallback'
import AppAccount from './pages/AppAccount'
import AppAddresses from './pages/AppAddresses'
import AppWishlist from './pages/AppWishlist'
import AppBenefits from './pages/AppBenefits'
import AppSkinTest from './pages/AppSkinTest'

// 법적 고지
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'
import Company from './pages/legal/Company'

// 관리자 — 매입 후 직접 판매하는 구조라 브랜드사가 직접 관리하는 파트너센터는 없음(2026-08-08 폐지)
import RequireAdmin from './components/admin/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'
import AdminHome from './pages/admin/Home'
import AdminHosts from './pages/admin/Hosts'
import AdminCommissionTiers from './pages/admin/CommissionTiers'
import AdminHostSettlements from './pages/admin/HostSettlements'
import AdminMembers from './pages/admin/Members'
import AdminOrders from './pages/admin/Orders'
import AdminProducts from './pages/admin/Products'
import AdminLives from './pages/admin/Lives'
import AdminCoupons from './pages/admin/Coupons'
import AdminMarketing from './pages/admin/Marketing'
import AdminTheme from './pages/admin/Theme'
import { useMallTheme } from './hooks/useMallTheme'

// 진행자(라이브 호스트) 인증/전용 (RequireHostAuth + RequireHost + HostLayout)
import HostRegister from './pages/host/Register'
import HostLogin from './pages/host/Login'
import RequireHostAuth from './components/host/RequireHostAuth'
import RequireHost from './components/host/RequireHost'
import HostLayout from './components/host/HostLayout'
import HostDashboard from './pages/host/Dashboard'
import HostLives from './pages/host/Lives'
import HostLiveSales from './pages/host/LiveSales'
import HostSettlementPage from './pages/host/Settlement'
import HostProfile from './pages/host/Profile'

// 구매자 라이브 (Supabase 연동)
import ShopLiveList from './pages/app/ShopLiveList'
import ShopLiveWatch from './pages/app/ShopLiveWatch'
import LiveGate from './components/app/LiveGate'

export default function App() {
  // 홈 테마(시그널 3색) — /admin/theme 저장값 또는 ?themePreview= 값을 CSS 변수로 적용
  useMallTheme()

  // 로그인 시(카카오 포함) 게스트 장바구니를 서버 장바구니로 합친다.
  // 게스트 카트가 비어있으면 no-op이라 SIGNED_IN이 여러 번 떠도 안전.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void mergeGuestCartToServer()
        void syncAttributionToUser()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 유입경로 방문 로그 — 광고/검색/SNS 어디서 들어왔는지 최초 1회 기록(마케팅 센터에서 집계).
  useEffect(() => { void logVisitOnce() }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 = 소비자 쇼핑 홈. /partners는 예전 라이브커머스 중심 B2B 랜딩페이지라(하위
            10개 컴포넌트 전체가 라이브 소개) 어디서도 링크하지 않고 관리자 전용으로 보존만 함(2026-07-31) */}
        <Route path="/" element={<AppHome />} />
        <Route path="/partners" element={<LiveGate><WebHome /></LiveGate>} />
        {/* /proposal은 전체가 "입점 브랜드 모집" 제안서라 온라인몰 공개범위에서 뺌(2026-07-31) — 관리자만 */}
        <Route path="/proposal" element={<LiveGate><CompanyProposal /></LiveGate>} />
        <Route path="/company" element={<CompanyIntro />} />

        {/* 법적 고지 */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<Company />} />

        {/* 관리자 (매입 후 직접 판매 구조라 브랜드사가 직접 로그인하는 파트너센터는 없음 — 2026-08-08 폐지) */}
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/home" element={<AdminHome />} />
            <Route path="/admin/hosts" element={<AdminHosts />} />
            <Route path="/admin/commission-tiers" element={<AdminCommissionTiers />} />
            <Route path="/admin/host-settlements" element={<AdminHostSettlements />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/lives" element={<AdminLives />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/marketing" element={<AdminMarketing />} />
            <Route path="/admin/theme" element={<AdminTheme />} />
          </Route>
        </Route>

        {/* 진행자(라이브 호스트): 회원가입 → 승인 → 로그인.
            라이브커머스를 온라인몰과 분리해 공개 노출하지 않기로 해(2026-07-31)
            링크가 없어도 직접 URL로 열리던 이 두 페이지도 관리자 전용으로 막음. */}
        <Route path="/host/register" element={<LiveGate><HostRegister /></LiveGate>} />
        <Route path="/host/login" element={<LiveGate><HostLogin /></LiveGate>} />

        <Route element={<RequireHostAuth />}>
          {/* RequireHost: 로그인만으로는 일반 고객도 URL 직접입력으로 페이지 껍데기가 열렸기에,
              hosts 테이블에 실제 본인 레코드가 있는지 한 번 더 확인 (2026-08-03 추가) */}
          <Route element={<RequireHost />}>
            <Route element={<HostLayout />}>
              <Route path="/host/dashboard" element={<HostDashboard />} />
              <Route path="/host/lives" element={<HostLives />} />
              <Route path="/host/live/:id" element={<HostLiveSales />} />
              <Route path="/host/settlement" element={<HostSettlementPage />} />
              <Route path="/host/profile" element={<HostProfile />} />
            </Route>
          </Route>
        </Route>

        {/* 앱 UI */}
        <Route path="/app" element={<Navigate to="/app/home" replace />} />
        <Route path="/app/home" element={<AppHome />} />
        {/* 라이브커머스: 온라인몰과 당분간 분리(대표님 지시 2026-07-31) — 관리자만 실제 화면,
            일반 고객은 준비중 안내. 7/28에 한 번 고객 개방했었으나 다시 막음. */}
        <Route path="/app/live" element={<LiveGate><ShopLiveList /></LiveGate>} />
        <Route path="/app/live/:id" element={<LiveGate><ShopLiveWatch /></LiveGate>} />
        <Route path="/app/category" element={<AppCategory />} />
        <Route path="/app/category/:id" element={<AppCategoryDetail />} />
        <Route path="/app/brand/:id" element={<AppBrandDetail />} />
        <Route path="/app/product/:id" element={<AppProductDetail />} />
        <Route path="/app/product/:id/reviews" element={<AppProductReviews />} />
        <Route path="/app/mypage" element={<AppMyPage />} />
        <Route path="/app/cart" element={<AppCart />} />
        <Route path="/app/order" element={<AppOrder />} />
        <Route path="/app/orders" element={<AppOrders />} />
        <Route path="/app/login" element={<AppLogin />} />
        <Route path="/app/signup" element={<AppSignup />} />
        <Route path="/app/signup/email" element={<AppSignupEmail />} />
        <Route path="/app/auth/naver/callback" element={<AppNaverCallback />} />
        <Route path="/app/account" element={<AppAccount />} />
        <Route path="/app/addresses" element={<AppAddresses />} />
        <Route path="/app/wishlist" element={<AppWishlist />} />
        <Route path="/app/benefits" element={<AppBenefits />} />
        <Route path="/app/skin-test" element={<AppSkinTest />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
