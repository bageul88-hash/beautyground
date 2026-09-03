import { supabase } from './supabase'
import type { Product } from './types'

export interface RecentlyViewedLine {
  id: string // recently_viewed_items.id
  viewedAt: string
  product: Product
}

// 상품 상세를 열 때마다 호출 — 이미 본 상품이면 viewed_at만 갱신(중복 없음).
// 비로그인이면 조용히 무시(찜과 동일하게 회원 전용).
export async function recordView(productId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return
  await supabase
    .from('recently_viewed_items')
    .upsert({ user_id: userId, product_id: productId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,product_id' })
}

export async function getRecentlyViewed(): Promise<RecentlyViewedLine[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []
  const { data } = await supabase
    .from('recently_viewed_items')
    .select('id, viewed_at, products(*)')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(60)
  return ((data ?? []) as unknown as { id: string; viewed_at: string; products: Product | null }[])
    .filter((row) => row.products)
    .map((row) => ({ id: row.id, viewedAt: row.viewed_at, product: row.products as Product }))
}

export async function removeRecentlyViewed(productId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return
  await supabase.from('recently_viewed_items').delete().eq('user_id', userId).eq('product_id', productId)
}
