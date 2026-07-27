import { COMPANY_INFO } from '../../lib/companyInfo'

// 결제(PG) 심사 등에서 사업자 정보를 스크롤 없이 바로 확인할 수 있도록 첫 화면 최상단에 노출.
// Footer에도 동일 정보가 있으나, 여기는 요약(상호/대표/사업자등록번호/통신판매업신고번호)만.
export default function TopInfoBar() {
  return (
    <div className="bg-cream border-b border-black/5">
      <div className="max-w-[1280px] mx-auto px-6 py-1.5 text-[11px] text-text-hint text-center md:text-left leading-relaxed">
        {COMPANY_INFO.name} | 대표: {COMPANY_INFO.ceo} | 사업자등록번호: {COMPANY_INFO.bizNumber} | 통신판매업신고: {COMPANY_INFO.mailOrderNumber}
      </div>
    </div>
  )
}
