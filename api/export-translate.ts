import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 수출 페이지 다국어 번역 — 브랜드가 한글로 저장하면 이 함수가 Gemini로 9개 언어 번역을 만들어
// partners.export_pitch_i18n / products.export_i18n(jsonb)에 저장한다(저장 시 1회, 페이지 로딩과 무관).
// 인증: Authorization: Bearer <supabase access token> — 본인 브랜드 데이터만 번역/저장됨.
// ⚠️ supabase/export_i18n.sql 이 먼저 실행되어 있어야 한다(컬럼 없으면 503 반환).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''

const LANGS = ['en', 'ja', 'zh_cn', 'zh_tw', 'ms', 'id', 'vi', 'th', 'ru'] as const
const LANG_NAMES: Record<string, string> = {
  en: 'English', ja: 'Japanese', zh_cn: 'Simplified Chinese', zh_tw: 'Traditional Chinese (Taiwan)',
  ms: 'Malay', id: 'Indonesian', vi: 'Vietnamese', th: 'Thai', ru: 'Russian',
}

// 화장품 도메인 번역 — 용어가 어색하면 바이어 신뢰가 깎이므로 K-뷰티 표준 용어를 프롬프트로 고정
async function translateAll(koText: string): Promise<Record<string, string> | null> {
  const prompt = `You are a professional K-beauty cosmetics translator for B2B export catalogs.
Translate the Korean text below into these 9 languages: ${LANGS.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ')}.

Rules:
- Use standard cosmetics industry terms (e.g. 앰플→ampoule, 쿠션팩트→cushion compact, 진정→soothing, 미백→brightening, 주름개선→anti-wrinkle, 각질→dead skin cells, 모공→pores, 저자극→gentle/mild, 유통기한→shelf life, 최소주문수량→MOQ).
- Keep brand names, product line names and trademarks in their original Latin spelling; do not translate them.
- Natural, professional tone a local buyer would expect — never literal word-by-word.
- Keep numbers, units (ml/g/SPF/PA), certifications (CPNP, FDA, HALAL) unchanged.
- Return ONLY a JSON object: {"en":"...","ja":"...","zh_cn":"...","zh_tw":"...","ms":"...","id":"...","vi":"...","th":"...","ru":"..."} — no markdown, no commentary.

Korean text:
${koText}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    }
  )
  if (!res.ok) {
    console.error('[export-translate] gemini http', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    // 9개 언어가 모두 문자열로 왔는지 검증 — 하나라도 빠지면 실패 처리(부분 저장으로 어색한 상태 방지)
    for (const l of LANGS) {
      if (typeof parsed[l] !== 'string' || !parsed[l].trim()) return null
    }
    return Object.fromEntries(LANGS.map((l) => [l, String(parsed[l]).trim()]))
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' })
  if (!SERVICE_ROLE || !GEMINI_KEY) return res.status(503).json({ message: '번역 설정이 없습니다' })

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ message: '인증이 필요합니다' })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return res.status(401).json({ message: '토큰이 유효하지 않습니다' })
  const uid = userData.user.id

  // 본인 브랜드 확인 (판매 파트너 or 수출 전용 계정)
  let partnerId: string | null = null
  const { data: p1 } = await supabase.from('partners').select('id').eq('user_id', uid).maybeSingle()
  if (p1) partnerId = p1.id
  if (!partnerId) {
    const { data: ec } = await supabase.from('export_contacts').select('partner_id').eq('user_id', uid).maybeSingle()
    partnerId = ec?.partner_id ?? null
  }
  if (!partnerId) return res.status(404).json({ message: '연결된 브랜드가 없습니다' })

  const { data: partner } = await supabase
    .from('partners')
    .select('id,brand_name,export_pitch,export_pitch_en')
    .eq('id', partnerId)
    .maybeSingle()
  if (!partner) return res.status(404).json({ message: '브랜드를 찾을 수 없습니다' })

  const results: { pitch: boolean; products: number; errors: string[] } = { pitch: false, products: 0, errors: [] }

  // 1) 브랜드 소개 번역 — 한글 원문 우선, 없으면 영문이라도 원문으로 사용
  const pitchSource = (partner.export_pitch ?? '').trim() || (partner.export_pitch_en ?? '').trim()
  if (pitchSource) {
    const t = await translateAll(pitchSource)
    if (t) {
      t.ko = pitchSource // 한국어 원문도 함께 저장(언어 버튼의 '한국어' 선택용)
      const { error: upErr } = await supabase.from('partners').update({ export_pitch_i18n: t }).eq('id', partnerId)
      if (upErr) {
        // 컬럼이 없으면(마이그레이션 미실행) 여기로 온다
        return res.status(503).json({ message: 'DB에 번역 컬럼이 없습니다. supabase/export_i18n.sql을 먼저 실행해 주세요.', detail: upErr.message })
      }
      results.pitch = true
    } else {
      results.errors.push('브랜드 소개 번역 실패')
    }
  }

  // 2) 대표상품 이름+설명 번역
  const { data: prods } = await supabase
    .from('products')
    .select('id,name,export_description,export_description_en')
    .eq('partner_id', partnerId)
    .eq('is_export_featured', true)
    .limit(10)

  for (const p of prods ?? []) {
    const descSource = (p.export_description ?? '').trim() || (p.export_description_en ?? '').trim()
    const nameT = await translateAll(p.name)
    const descT = descSource ? await translateAll(descSource) : null
    if (!nameT) { results.errors.push(`${p.name}: 이름 번역 실패`); continue }
    nameT.ko = p.name
    if (descT) descT.ko = descSource
    const i18n = { name: nameT, ...(descT ? { desc: descT } : {}) }
    const { error: upErr } = await supabase.from('products').update({ export_i18n: i18n }).eq('id', p.id)
    if (upErr) { results.errors.push(`${p.name}: 저장 실패`); continue }
    results.products += 1
  }

  return res.status(200).json({ success: true, ...results })
}
