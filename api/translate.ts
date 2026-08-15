import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

// 브랜드 수출 소개글/상품 설명 한→영 번역 (/brand/export 페이지 "번역하기" 버튼).
// 로그인한 사용자만 호출 가능(무단 API 사용 방지) — 특정 role 제한은 없음(관리자도 쓸 수 있게).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'POST 요청만 허용됩니다.' })
    return
  }
  if (!SERVICE_ROLE || !GEMINI_API_KEY) {
    res.status(500).json({ ok: false, reason: '서버 환경변수 누락 (SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY)' })
    return
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ ok: false, reason: '로그인이 필요합니다.' })
    return
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    res.status(401).json({ ok: false, reason: '인증에 실패했습니다.' })
    return
  }

  let body: unknown = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const text = (body as { text?: string } | null)?.text?.trim()
  if (!text) {
    res.status(400).json({ ok: false, reason: 'text가 필요합니다.' })
    return
  }
  if (text.length > 4000) {
    res.status(400).json({ ok: false, reason: '텍스트가 너무 깁니다(4000자 이하).' })
    return
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `다음 한국어 화장품 브랜드/제품 소개 텍스트를 해외 B2B 바이어에게 보여줄 자연스러운
영어로 번역하라. 마케팅 문구 톤을 살리되 과장하지 말고, 번역문만 출력하라(설명·따옴표·코드블록 금지).

${text}`,
    })
    const translated = (result.text ?? '').trim()
    if (!translated) {
      res.status(502).json({ ok: false, reason: '번역 결과가 비어있습니다.' })
      return
    }
    res.status(200).json({ ok: true, translated })
  } catch (e) {
    console.error('[translate] Gemini 실패:', e)
    res.status(502).json({ ok: false, reason: '번역 요청에 실패했습니다.' })
  }
}
