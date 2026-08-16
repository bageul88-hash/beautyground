import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { mergeGuestCartToServer } from './lib/cart'
import { logVisitOnce, syncAttributionToUser } from './lib/attribution'
import CompanyIntro from './pages/CompanyIntro'
import Export from './pages/Export'
import AppHome from './pages/AppHome'
import AppCategory from './pages/AppCategory'
import AppSearch from './pages/AppSearch'
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
import AdminPartners from './pages/admin/Partners'
import AdminPartnerSettlements from './pages/admin/PartnerSettlements'
import AdminDeptAccounts from './pages/admin/DeptAccounts'
import AdminMembers from './pages/admin/Members'
import AdminOrders from './pages/admin/Orders'
import AdminProducts from './pages/admin/Products'
import AdminLives from './pages/admin/Lives'
import AdminCoupons from './pages/admin/Coupons'
import AdminExportInquiries from './pages/admin/ExportInquiries'
import AdminExportBuyers from './pages/admin/ExportBuyers'
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

// 브랜드사(파트너) 읽기 전용 포털 (RequireBrandAuth + RequireBrand + BrandLayout)
import BrandLogin from './pages/brand/Login'
import BrandRegister from './pages/brand/Register'
import BrandExportRegister from './pages/brand/ExportRegister'
import RequireBrandAuth from './components/brand/RequireBrandAuth'
import RequireBrand from './components/brand/RequireBrand'
import RequireBrandOrExportContact from './components/brand/RequireBrandOrExportContact'
import BrandLayout from './components/brand/BrandLayout'
import BrandDashboard from './pages/brand/Dashboard'
import BrandLiveSales from './pages/brand/LiveSales'
import BrandSettlement from './pages/brand/Settlement'
import BrandExport from './pages/brand/Export'

// 백화점 담당자 포털 (RequireDeptAuth + RequireDept) — 2026-08-15: 코드 게이트 대신 지점별 계정 로그인
import DeptLogin from './pages/dept/Login'
import DeptRegister from './pages/dept/Register'
import RequireDeptAuth from './components/dept/RequireDeptAuth'
import RequireDept from './components/dept/RequireDept'
import DeptSales from './pages/dept/Sales'
import DeptLives from './pages/dept/Lives'

// 구매자 라이브 (Supabase 연동)
import LiveMain from './pages/LiveMain'
import LiveSchedule from './pages/LiveSchedule'
import ShopLiveWatch from './pages/app/ShopLiveWatch'
import LiveGate from './components/app/LiveGate'
import ScrollRestoration from './components/layout/ScrollRestoration'

