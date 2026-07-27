import { Link } from 'react-router-dom'
import { COMPANY_INFO } from '../../lib/companyInfo'

// 앱(쇼핑몰) 하단 푸터 — 고객센터·사업자정보·법적 링크. 실제 쇼핑몰 수준으로 구성.
// 사업자정보는 전자상거래법상 소비자가 확인 가능해야 하므로 홈 스크롤 하단에 상시 노출.
// (중개자 면책문구는 넣지 않는다 — 뷰티그라운드는 통신판매업자로 직접 책임. PG 반려 이력 참고)
const bizDigits = COMPANY_INFO.bizNumber.replace(/-/g, '')
const FTC_URL = `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${bizDigits}`

const sep = <span className="text-black/15" aria-hidden="true">|</span>

export default function AppFooter() {
  return (
    <footer className="bg-cream-3 border-t border-cream-2">
      <div className="px-5 pt-7 pb-9">
        {/* 상단 링크 탭 */}
        <nav className="flex items-center gap-4 text-[13px] font-semibold text-text-sub pb-5 border-b border-black/[0.06]" aria-label="하단 메뉴">
          <Link to="/app/login" className="hover:text-text transition-colors">로그인</Link>
          {sep}
          <a href={`tel:${COMPANY_INFO.csPhone}`} className="hover:text-text transition-colors">고객센터</a>
          {sep}
          <Link to="/partner/apply" className="hover:text-text transition-colors">입점문의</Link>
        </nav>

        {/* 고객센터 강조 */}
        <div className="pt-5">
          <p className="text-[11px] text-text-hint tracking-wide">고객센터</p>
          <a href={`tel:${COMPANY_INFO.csPhone}`} className="block text-[24px] font-bold text-[#232f52] tracking-tight mt-0.5">
            {COMPANY_INFO.csPhone}
          </a>
          <p className="text-[12px] text-text-sub mt-1.5 leading-relaxed">
            주문·배송·상품 문의는 이메일로도 접수됩니다.
            <br />
            <a href={`mailto:${COMPANY_INFO.csEmail}`} className="text-text underline decoration-black/20 underline-offset-2">
              {COMPANY_INFO.csEmail}
            </a>
          </p>
        </div>

        {/* 사업자 정보 */}
        <div className="mt-7 pt-5 border-t border-black/[0.06] text-[11.5px] text-text-hint leading-[1.75]">
          <p className="text-text-sub font-semibold text-[12.5px] mb-1">{COMPANY_INFO.name}</p>
          <p>대표이사 {COMPANY_INFO.ceo} · 사업자등록번호 {COMPANY_INFO.bizNumber}</p>
          <p>
            통신판매업신고 {COMPANY_INFO.mailOrderNumber}{' '}
            <a
              href={FTC_URL}
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-block px-1.5 py-px rounded border border-black/10 text-[11px] text-text-sub hover:bg-black/[0.03] transition-colors"
            >
              사업자정보확인
            </a>
          </p>
          <p>주소 {COMPANY_INFO.address}</p>
          <p>호스팅제공자 Vercel Inc.</p>
        </div>

        {/* 법적 링크 */}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px]">
          <Link to="/terms" className="text-text-sub hover:text-text transition-colors">이용약관</Link>
          {sep}
          <Link to="/privacy" className="text-text font-semibold hover:text-gold transition-colors">개인정보처리방침</Link>
          {sep}
          <Link to="/company" className="text-text-sub hover:text-text transition-colors">회사소개</Link>
        </div>

        <p className="mt-6 text-[11px] text-text-hint/80">
          © 2026 {COMPANY_INFO.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
