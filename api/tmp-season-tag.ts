import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY 누락' })
    return
  }
  const map: Record<string, string[]> =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  if (!map || typeof map !== 'object') {
    res.status(400).json({ ok: false, reason: 'body는 {id: string[]} 맵이어야 합니다.' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const [id, tags] of Object.entries(map)) {
    const { error } = await supabase.from('products').update({ season_tags: tags }).eq('id', id)
    results.push({ id, ok: !error, error: error?.message })
  }

  res.status(200).json({ ok: true, updated: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok) })
}
