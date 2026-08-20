import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 방송 상태를 scheduled → live 로 전환한다. 진행자가 브라우저에서 실제 송출을 시작한 직후
// 호출한다(관리자 UI에 "방송 시작" 버튼이 없어서, 진행자 본인 확인만으로 전환 가능하게 함).
// 종료(ended)는 반대로 되돌릴 위험이 커서 이 API에서는 다루지 않음 — 기존 관리자 "강제 종료"만 사용.
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'POST 요청만 허용됩니다.' })
    return
  }
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, reason: '서버 환경변수 누락: SUPABASE_SERVICE_ROLE_KEY' })
    return
  }

  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  const hostToken = String((body as { hostToken?: string } | null)?.hostToken ?? '')
  if (!hostToken) {
    res.status(400).json({ ok: false, reason: 'hostToken 이 필요합니다.' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: liveRow, error: rpcErr } = await supabase.rpc('get_live_by_host_token', {
    p_token: hostToken,
  })
  if (rpcErr || !liveRow) {
    res.status(403).json({ ok: false, reason: rpcErr?.message ?? '유효하지 않은 링크입니다.' })
    return
  }

  const { error: upErr } = await supabase
    .from('lives')
    .update({ status: 'live' })
    .eq('id', liveRow.id)
    .neq('status', 'ended')
  if (upErr) {
    res.status(500).json({ ok: false, reason: '상태 변경에 실패했습니다.' })
    return
  }

  res.status(200).json({ ok: true })
}
