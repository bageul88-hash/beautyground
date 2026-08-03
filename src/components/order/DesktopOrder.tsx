import { Link } from 'react-router-dom'
import { COMPANY_INFO } from '../../lib/companyInfo'
import type { Address } from '../../lib/addresses'
import type { LiveCoupon } from '../../lib/types'
import { couponLabel, couponSoldOut } from '../../lib/coupons'

interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
  thumbnail?: string | null
  cart_item_id?: string
}

const field =
  'w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring'

interface Props {
  paymentReady: boolean
  liveCoupon: LiveCoupon | null
  subtotal: number
  blockedNames: string[]
  itemNotices: string[]
  savedAddresses: Address[]
  selectedAddressId: string | null
  onSelectSavedAddress: (a: Address) => void
  name: string
  onName: (v: string) => void
  phone: string
  onPhone: (v: string) => void
  address: string
  onSearchAddress: () => void
  addressDetail: string
  onAddressDetail: (v: string) => void
  saveNewAddress: boolean
  onSaveNewAddress: (v: boolean) => void
  deliveryMemo: string
  onDeliveryMemo: (v: string) => void
  items: OrderItem[]
  couponPreview: number
  deliveryFee: number
  total: number
  message: string
  busy: boolean
  status: string
  onPay: () => void
}

