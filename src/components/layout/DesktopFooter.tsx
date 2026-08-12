import { Link } from 'react-router-dom'
import { COMPANY_INFO } from '../../lib/companyInfo'

// PC 전용 공용 푸터 — 모바일 AppFooter와 내용은 완전히 동일(사업자정보는 통신판매업자로서
// 상시 노출 의무가 있어 PC에서만 안 보이면 안 됨, PG 재심사 대응으로 이미 정정된 문구를
// 그대로 재사용). 폭만 넓은 화면에 맞춰 다단으로 배치(2026-08-06).
const bizDigits = COMPANY_INFO.bizNumber.replace(/-/g, '')
const FTC_URL = `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${bizDigits}`

const sep = <span className="text-rule" aria-hidden="true">|</span>

export default function DesktopFooter() {
  return (
    <footer className="bg-paper border-t border-rule">
      <div className="max-w-[1920px] mx-auto px-6 pt-10 pb-12">
        <nav className="flex items-center gap-4 text-[13px] font-semibold text-ink-soft pb-6 border-b border-rule" aria-label="하단 메뉴">
          <Link to="/app/login" className="hover:text-ink transition-colors">로그인</Link>
          {sep}
          <a href={`tel:${COMPANY_INFO.csPhone}`} className="hover:text-ink transition-colors">고객센터</a>
        </nav>

        <div className="mt-6 grid grid-cols-2 gap-10">
          <div className="text-[11.5px] text-ink-faint leading-[1.75]">
            <p className="text-ink-soft font-semibold text-[12.5px] mb-1">{COMPANY_INFO.name}</p>
            <p>대표이사 {COMPANY_INFO.ceo} · 사업자등록번호 {COMPANY_INFO.bizNumber}</p>
            <p>
              통신판매업신고 {COMPANY_INFO.mailOrderNumber}{' '}
              <a
                href={FTC_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-1 inline-block px-1.5 py-px border border-rule text-[11px] text-ink-soft hover:bg-quiet transition-colors"
              >
                사업자정보확인
              </a>
            </p>
            <p>주소 {COMPANY_INFO.address}</p>
            <p>호스팅제공자 Vercel Inc.</p>
          </div>

          <div className="text-[11.5px] text-ink-faint leading-[1.75]">
            <p className="text-ink-soft font-semibold text-[12.5px] mb-1">고객센터</p>
            <p>
              <a href={`tel:${COMPANY_INFO.csPhone}`} className="text-ink-soft">{COMPANY_INFO.csPhone}</a>
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px]">
          <Link to="/terms" className="text-ink-soft hover:text-ink transition-colors">이용약관</Link>
          {sep}
          <Link to="/privacy" className="text-ink font-semibold hover:text-ink transition-colors">개인정보처리방침</Link>
          {sep}
          <Link to="/company" className="text-ink-soft hover:text-ink transition-colors">회사소개</Link>
        </div>

        <p className="mt-6 text-[11px] text-ink-faint/80">
          © 2026 {COMPANY_INFO.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
