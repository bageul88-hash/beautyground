import { supabase } from './supabase'
import type { Product } from './types'

export interface CartLine {
  id: string // 로그인: cart_items.id / 게스트: guestId()로 인코딩
  quantity: number
  product: Product
  optionLabel: string | null // 선택한 옵션(색상 등) — 옵션 없는 상품이면 null
}

// 게스트(비로그인) 장바구니는 브라우저 localStorage에 저장 → 로그인 없이 담고/보고/수정 가능.
// 로그인하면 mergeGuestCartToServer()로 서버 장바구니에 합친 뒤 비운다.
const GUEST_KEY = 'bg_guest_cart'
type GuestItem = { product_id: string; quantity: number; option_label: string | null }

// 같은 상품이라도 옵션(색상 등)이 다르면 별개 라인으로 취급 — product_id는 UUID(콜론 없음)라 안전하게 구분 가능.
function guestId(productId: string, optionLabel: string | null): string {
  return `guest:${productId}:${optionLabel ? encodeURIComponent(optionLabel) : ''}`
}
function parseGuestId(id: string): { productId: string; optionLabel: string | null } {
  const rest = id.slice('guest:'.length)
  const idx = rest.lastIndexOf(':')
  const opt = rest.slice(idx + 1)
  return { productId: rest.slice(0, idx), optionLabel: opt ? decodeURIComponent(opt) : null }
}

function readGuest(): GuestItem[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr)
      ? arr.filter((i) => i && i.product_id).map((i) => ({ option_label: null, ...i }))
      : []
  } catch {
    return []
  }
}
function writeGuest(items: GuestItem[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items))
    // 헤더 장바구니 배지 등이 즉시 갱신되도록 신호
    window.dispatchEvent(new Event('bg-cart-changed'))
  } catch {
    /* 저장 실패(사생활 모드 등)는 무시 */
  }
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

// cart_items.option_label / orders.option_label 컬럼(supabase/product_options.sql)이 아직 배포 전
// 환경에 남아있을 수 있어, 그 컬럼을 참조하다 나는 PostgREST 에러만 감지해 옵션 없이 재시도한다.
function isMissingOptionColumn(message?: string): boolean {
  return !!message && /option_label/i.test(message)
}

// 장바구니 조회 — 로그인: 서버 / 게스트: localStorage(상품정보는 실시간 조회)
export async function getCart(): Promise<CartLine[]> {
  const userId = await currentUserId()

  if (userId) {
    type Row = { id: string; quantity: number; option_label: string | null; products: Product | null }
    let { data, error } = await supabase
      .from('cart_items')
      .select('id, quantity, option_label, products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error && isMissingOptionColumn(error.message)) {
      const fallback = await supabase
        .from('cart_items')
        .select('id, quantity, products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      data = (fallback.data ?? []).map((r) => ({ ...r, option_label: null })) as typeof data
      error = fallback.error
    }

    return ((data ?? []) as unknown as Row[])
      .filter((row) => row.products)
      .map((row) => ({ id: row.id, quantity: row.quantity, optionLabel: row.option_label ?? null, product: row.products as Product }))
  }

  // 게스트: 저장된 product_id로 현재 상품정보를 조회해 카트라인 구성
  const items = readGuest()
  if (items.length === 0) return []
  const ids = items.map((i) => i.product_id)
  const { data } = await supabase.from('products').select('*').in('id', ids)
  const byId = new Map(((data ?? []) as Product[]).map((p) => [p.id, p]))
  return items
    .filter((i) => byId.has(i.product_id))
    .map((i) => ({
      id: guestId(i.product_id, i.option_label),
      quantity: i.quantity,
      optionLabel: i.option_label,
      product: byId.get(i.product_id) as Product,
    }))
}

// 담기: 같은 상품+같은 옵션이 이미 있으면 수량 합산. cartItemId를 반환 — "구매하기"가 결제 완료 후 정리할 때 씀.
export async function addToCart(
  productId: string,
  quantity = 1,
  optionLabel: string | null = null
): Promise<{ error?: string; cartItemId?: string }> {
  const userId = await currentUserId()

  if (!userId) {
    const items = readGuest()
    const ex = items.find((i) => i.product_id === productId && i.option_label === optionLabel)
    if (ex) ex.quantity += quantity
    else items.push({ product_id: productId, quantity, option_label: optionLabel })
    writeGuest(items)
    return { cartItemId: guestId(productId, optionLabel) }
  }

  let existingQuery = supabase.from('cart_items').select('id, quantity').eq('user_id', userId).eq('product_id', productId)
  existingQuery = optionLabel ? existingQuery.eq('option_label', optionLabel) : existingQuery.is('option_label', null)
  let { data: existing, error: findErr } = await existingQuery.maybeSingle()
  if (findErr && isMissingOptionColumn(findErr.message)) {
    ;({ data: existing, error: findErr } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle())
  }

  if (existing) {
    const existingId = (existing as { id: string }).id
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: (existing as { quantity: number }).quantity + quantity })
      .eq('id', existingId)
    if (error) return { error: error.message }
    window.dispatchEvent(new Event('bg-cart-changed'))
    return { cartItemId: existingId }
  }

  let { data: inserted, error } = await supabase
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, quantity, option_label: optionLabel })
    .select('id')
    .single()
  if (error && isMissingOptionColumn(error.message)) {
    ;({ data: inserted, error } = await supabase
      .from('cart_items')
      .insert({ user_id: userId, product_id: productId, quantity })
      .select('id')
      .single())
  }
  if (error) return { error: error.message }
  window.dispatchEvent(new Event('bg-cart-changed'))
  return { cartItemId: (inserted as { id: string }).id }
}

