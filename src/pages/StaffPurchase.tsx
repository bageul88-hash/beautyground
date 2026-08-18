import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { searchAddress } from '../lib/daumPostcode'

// 직원 전용 구매 링크 — /staff/:key (key가 STAFF_LINK_KEY와 일치할 때만 접근 가능).
// 일반 몰과 완전히 분리된 화면: 카드결제(PortOne) 없이 무통장입금(계좌이체) 전용.
// 상품가는 products.employee_price(=10% 마진만 남기고 브랜드 정산수수료율 기준으로 계산한 직원가,
// supabase/staff_employee_pricing.sql 참고)가 채워진 상품만 노출한다.
const STAFF_LINK_KEY = 'bgcrew0819'
const COMPANY_BANK = '기업은행 341-123997-04-011 (예금주: 뷰티그라운드)'

interface StaffProduct {
  id: string
  name: string
  thumbnail_url: string | null
  price: number
  sale_price: number | null
  employee_price: number
  partner_id: string | null
  stock: number
  brand_name: string
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

export default function StaffPurchase() {
  const { key } = useParams<{ key: string }>()
  const allowed = key === STAFF_LINK_KEY

  const [products, setProducts] = useState<StaffProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<Record<string, number>>({}) // product_id -> qty
  const [step, setStep] = useState<'browse' | 'checkout' | 'done'>('browse')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [orderTotal, setOrderTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('전체')

  useEffect(() => {
    if (!allowed) return
    ;(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, thumbnail_url, price, sale_price, employee_price, partner_id, stock, partners(brand_name)')
        .not('employee_price', 'is', null)
        .eq('status', 'on_sale')
        .order('name')
      if (!error && data) {
        setProducts(
          (data as unknown as (StaffProduct & { partners: { brand_name: string } | null })[]).map((p) => ({
            ...p,
            brand_name: p.partners?.brand_name || '기타',
          }))
        )
      }
      setLoading(false)
    })()
  }, [allowed])

  const brands = useMemo(
    () => ['전체', ...Array.from(new Set(products.map((p) => p.brand_name))).sort()],
    [products]
  )
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (brandFilter !== '전체' && p.brand_name !== brandFilter) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.brand_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, search, brandFilter])

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ product: products.find((p) => p.id === id)!, qty }))
        .filter((c) => c.product),
    [cart, products]
  )
  const total = cartItems.reduce((s, c) => s + c.product.employee_price * c.qty, 0)

  const setQty = (id: string, qty: number) => setCart((prev) => ({ ...prev, [id]: Math.max(0, qty) }))

  const handlePickAddress = async () => {
    const result = await searchAddress().catch(() => null)
    if (result) setAddress(result.address)
  }

  const submitOrder = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setMessage('이름·연락처·배송지를 모두 입력해 주세요.')
      return
    }
    if (!/^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/.test(phone.trim())) {
      setMessage('연락처를 휴대폰 번호 형식(010-0000-0000)으로 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setMessage('')
    const paymentId = `staff_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`
    const orderName =
      cartItems.length > 1
        ? `[직원가] ${cartItems[0].product.name} 외 ${cartItems.length - 1}건`
        : `[직원가] ${cartItems[0].product.name}`
    const fullMemo = `배송지: ${address} ${addressDetail}`.trim() + (memo.trim() ? `\n${memo.trim()}` : '')

    const rows = cartItems.map((c) => ({
      payment_id: paymentId,
      order_name: orderName,
      product_id: c.product.id,
      partner_id: c.product.partner_id,
      live_id: null,
      quantity: c.qty,
      amount: c.product.employee_price * c.qty,
      buyer_name: name.trim(),
      buyer_phone: phone.trim(),
      buyer_email: null,
      status: 'pending' as const,
      user_id: null,
      delivery_memo: fullMemo,
    }))

    const { error } = await supabase.from('orders').insert(rows)
    setSubmitting(false)
    if (error) {
      setMessage(`주문 접수 실패: ${error.message}`)
      return
    }
    setOrderTotal(total)
    setStep('done')
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-quiet text-ink-faint text-[14px]">
        페이지를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-quiet md:py-6">
      <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule">
        <header className="px-4 py-4 border-b border-rule">
          <h1 className="text-[16px] font-bold text-ink">🏷️ 뷰티그라운드 직원 전용 구매</h1>
          <p className="text-[12.5px] text-ink-faint mt-1">
            카드결제 없이 무통장입금으로만 진행됩니다. 아래 목록에 없는 상품은 원가 정보가 없어 직원가를
            적용할 수 없는 브랜드입니다.
          </p>
          <a
            href="/app/category"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-rule px-3 py-2 text-[12.5px] font-semibold text-ink-soft"
          >
            🗂️ 브랜드·카테고리 둘러보기 (일반가로 표시됨 — 참고용)
          </a>
        </header>

        {step === 'browse' && (
          <>
            <div className="px-4 py-3 border-b border-rule space-y-2 sticky top-0 bg-paper z-10">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 브랜드·상품명 검색"
                className="w-full rounded-control bg-paper border border-rule px-3.5 py-2.5 text-[13.5px]"
              />
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full rounded-control bg-paper border border-rule px-3.5 py-2.5 text-[13.5px]"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b === '전체' ? `전체 브랜드 (${products.length})` : b}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="p-6 text-center text-[13px] text-ink-faint">불러오는 중…</p>
            ) : products.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-ink-faint">현재 직원가 상품이 없습니다.</p>
            ) : visibleProducts.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-ink-faint">검색 결과가 없습니다.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {visibleProducts.map((p) => {
                  const base = p.sale_price ?? p.price
                  const qty = cart[p.id] ?? 0
                  return (
                    <li key={p.id} className="flex gap-3.5 px-4 py-3.5">
                      <a
                        href={`/app/product/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0"
                      >
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-32 h-32 rounded-control object-cover" />
                        ) : (
                          <div className="w-32 h-32 rounded-control bg-quiet" />
                        )}
                      </a>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <a href={`/app/product/${p.id}`} target="_blank" rel="noreferrer">
                          <p className="text-[11.5px] text-ink-faint font-semibold">{p.brand_name}</p>
                          <p className="text-[14px] text-ink line-clamp-2 mt-0.5">{p.name}</p>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="text-[12px] text-ink-faint line-through">{won(base)}</span>
                            <span className="text-[16px] font-bold text-signal-blue">{won(p.employee_price)}</span>
                          </div>
                        </a>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => setQty(p.id, qty - 1)}
                            className="w-8 h-8 rounded-control border border-rule text-ink-soft"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-[13.5px]">{qty}</span>
                          <button
                            onClick={() => setQty(p.id, qty + 1)}
                            className="w-8 h-8 rounded-control border border-rule text-ink-soft"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {cartItems.length > 0 && (
              <div className="sticky bottom-0 bg-paper border-t border-rule p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11.5px] text-ink-faint">{cartItems.length}개 상품</p>
                  <p className="text-[15px] font-bold text-ink">{won(total)}</p>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="px-5 py-2.5 rounded-control bg-ink text-paper text-[13.5px] font-bold"
                >
                  주문하기
                </button>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <div className="p-4 space-y-3">
            <button onClick={() => setStep('browse')} className="text-[12.5px] text-ink-faint">
              ← 목록으로
            </button>
            <div className="border border-rule rounded-control p-3 space-y-1">
              {cartItems.map((c) => (
                <div key={c.product.id} className="flex justify-between text-[12.5px] text-ink-soft">
                  <span className="truncate pr-2">{c.product.name} ×{c.qty}</span>
                  <span className="flex-shrink-0">{won(c.product.employee_price * c.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[14px] font-bold text-ink pt-2 border-t border-rule mt-2">
                <span>총 결제금액</span>
                <span>{won(total)}</span>
              </div>
            </div>

            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="받는 분 성함"
              className="w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px]" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처 (010-0000-0000)"
              className="w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px]" />
            <div className="flex gap-2">
              <input value={address} readOnly placeholder="주소 검색"
                className="flex-1 rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px]" />
              <button onClick={handlePickAddress} className="px-3.5 rounded-control border border-rule text-[13px] whitespace-nowrap">
                주소 검색
              </button>
            </div>
            <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세주소"
              className="w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px]" />
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="요청사항 (선택)"
              className="w-full rounded-control bg-paper border border-rule px-3.5 py-3 text-[14px]" />

            <div className="bg-quiet rounded-control p-3 text-[12.5px] text-ink-soft">
              💳 입금계좌: <strong>{COMPANY_BANK}</strong>
              <br />
              주문 접수 후 위 계좌로 {won(total)}을 입금해 주세요. 입금 확인 후 배송이 시작됩니다.
            </div>

            {message && <p className="text-[12.5px] text-signal-red">{message}</p>}

            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full py-3.5 rounded-control bg-ink text-paper text-[14px] font-bold disabled:opacity-50"
            >
              {submitting ? '접수 중…' : '무통장입금으로 주문하기'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="p-6 text-center space-y-3">
            <p className="text-[18px]">✅</p>
            <p className="text-[15px] font-bold text-ink">주문이 접수되었습니다</p>
            <p className="text-[13px] text-ink-soft">
              아래 계좌로 <strong>{won(orderTotal)}</strong>을 입금해 주세요.
            </p>
            <div className="bg-quiet rounded-control p-3 text-[13px] text-ink">{COMPANY_BANK}</div>
            <p className="text-[11.5px] text-ink-faint">입금 확인 후 순차 배송됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
