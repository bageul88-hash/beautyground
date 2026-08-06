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
import AppAccount from './pages/AppAccount'
import AppAddresses from './pages/AppAddresses'
import AppWishlist from './pages/AppWishlist'
import AppSkinTest from './pages/AppSkinTest'

// 법적 고지
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'
import Company from './pages/legal/Company'

// 파트너 인증/입점
import PartnerRegister from './pages/partner/Register'
import PartnerLogin from './pages/partner/Login'
import PartnerApply from './pages/partner/Apply'
import PartnerApplyComplete from './pages/partner/ApplyComplete'

// 파트너 전용 (RequireAuth + RequirePartner + PartnerLayout)
import RequireAuth from './components/partner/RequireAuth'
import RequirePartner from './components/partner/RequirePartner'
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
import AdminMembers from './pages/admin/Members'
import AdminMembershipTiers from './pages/admin/MembershipTiers'
import AdminOrders from './pages/admin/Orders'
import AdminProducts from './pages/admin/Products'
import AdminPartners from './pages/admin/Partners'
import AdminSettlements from './pages/admin/Settlements'
import AdminLives from './pages/admin/Lives'
import AdminCoupons from './pages/admin/Coupons'

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

        {/* 입점(신규 브랜드 모집)도 온라인몰과 분리해 비노출(2026-07-31) — 신청 관련 3개는
            관리자 전용으로 막고, 이미 입점된 브랜드가 계속 써야 하는 로그인만 열어둠 */}
        <Route path="/partner/register" element={<LiveGate><PartnerRegister /></LiveGate>} />
        <Route path="/partner/login" element={<PartnerLogin />} />
        <Route path="/partner/apply" element={<LiveGate><PartnerApply /></LiveGate>} />
        <Route path="/partner/apply/complete" element={<LiveGate><PartnerApplyComplete /></LiveGate>} />

        {/* 파트너 전용 + 관리자 (로그인 필요) */}
        <Route element={<RequireAuth />}>
          {/* RequirePartner: 로그인만으로는 일반 고객도 URL 직접입력으로 페이지 껍데기가 열렸기에,
              partners 테이블에 실제 본인 레코드가 있는지 한 번 더 확인 (2026-08-03 추가) */}
          <Route element={<RequirePartner />}>
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
          </Route>
          {/* 관리자 라우트: 로그인(RequireAuth) 위에 is_admin() 검사(RequireAdmin)를 한 겹 더 */}
          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/applications" element={<AdminApplications />} />
              <Route path="/admin/home" element={<AdminHome />} />
              <Route path="/admin/hosts" element={<AdminHosts />} />
              <Route path="/admin/commission-tiers" element={<AdminCommissionTiers />} />
              <Route path="/admin/host-settlements" element={<AdminHostSettlements />} />
              <Route path="/admin/members" element={<AdminMembers />} />
              <Route path="/admin/membership-tiers" element={<AdminMembershipTiers />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/partners" element={<AdminPartners />} />
              <Route path="/admin/settlements" element={<AdminSettlements />} />
              <Route path="/admin/lives" element={<AdminLives />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
            </Route>
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
        <Route path="/app/skin-test" element={<AppSkinTest />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