export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<void> {
  const qty = Math.max(1, quantity)
  if (cartItemId.startsWith('guest:')) {
    const { productId, optionLabel } = parseGuestId(cartItemId)
    const items = readGuest()
    const ex = items.find((i) => i.product_id === productId && i.option_label === optionLabel)
    if (ex) ex.quantity = qty
    writeGuest(items)
    return
  }
  await supabase.from('cart_items').update({ quantity: qty }).eq('id', cartItemId)
  window.dispatchEvent(new Event('bg-cart-changed'))
}

export async function removeFromCart(cartItemId: string): Promise<void> {
  if (cartItemId.startsWith('guest:')) {
    const { productId, optionLabel } = parseGuestId(cartItemId)
    writeGuest(readGuest().filter((i) => !(i.product_id === productId && i.option_label === optionLabel)))
    return
  }
  await supabase.from('cart_items').delete().eq('id', cartItemId)
  window.dispatchEvent(new Event('bg-cart-changed'))
}

export async function clearCartItems(cartItemIds: string[]): Promise<void> {
  if (cartItemIds.length === 0) return
  const guestKeys = cartItemIds.filter((id) => id.startsWith('guest:')).map(parseGuestId)
  if (guestKeys.length > 0) {
    writeGuest(
      readGuest().filter((i) => !guestKeys.some((g) => g.productId === i.product_id && g.optionLabel === i.option_label))
    )
  }
  const serverIds = cartItemIds.filter((id) => !id.startsWith('guest:'))
  if (serverIds.length > 0) {
    await supabase.from('cart_items').delete().in('id', serverIds)
  }
  window.dispatchEvent(new Event('bg-cart-changed'))
}

// 게스트 장바구니 담긴 개수(배지용) — 상품 조회 없이 로컬만
export function guestCartCount(): number {
  return readGuest().reduce((sum, i) => sum + i.quantity, 0)
}

// 로그인 직후 호출: 게스트 장바구니를 서버로 합치고 로컬을 비운다.
export async function mergeGuestCartToServer(): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return
  const items = readGuest()
  if (items.length === 0) return
  for (const it of items) {
    // 로그인 상태이므로 addToCart는 서버 경로로 동작(수량 합산 포함)
    await addToCart(it.product_id, it.quantity, it.option_label)
  }
  writeGuest([])
}
