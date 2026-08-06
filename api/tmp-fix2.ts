import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TEMP_SECRET = '2d8f6a1c9e3b7054ad9f2c6b8e1a4d7053c9e6b2f8a1d405'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) { res.status(401).json({}); return }
  if (!SERVICE_ROLE) { res.status(500).json({ error: 'no service role' }); return }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  // 오 드 퍼퓸(진짜 향수)인데 퍼퓸 디퓨저로 잘못 들어간 2건 수정
  const r1 = await supabase.from('products').update({ category: '향수' }).eq('id', '62674f34-d779-4fe5-9d98-ad963fe2a33e')
  const r2 = await supabase.from('products').update({ category: '향수' }).eq('id', '3e904946-73be-4000-836b-d363c8f1abe6')

  // 카테고리 아이콘 썸네일 — 향수/퍼퓸 디퓨저 신규 추가, 기타(더 이상 안 쓰는 카테고리) 정리
  const r3 = await supabase.from('category_thumbnails').upsert(
    { category: '향수', product_id: '9257cbfb-7fab-481b-878a-db06d4cb0798', sort_order: 2 },
    { onConflict: 'category' }
  )
  const r4 = await supabase.from('category_thumbnails').upsert(
    { category: '퍼퓸 디퓨저', product_id: '2b28fc6c-9cbe-4f37-b7d3-6eda72227d6c', sort_order: 4 },
    { onConflict: 'category' }
  )
  const r5 = await supabase.from('category_thumbnails').delete().eq('category', '기타')

  res.status(200).json({
    fix1: r1.error?.message ?? 'ok', fix2: r2.error?.message ?? 'ok',
    thumb_perfume: r3.error?.message ?? 'ok', thumb_diffuser: r4.error?.message ?? 'ok',
    cleanup_etc: r5.error?.message ?? 'ok',
  })
}
