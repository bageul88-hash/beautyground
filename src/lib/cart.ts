import { supabase } from './supabase'
import type { Product } from './types'

export interface CartLine {
  id: string // 로그인: cart_items.id / 게스트: `guest:${product_id}`
  quantity: number
  product: Product
}

// 게스트(비로그인) 장바구니는 브라우저 localStorage에 저장 → 로그인 없이 담고/보고/수정 가능.
// 로그인하면 mergeGuestCartToServer()로 서버 장바구니에 합친 뒤 비운다.
const GUEST_KEY = 'bg_guest_cart'
type GuestItem = { product_id: string; quantity: number }

function readGuest(): GuestItem[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((i) => i && i.product_id) : []
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

// 장바구니 조회 — 로그인: 서버 / 게스트: localStorage(상품정보는 실시간 조회)
export async function getCart(): Promise<CartLine[]> {
  const userId = await currentUserId()

  if (userId) {
    const { data } = await supabase
      .from('cart_items')
      .select('id, quantity, products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return ((data ?? []) as unknown as { id: string; quantity: number; products: Product | null }[])
      .filter((row) => row.products)
      .map((row) => ({ id: row.id, quantity: row.quantity, product: row.products as Product }))
  }

  // 게스트: 저장된 product_id로 현재 상품정보를 조회해 카트라인 구성
  const items = readGuest()
  if (items.length === 0) return []
  const ids = items.map((i) => i.product_id)
  const { data } = await supabase.from('products').select('*').in('id', ids)
  const byId = new Map(((data ?? []) as Product[]).map((p) => [p.id, p]))
  return items
    .filter((i) => byId.has(i.product_id))
    .map((i) => ({ id: `guest:${i.product_id}`, quantity: i.quantity, product: byId.get(i.product_id) as Product }))
}

// 담기: 이미 있으면 수량 합산
export async function addToCart(productId: string, quantity = 1): Promise<{ error?: string }> {
  const userId = await currentUserId()

  if (!userId) {
    const items = readGuest()
    const ex = items.find((i) => i.product_id === productId)
    if (ex) ex.quantity += quantity
    else items.push({ product_id: productId, quantity })
    writeGuest(items)
    return {}
  }

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: (existing as { quantity: number }).quantity + quantity })
      .eq('id', (existing as { id: string }).id)
    if (error) return { error: error.message }
    window.dispatchEvent(new Event('bg-cart-changed'))
    return {}
  }

  const { error } = await supabase
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, quantity })
  if (error) return { error: error.message }
  window.dispatchEvent(new Event('bg-cart-changed'))
  return {}
}

export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<void> {
  const qty = Math.max(1, quantity)
  if (cartItemId.startsWith('guest:')) {
    const pid = cartItemId.slice('guest:'.length)
    const items = readGuest()
    const ex = items.find((i) => i.product_id === pid)
    if (ex) ex.quantity = qty
    writeGuest(items)
    return
  }
  await supabase.from('cart_items').update({ quantity: qty }).eq('id', cartItemId)
  window.dispatchEvent(new Event('bg-cart-changed'))
}

export async function removeFromCart(cartItemId: string): Promise<void> {
  if (cartItemId.startsWith('guest:')) {
    const pid = cartItemId.slice('guest:'.length)
    writeGuest(readGuest().filter((i) => i.product_id !== pid))
    return
  }
  await supabase.from('cart_items').delete().eq('id', cartItemId)
  window.dispatchEvent(new Event('bg-cart-changed'))
}

export async function clearCartItems(cartItemIds: string[]): Promise<void> {
  if (cartItemIds.length === 0) return
  const guestPids = cartItemIds.filter((id) => id.startsWith('guest:')).map((id) => id.slice('guest:'.length))
  if (guestPids.length > 0) {
    writeGuest(readGuest().filter((i) => !guestPids.includes(i.product_id)))
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
    await addToCart(it.product_id, it.quantity)
  }
  writeGuest([])
}
