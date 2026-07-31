import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { mergeGuestCartToServer } from './lib/cart'
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
import AppAddresses from './pages/AppAddresses'
import AppWishlist from './pages/AppWishlist'

// 법적 고지
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'
import Company from './pages/legal/Company'

// 파트너 인증/입점
import PartnerRegister from './pages/partner/Register'
import PartnerLogin from './pages/partner/Login'
import PartnerApply from './pages/partner/Apply'
import PartnerApplyComplete from './pages/partner/ApplyComplete'

// 파트너 전용 (RequireAuth + PartnerLayout)
import RequireAuth from './components/partner/RequireAuth'
import PartnerLayout from './components/partner/PartnerLayout'
import PartnerDashboard from './pages/partner/Dashboard'
import PartnerProducts from './pages/partner/Products'
import ProductDetail from './pages/partner/ProductDetail'
import ProductForm from './pages/partner/ProductForm'
import PartnerLives from './pages/partner/Lives'
import LiveForm from './pages/partner/LiveForm'
import LiveDetail from './pages/partner/LiveDetail'
import PartnerOrders from './pages/partner/Orders'
import PartnerSettlement from './pages/partner/Settlement'
import PartnerProfile from './pages/partner/Profile'

// 관리자
import RequireAdmin from './components/admin/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'
import AdminApplications from './pages/admin/Applications'
import AdminHome from './pages/admin/Home'
import AdminHosts from './pages/admin/Hosts'
import AdminCommissionTiers from './pages/admin/CommissionTiers'
import AdminHostSettlements from './pages/admin/HostSettlements'

// 진행자(라이브 호스트) 인증/전용 (RequireHostAuth + HostLayout)
import HostRegister from './pages/host/Register'
import HostLogin from './pages/host/Login'
import RequireHostAuth from './components/host/RequireHostAuth'
import HostLayout from './components/host/HostLayout'
import HostDashboard from './pages/host/Dashboard'
import HostLives from './pages/host/Lives'
import HostLiveSales from './pages/host/LiveSales'
import HostSettlementPage from './pages/host/Settlement'
import HostProfile from './pages/host/Profile'

// 구매자 라이브 (Supabase 연동)
import ShopLiveList from './pages/app/ShopLiveList'
import ShopLiveWatch from './pages/app/ShopLiveWatch'

export default function App() {
  // 로그인 시(카카오 포함) 게스트 장바구니를 서버 장바구니로 합친다.
  // 게스트 카트가 비어있으면 no-op이라 SIGNED_IN이 여러 번 떠도 안전.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void mergeGuestCartToServer()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 = 소비자 쇼핑 홈. B2B 소개 페이지는 /partners로 이동 */}
        <Route path="/" element={<AppHome />} />
        <Route path="/partners" element={<WebHome />} />
        <Route path="/proposal" element={<CompanyProposal />} />
        <Route path="/company" element={<CompanyIntro />} />

        {/* 법적 고지 */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<Company />} />

        {/* 입점: 회원가입 → 신청 → 완료 */}
        <Route path="/partner/register" element={<PartnerRegister />} />
        <Route path="/partner/login" element={<PartnerLogin />} />
        <Route path="/partner/apply" element={<PartnerApply />} />
        <Route path="/partner/apply/complete" element={<PartnerApplyComplete />} />

        {/* 파트너 전용 + 관리자 (로그인 필요) */}
        <Route element={<RequireAuth />}>
          <Route element={<PartnerLayout />}>
            <Route path="/partner/dashboard" element={<PartnerDashboard />} />
            <Route path="/partner/products" element={<PartnerProducts />} />
            <Route path="/partner/products/new" element={<ProductForm />} />
            <Route path="/partner/products/:id" element={<ProductDetail />} />
            <Route path="/partner/products/:id/edit" element={<ProductForm />} />
            <Route path="/partner/live" element={<PartnerLives />} />
            <Route path="/partner/live/new" element={<LiveForm />} />
            <Route path="/partner/live/:id/edit" element={<LiveForm />} />
            <Route path="/partner/live/:id" element={<LiveDetail />} />
            <Route path="/partner/orders" element={<PartnerOrders />} />
            <Route path="/partner/settlement" element={<PartnerSettlement />} />
            <Route path="/partner/profile" element={<PartnerProfile />} />
          </Route>
          {/* 관리자 라우트: 로그인(RequireAuth) 위에 is_admin() 검사(RequireAdmin)를 한 겹 더 */}
          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/applications" element={<AdminApplications />} />
              <Route path="/admin/home" element={<AdminHome />} />
              <Route path="/admin/hosts" element={<AdminHosts />} />
              <Route path="/admin/commission-tiers" element={<AdminCommissionTiers />} />
              <Route path="/admin/host-settlements" element={<AdminHostSettlements />} />
            </Route>
          </Route>
        </Route>

        {/* 진행자(라이브 호스트): 회원가입 → 승인 → 로그인 */}
        <Route path="/host/register" element={<HostRegister />} />
        <Route path="/host/login" element={<HostLogin />} />

        <Route element={<RequireHostAuth />}>
          <Route element={<HostLayout />}>
            <Route path="/host/dashboard" element={<HostDashboard />} />
            <Route path="/host/lives" element={<HostLives />} />
            <Route path="/host/live/:id" element={<HostLiveSales />} />
            <Route path="/host/settlement" element={<HostSettlementPage />} />
            <Route path="/host/profile" element={<HostProfile />} />
          </Route>
        </Route>

        {/* 앱 UI */}
        <Route path="/app" element={<Navigate to="/app/home" replace />} />
        <Route path="/app/home" element={<AppHome />} />
        {/* 라이브커머스: 관리자만 실제 화면, 일반 고객은 준비중 안내 */}
        {/* 라이브커머스 고객 오픈: 일반 구매자도 라이브를 볼 수 있게 개방(대표님 지시 2026-07-28).
            다시 관리자 전용으로 막으려면 각 라우트를 <LiveGate>…</LiveGate>로 감싸면 됨. */}
        <Route path="/app/live" element={<ShopLiveList />} />
        <Route path="/app/live/:id" element={<ShopLiveWatch />} />
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
        <Route path="/app/addresses" element={<AppAddresses />} />
        <Route path="/app/wishlist" element={<AppWishlist />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