export default function App() {
  // 홈 테마(시그널 3색) — /admin/theme 저장값 또는 ?themePreview= 값을 CSS 변수로 적용
  useMallTheme()

  // 신규 가입 환영 안내 — 카카오 OAuth는 콜백 후 바로 앱으로 돌아와 "가입이 된 건지" 알 수 없다는
  // 매장 직원 피드백(2026-08-13)으로 추가. 계정 생성 5분 이내의 첫 SIGNED_IN에서 1회만 노출.
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null)

  // 로그인 시(카카오 포함) 게스트 장바구니를 서버 장바구니로 합친다.
  // 게스트 카트가 비어있으면 no-op이라 SIGNED_IN이 여러 번 떠도 안전.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        void mergeGuestCartToServer()
        void syncAttributionToUser()

        const user = session?.user
        if (user?.created_at) {
          const isNew = Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000
          const shownKey = `bg_welcome_shown:${user.id}`
          if (isNew && !localStorage.getItem(shownKey)) {
            localStorage.setItem(shownKey, '1')
            setWelcomeToast('회원가입이 완료되었습니다. 환영합니다! 🎉')
            setTimeout(() => setWelcomeToast(null), 4000)
          }
        }
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 유입경로 방문 로그 — 광고/검색/SNS 어디서 들어왔는지 최초 1회 기록(마케팅 센터에서 집계).
  useEffect(() => { void logVisitOnce() }, [])

  return (
    <BrowserRouter>
      <ScrollRestoration />
      {welcomeToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 top-5 z-[100] rounded-pill bg-ink text-paper text-[14px] font-bold px-5 py-3 shadow-card"
          role="status"
        >
          {welcomeToast}
        </div>
      )}
      <Routes>
        {/* 메인 = 소비자 쇼핑 홈. /partners·/proposal(예전 "입점 브랜드 모집" B2B 랜딩페이지)은
            매입 후 직접 판매하는 구조로 확정되며 완전 삭제(2026-08-10) — PG(NHN KCP) 심사에서
            "중개플랫폼"으로 오인되는 근거가 될 수 있었음. */}
        <Route path="/" element={<AppHome />} />
        <Route path="/company" element={<CompanyIntro />} />
        {/* 해외 바이어용 영문 카탈로그+문의 페이지 — beautyground가 직접 수출자(재판매자)로서
            보유 브랜드를 제안하는 채널. 브랜드 입점신청(중개 성격)과는 다름(2026-08-15). */}
        <Route path="/export" element={<Export />} />

        {/* 법적 고지 */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<Company />} />

        {/* 관리자 (매입 후 직접 판매 구조라 브랜드사가 상품/방송을 직접 등록하는 파트너센터는 없음 — 2026-08-08 폐지.
            단 브랜드가 자기 판매실적·정산만 읽기 전용으로 보는 /brand/* 포털은 별도로 존재 — 아래 참조) */}
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/home" element={<AdminHome />} />
            <Route path="/admin/hosts" element={<AdminHosts />} />
            <Route path="/admin/commission-tiers" element={<AdminCommissionTiers />} />
            <Route path="/admin/host-settlements" element={<AdminHostSettlements />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/partner-settlements" element={<AdminPartnerSettlements />} />
            <Route path="/admin/dept-accounts" element={<AdminDeptAccounts />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/lives" element={<AdminLives />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/export-inquiries" element={<AdminExportInquiries />} />
            <Route path="/admin/export-buyers" element={<AdminExportBuyers />} />
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

        {/* 브랜드사(파트너) — 읽기 전용 포털. 상품/방송 등록 권한은 없음(그건 폐지된 파트너센터의
            영역), 자기 라이브 판매실적·정산만 조회(2026-08-15). 자체 회원가입 없음 — 계정은
            관리자가 /admin/partners에서 이메일로 연결.
            /brand/export는 판매 파트너 계정뿐 아니라 "수출 전용 계정"(export_contacts)도 접근
            가능 — 단, 수출 전용 계정은 대시보드/판매내역/정산내역(RequireBrand, 판매 파트너만)에는
            접근할 수 없다(2026-08-16, 라이브 판매실적 비공개 원칙). */}
        <Route path="/brand/login" element={<BrandLogin />} />
        <Route path="/brand/register/:id" element={<BrandRegister />} />
        <Route path="/brand/export-register/:id" element={<BrandExportRegister />} />
        <Route element={<RequireBrandAuth />}>
          <Route element={<BrandLayout />}>
            <Route element={<RequireBrand />}>
              <Route path="/brand/dashboard" element={<BrandDashboard />} />
              <Route path="/brand/sales" element={<BrandLiveSales />} />
              <Route path="/brand/settlement" element={<BrandSettlement />} />
            </Route>
            <Route element={<RequireBrandOrExportContact />}>
              <Route path="/brand/export" element={<BrandExport />} />
            </Route>
          </Route>
        </Route>

        {/* 앱 UI */}
        <Route path="/app" element={<Navigate to="/app/home" replace />} />
        <Route path="/app/home" element={<AppHome />} />
        {/* 2026-08-12 대표님 지시로 재구축 — 젠스파크 디자인 기준, 실데이터 바로 연결.
            게이트 없이 공개(온라인몰 메인과 별개의 독립 진입점). */}
        <Route path="/live" element={<LiveMain />} />
        <Route path="/live/schedule" element={<LiveSchedule />} />
        {/* 백화점 지역 담당자용 — 지점별 계정 로그인(2026-08-15, 예전 코드 게이트 대체) */}
        <Route path="/dept/login" element={<DeptLogin />} />
        <Route path="/dept/register/:id" element={<DeptRegister />} />
        <Route path="/dept/register" element={<DeptRegister />} />
        <Route element={<RequireDeptAuth />}>
          <Route element={<RequireDept />}>
            <Route path="/dept/sales" element={<DeptSales />} />
            <Route path="/dept/lives" element={<DeptLives />} />
          </Route>
        </Route>
        <Route path="/app/live/:id" element={<LiveGate><ShopLiveWatch /></LiveGate>} />
        <Route path="/app/category" element={<AppCategory />} />
        <Route path="/app/search" element={<AppSearch />} />
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
        {/* 이메일 가입 버튼은 뺐지만(2026-08-15, 카카오만 신규가입), URL 직접 접근으로
            새 이메일 계정이 만들어지는 뒷문을 막기 위해 라우트 자체를 리다이렉트 —
            AppSignupEmail.tsx 코드는 나중에 되살릴 수 있게 남겨둠. */}
        <Route path="/app/signup/email" element={<Navigate to="/app/signup" replace />} />
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
