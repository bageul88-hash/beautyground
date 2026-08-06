import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TEMP_SECRET = 'c3f7e1a94b6d0258fe7a9c1d4b8e2f605a3d9c7e1b4f8026'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) { res.status(401).json({}); return }
  if (!SERVICE_ROLE) { res.status(500).json({ error: 'no service role' }); return }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const templates = await supabase.from('coupon_templates').select('*')
  const rls1 = await supabase.rpc('pg_catalog_noop').then(()=>null).catch(()=>null)
  const points = await supabase.from('point_transactions').select('*').limit(5)
  const coupons = await supabase.from('user_coupons').select('*').limit(5)
  res.status(200).json({
    templates: templates.data, templatesError: templates.error?.message,
    points: points.data, pointsError: points.error?.message,
    coupons: coupons.data, couponsError: coupons.error?.message,
  })
}