// PC 버전 — 왼쪽에 배송지·주문상품·약관, 오른쪽에 스크롤해도 고정되는 결제 요약+버튼.
// 장바구니(DesktopCart)와 동일한 2단 구조를 그대로 따라 결제 흐름의 시각적 일관성을 유지한다.
export default function DesktopOrder({
  paymentReady,
  liveCoupon,
  subtotal,
  blockedNames,
  itemNotices,
  savedAddresses,
  selectedAddressId,
  onSelectSavedAddress,
  name,
  onName,
  phone,
  onPhone,
  address,
  onSearchAddress,
  addressDetail,
  onAddressDetail,
  saveNewAddress,
  onSaveNewAddress,
  deliveryMemo,
  onDeliveryMemo,
  items,
  couponPreview,
  deliveryFee,
  total,
  message,
  busy,
  status,
  onPay,
}: Props) {
  return (
    <div className="bg-paper min-h-screen">
      <header className="bg-paper border-b border-rule sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center">
          <Link to="/app/home" className="text-[19px] font-bold text-ink tracking-[-0.01em]">
            뷰티그라운드
          </Link>
          <h1 className="ml-6 text-[15px] font-bold text-ink-soft">주문/결제</h1>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 py-10 grid grid-cols-[1.6fr_1fr] gap-10 items-start">
        <div className="space-y-2">
          {!paymentReady && (
            <div className="bg-quiet border border-rule px-5 py-3">
              <p className="text-[12.5px] text-ink-soft leading-relaxed">
                지금은 <b className="text-ink">오픈 준비 기간</b>이에요. 주문서 작성까지 미리 확인하실 수 있고, 결제는 정식 오픈 후 가능합니다.
              </p>
            </div>
          )}

          {liveCoupon && !couponSoldOut(liveCoupon) && subtotal < liveCoupon.min_purchase && (
            <div className="bg-quiet border border-rule px-5 py-3">
              <p className="text-[12.5px] text-ink-soft">
                <span className="font-bold text-ink">{(liveCoupon.min_purchase - subtotal).toLocaleString('ko-KR')}원</span> 더 담으면 라이브 쿠폰 {couponLabel(liveCoupon)} 적용!
              </p>
            </div>
          )}

          {(blockedNames.length > 0 || itemNotices.length > 0) && (
            <div className="bg-quiet border border-rule px-5 py-3 space-y-1">
              {blockedNames.map((n) => (
                <p key={n} className="text-[12.5px] text-signal-red">"{n}"은(는) 품절/판매종료되어 주문에서 제외했어요.</p>
              ))}
              {itemNotices.map((t) => (
                <p key={t} className="text-[12.5px] text-signal-red">{t}</p>
              ))}
            </div>
          )}

          {/* 배송지 */}
          <div className="bg-paper border border-rule px-6 py-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-ink">배송지</h2>
              <Link to="/app/addresses" className="text-[12px] text-ink-soft focus:outline-none focus-visible:shadow-ring">
                배송지 관리
              </Link>
            </div>

            {savedAddresses.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelectSavedAddress(a)}
                    className={`shrink-0 text-left rounded-control border px-3 py-2 text-[12px] max-w-[220px] focus:outline-none focus-visible:shadow-ring ${
                      selectedAddressId === a.id ? 'border-ink' : 'border-rule'
                    }`}
                  >
                    <p className="font-bold text-ink truncate">{a.recipient_name}{a.is_default ? ' · 기본' : ''}</p>
                    <p className="text-ink-faint truncate">{a.address}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <input value={name} onChange={(e) => onName(e.target.value)} placeholder="받는 분 성함" className={field} />
              <input value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="연락처 (010-0000-0000)" className={field} />
            </div>
            <div className="flex gap-2">
              <input
                value={address}
                readOnly
                onClick={onSearchAddress}
                placeholder="주소 검색을 눌러주세요"
                className={`${field} cursor-pointer`}
              />
              <button
                type="button"
                onClick={onSearchAddress}
                className="shrink-0 rounded-control border border-rule text-ink font-bold text-[13px] px-5 focus:outline-none focus-visible:shadow-ring"
              >
                주소 검색
              </button>
            </div>
            {address && (
              <input
                value={addressDetail}
                onChange={(e) => onAddressDetail(e.target.value)}
                placeholder="상세 주소 (동/호수 등)"
                className={field}
              />
            )}

            {!selectedAddressId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={saveNewAddress} onChange={(e) => onSaveNewAddress(e.target.checked)} className="w-4 h-4 accent-ink" />
                <span className="text-[13px] text-ink-soft">이 배송지 저장하기</span>
              </label>
            )}

            <input
              value={deliveryMemo}
              onChange={(e) => onDeliveryMemo(e.target.value)}
              placeholder="배송 요청사항 (예: 문 앞에 놓아주세요)"
              maxLength={100}
              className={field}
            />
          </div>

          {/* 주문 상품 */}
          <div className="bg-paper border border-rule px-6 py-6">
            <h2 className="text-[15px] font-bold text-ink mb-3">주문 상품 ({items.length})</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <div className="w-16 h-16 overflow-hidden bg-quiet flex-shrink-0">
                    {item.thumbnail && <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-ink truncate">{item.name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[12.5px] text-ink-soft">수량 {item.quantity}개</span>
                      <span className="text-[14px] font-bold tabular-nums text-ink">{(item.price * item.quantity).toLocaleString('ko-KR')}원</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 안내 */}
          <div className="bg-paper border border-rule px-6 py-6">
            <p className="text-[12px] text-ink-soft leading-relaxed">
              결제하기 버튼을 누르면 주문 내용을 확인한 것으로 보며,{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline">이용약관</a> 및{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="underline">개인정보처리방침</a>에 동의한 것으로 간주됩니다.
            </p>
            {paymentReady && (
              <p className="text-[11px] text-ink-faint mt-3">테스트 모드 결제입니다. 실제 청구되지 않습니다.</p>
            )}
            <p className="text-[11px] text-ink-faint mt-4 pt-3 border-t border-rule leading-relaxed">
              {COMPANY_INFO.name} | 대표: {COMPANY_INFO.ceo} | 사업자등록번호: {COMPANY_INFO.bizNumber} | 통신판매업신고: {COMPANY_INFO.mailOrderNumber}
              <br />
              {COMPANY_INFO.address} | 고객센터: {COMPANY_INFO.csPhone}
            </p>
          </div>
        </div>

        {/* 결제 요약 — 스크롤해도 고정 */}
        <div className="sticky top-24 border border-rule p-6">
          <h2 className="text-[15px] font-bold text-ink mb-4">결제 금액</h2>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-soft">상품 금액</span>
              <span className="text-ink tabular-nums">{subtotal.toLocaleString('ko-KR')}원</span>
            </div>
            {couponPreview > 0 && (
              <div className="flex justify-between">
                <span className="text-signal-blue">라이브 쿠폰 할인</span>
                <span className="text-signal-blue font-bold tabular-nums">-{couponPreview.toLocaleString('ko-KR')}원</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-ink-soft">배송비</span>
              <span className={deliveryFee === 0 ? 'text-signal-blue font-bold' : 'text-ink tabular-nums'}>
                {deliveryFee === 0 ? '무료' : `${deliveryFee.toLocaleString('ko-KR')}원`}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-rule mt-3">
              <span className="text-[15px] font-bold text-ink">총 결제금액</span>
              <span className="text-[20px] font-bold tabular-nums text-ink">{total.toLocaleString('ko-KR')}원</span>
            </div>
          </div>

          {message && <p className="text-[13px] text-signal-red mt-4" role="alert">{message}</p>}

          <button
            onClick={onPay}
            disabled={busy}
            className="w-full mt-5 rounded-control bg-ink text-paper font-bold text-[15px] py-3.5 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:shadow-ring"
            aria-disabled={busy}
          >
            {status === 'paying' ? '결제 진행 중…'
              : paymentReady ? `${total.toLocaleString('ko-KR')}원 결제하기`
              : `${total.toLocaleString('ko-KR')}원 · 결제 오픈 준비 중`}
          </button>
        </div>
      </div>
    </div>
  )
}
