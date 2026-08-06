import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TEMP_SECRET = 'c3f7e1a94b6d0258fe7a9c1d4b8e2f605a3d9c7e1b4f8026'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) { res.status(401).json({}); return }
  if (!SERVICE_ROLE) { res.status(500).json({ error: 'no service role' }); return }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const userId = (req.query.deleteUserId as string) || (req.body as { deleteUserId?: string } | null)?.deleteUserId
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    res.status(200).json({ deleted: !error, error: error?.message })
    return
  }
  res.status(400).json({ error: 'deleteUserId required' })
}
