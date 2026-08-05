import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 일회성 — 스마트스토어(iamiamstore) 4개 상품을 "더나는" 브랜드로 재배정. 사용 후 삭제할 것.
const TEMP_SECRET = '9f1a2c8e6b4d7053a91ee2c4b7f0d813a5c62e9f0417b6a2'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) { res.status(401).json({ ok: false }); return }
  if (!SERVICE_ROLE) { res.status(500).json({ ok: false, error: 'no service role' }); return }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: created, error: createErr } = await supabase
    .from('partners')
    .insert({ brand_name: '더나는', status: 'active', commission_rate: 30 })
    .select('id, brand_name')
    .single()
  if (createErr) { res.status(500).json({ ok: false, error: createErr.message }); return }

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, source_url')
    .ilike('source_url', '%smartstore%')
  if (prodErr) { res.status(500).json({ ok: false, error: prodErr.message }); return }

  const ids = (products ?? []).map((p) => p.id)
  const { error: updErr } = await supabase.from('products').update({ partner_id: created.id }).in('id', ids)
  if (updErr) { res.status(500).json({ ok: false, error: updErr.message }); return }

  res.status(200).json({ ok: true, partner: created, updated: ids.length })
}
