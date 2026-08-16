import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const SECRET = 'bg-debug-2026-08-16-tmp'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.secret !== SECRET) {
    res.status(403).json({ ok: false })
    return
  }
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, reason: 'no service role' })
    return
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const { data: userList } = await supabase.auth.admin.listUsers()
  const user = userList?.users.find((u) => u.email === 'test3@test.com')

  const { data: partner } = user
    ? await supabase.from('partners').select('*').eq('user_id', user.id).maybeSingle()
    : { data: null }

  let products: unknown[] = []
  if (partner) {
    const { data } = await supabase
      .from('products')
      .select('id,name,thumbnail_url,gallery_images,is_export_featured,export_image_urls,status')
      .eq('partner_id', (partner as { id: string }).id)
      .limit(10)
    products = data ?? []
  }

  res.status(200).json({ ok: true, userId: user?.id ?? null, partner, products })
}
