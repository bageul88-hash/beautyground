import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// 수출 브랜드 부가 기능 통합 함수 — ?action=welcome(개설 웰컴 메일) | translate(다국어 번역 생성)
// Vercel Hobby 플랜의 서버리스 함수 12개 제한 때문에 export-welcome.ts + export-translate.ts를 하나로 합쳤다(2026-08-17).
// 인증: Authorization: Bearer <supabase access token> — 토큰 사용자에 연결된 브랜드에만 동작.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const SITE = 'https://beautyground.co.kr'

// ── 공통: 토큰 → 본인 브랜드 확인 (판매 파트너 계정 또는 수출 전용 계정) ──
async function resolvePartner(supabase: SupabaseClient, token: string) {
  const { data: userData, error } = await supabase.auth.getUser(token)
  if (error || !userData?.user) return { status: 401 as const, message: '토큰이 유효하지 않습니다' }
  const uid = userData.user.id
  let partnerId: string | null = null
  const { data: p1 } = await supabase.from('partners').select('id').eq('user_id', uid).maybeSingle()
  if (p1) partnerId = p1.id
  if (!partnerId) {
    const { data: ec } = await supabase.from('export_contacts').select('partner_id').eq('user_id', uid).maybeSingle()
    partnerId = ec?.partner_id ?? null
  }
  if (!partnerId) return { status: 404 as const, message: '연결된 브랜드가 없습니다' }
  const { data: partner } = await supabase
    .from('partners')
    .select('id,brand_name,export_pitch,export_pitch_en')
    .eq('id', partnerId)
    .maybeSingle()
  if (!partner) return { status: 404 as const, message: '브랜드를 찾을 수 없습니다' }
  return { status: 200 as const, partner, userEmail: userData.user.email ?? null }
}

// ══════════ 1) 다국어 번역 생성 ══════════
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
    console.error('[export-brand:translate] gemini http', res.status, (await res.text()).slice(0, 300))
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

