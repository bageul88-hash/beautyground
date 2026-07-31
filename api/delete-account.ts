import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 회원탈퇴 — 로그인 계정(auth.users)만 삭제한다. 주문·결제 기록은 이용약관/개인정보처리방침의
// 법정 보관기간 요구사항 때문에 남겨둔다(판매·거래 데이터는 삭제 대상 아님).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'POST 요청만 허용됩니다.' })
    return
  }
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, reason: '서버 환경변수 누락 (SUPABASE_SERVICE_ROLE_KEY)' })
    return
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ ok: false, reason: '로그인이 필요합니다.' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) {
    res.status(401).json({ ok: false, reason: '인증에 실패했습니다.' })
    return
  }

  const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.error('[delete-account] deleteUser failed', delErr)
    res.status(500).json({ ok: false, reason: '회원탈퇴 처리 중 오류가 발생했습니다.' })
    return
  }

  res.status(200).json({ ok: true })
}