async function translateHandler(req: VercelRequest, res: VercelResponse) {
  if (!GEMINI_KEY) return res.status(503).json({ message: '번역 설정이 없습니다' })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ message: '인증이 필요합니다' })
  const resolved = await resolvePartner(supabase, token)
  if (resolved.status !== 200) return res.status(resolved.status).json({ message: resolved.message })
  const { partner } = resolved

  const results: { pitch: boolean; products: number; errors: string[] } = { pitch: false, products: 0, errors: [] }

  // 1) 브랜드 소개 번역 — 한글 원문 우선, 없으면 영문이라도 원문으로 사용
  const pitchSource = (partner.export_pitch ?? '').trim() || (partner.export_pitch_en ?? '').trim()
  if (pitchSource) {
    const t = await translateAll(pitchSource)
    if (t) {
      t.ko = pitchSource // 한국어 원문도 함께 저장(언어 버튼의 '한국어' 선택용)
      const { error: upErr } = await supabase.from('partners').update({ export_pitch_i18n: t }).eq('id', partner.id)
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
    .eq('partner_id', partner.id)
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

// ══════════ 2) 개설 웰컴 메일 ══════════
function welcomeHtml(brandName: string, pageUrl: string): string {
  const gold = '#B08A4F'
  const navy = '#1B2537'
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}`
  const row = (icon: string, title: string, body: string) => `
    <tr><td style="padding:10px 0;border-bottom:1px dashed #E8E6E1;">
      <p style="margin:0;font-size:14px;font-weight:700;color:${navy};">${icon} ${title}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6B7280;line-height:1.7;">${body}</p>
    </td></tr>`
  return `
  <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#F4F2EE;padding:28px 14px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #E8E6E1;">
      <div style="background:linear-gradient(135deg,#20293C,#1B2537 60%,#2A3550);color:#fff;text-align:center;padding:34px 24px 26px;">
        <p style="margin:0;font-size:12px;letter-spacing:4px;color:${gold};">BEAUTYGROUND EXPORT</p>
        <h1 style="margin:12px 0 0;font-size:21px;">🎉 ${brandName} 수출 페이지가 개설되었습니다</h1>
        <p style="margin:10px 0 0;font-size:13px;color:#C8CEDB;line-height:1.7;">
          이제 해외 바이어와 소비자에게 ${brandName}을(를) 소개할<br/>전용 페이지가 생겼습니다.
        </p>
        <a href="${pageUrl}" style="display:inline-block;margin-top:18px;background:${gold};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:24px;">내 수출 페이지 열어보기 →</a>
        <p style="margin:10px 0 0;font-size:11px;color:#8B94A5;">${pageUrl}</p>
      </div>

      <div style="padding:26px 26px 8px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${navy};">앞으로 뷰티그라운드가 하는 일</p>
        <p style="margin:0 0 10px;font-size:12.5px;color:#9A9488;">등록하신 페이지는 아래 채널로 노출되며, 성과는 있는 그대로 알려드립니다.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${row('🔍', '구글 검색 노출', '해외 바이어가 찾는 검색어(K-Beauty supplier 등)에 페이지가 노출되도록 다국어 검색 최적화를 적용합니다.')}
          ${row('🎵', '틱톡 · 유튜브 노출', '등록하신 제품 사진·영상을 숏폼 콘텐츠로 만들어 해외 소비자와 바이어에게 노출합니다.')}
          ${row('✉️', '바이어 직접 제안', '뷰티그라운드 수출팀이 국가별 바이어에게 귀사 제품을 직접 제안합니다. 바이어 문의 응대는 저희가 전담합니다.')}
          ${row('🛒', '판매 연결', '뷰티그라운드 온라인몰을 통해 국내외 소비자 판매로 연결됩니다.')}
        </table>
        <div style="background:#F8F3EA;border:1px solid #E9DCC3;border-radius:12px;padding:12px 16px;margin:16px 0 6px;">
          <p style="margin:0;font-size:12.5px;color:#8B6F3D;line-height:1.7;">
            💡 <b>완성도가 높을수록 더 많이 노출됩니다.</b> 제품 사진(각 상품 3장 이상)·영상·인증 정보를
            채워주세요. 페이지는 언제든 <a href="${SITE}/brand/export" style="color:${gold};">브랜드 센터</a>에서 직접 수정할 수 있습니다.
          </p>
        </div>
      </div>

      <div style="text-align:center;padding:8px 24px 24px;">
        <img src="${qr}" alt="QR" width="120" height="120" style="border:1px solid #E8E6E1;border-radius:12px;"/>
        <p style="margin:8px 0 0;font-size:11px;color:#9A9488;">명함·상담 시 QR로 바로 보여주세요</p>
      </div>

      <div style="background:#141B2B;color:#9AA3B5;text-align:center;padding:16px;font-size:11px;line-height:1.7;">
        바이어 발굴·컨택·협상은 뷰티그라운드 수출팀이 전담하며,<br/>열람·문의 현황은 브랜드 센터와 리포트 메일로 알려드립니다.<br/>
        <span style="color:${gold};letter-spacing:2px;">BEAUTYGROUND · SEOUL</span>
      </div>
    </div>
  </div>`
}

async function welcomeHandler(req: VercelRequest, res: VercelResponse) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(503).json({ message: '메일 발송 설정이 없습니다' })
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ message: '인증이 필요합니다' })
  const resolved = await resolvePartner(supabase, token)
  if (resolved.status !== 200) return res.status(resolved.status).json({ message: resolved.message })
  const { partner, userEmail } = resolved

  // 페이지가 실제로 개설된 상태(영문 소개 저장됨)에서만 발송
  if (!(partner.export_pitch_en ?? '').trim()) return res.status(409).json({ message: '아직 페이지가 개설되지 않았습니다' })
  if (!userEmail) return res.status(409).json({ message: '수신 이메일이 없습니다' })

  const pageUrl = `${SITE}/x/${encodeURIComponent(partner.brand_name)}`
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  try {
    await transporter.sendMail({
      from: `"뷰티그라운드" <${GMAIL_USER}>`,
      to: userEmail,
      subject: `[뷰티그라운드] ${partner.brand_name} 수출 페이지가 개설되었습니다 🎉`,
      html: welcomeHtml(partner.brand_name, pageUrl),
    })
    return res.status(200).json({ success: true })
  } catch (e) {
    console.error('[export-brand:welcome] 발송 실패:', e)
    return res.status(500).json({ message: '메일 발송에 실패했습니다' })
  }
}

// ── 액션 라우터 ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' })
  if (!SERVICE_ROLE) return res.status(503).json({ message: '서버 설정이 없습니다' })
  const action = String(req.query.action || '')
  if (action === 'welcome') return welcomeHandler(req, res)
  if (action === 'translate') return translateHandler(req, res)
  return res.status(400).json({ message: 'action은 welcome|translate 중 하나여야 합니다' })
}
