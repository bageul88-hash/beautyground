import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

// 수출 브랜드 부가 기능 통합 함수 — ?action=welcome(개설 웰컴 메일) | translate(다국어 번역 생성)
//   | hub-send-code | hub-verify-code | hub-me | hub-logout (파트너 허브 전용 계정, 아래 참고)
// Vercel Hobby 플랜의 서버리스 함수 12개 제한 때문에 export-welcome.ts + export-translate.ts를 하나로 합쳤고
// (2026-08-17), 같은 이유로 partner-hub-auth.ts도 여기 합쳤다(2026-08-24, 함수 개수 13→12).
// 인증: welcome/translate는 Authorization: Bearer <supabase access token>(토큰 사용자에 연결된 브랜드에만 동작).
// hub-* 는 완전히 다른 인증 체계 — 파트너 허브 전용 세션 토큰이며 Supabase Auth와 무관(아래 3) 참고).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''
const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
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
  const red = '#E53E3E'
  const ink = '#111111'
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}`
  const row = (icon: string, title: string, body: string) => `
    <tr><td style="padding:10px 0;border-bottom:1px dashed #E8E6E1;">
      <p style="margin:0;font-size:14px;font-weight:700;color:${ink};">${icon} ${title}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6B7280;line-height:1.7;">${body}</p>
    </td></tr>`
  return `
  <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#FFFFFF;padding:28px 14px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #E5E5E5;">
      <div style="background:#FFFFFF;color:${ink};text-align:center;padding:34px 24px 26px;border-bottom:1px solid ${ink};">
        <p style="margin:0;font-size:12px;letter-spacing:4px;color:${red};">BEAUTYGROUND EXPORT</p>
        <h1 style="margin:12px 0 0;font-size:21px;color:${ink};">${brandName} 수출 페이지가 개설되었습니다</h1>
        <p style="margin:10px 0 0;font-size:13px;color:#555555;line-height:1.7;">
          이제 해외 바이어와 소비자에게 ${brandName}을(를) 소개할<br/>전용 페이지가 생겼습니다.
        </p>
        <a href="${pageUrl}" style="display:inline-block;margin-top:18px;background:${red};color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:24px;">내 수출 페이지 열어보기 →</a>
        <p style="margin:10px 0 0;font-size:11px;color:#888888;">${pageUrl}</p>
      </div>

      <div style="padding:26px 26px 8px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${ink};">앞으로 뷰티그라운드가 하는 일</p>
        <p style="margin:0 0 10px;font-size:12.5px;color:#888888;">등록하신 페이지는 아래 채널로 노출되며, 성과는 있는 그대로 알려드립니다.</p>
        <table style="width:100%;border-collapse:collapse;">
          ${row('🔍', '구글 검색 노출', '해외 바이어가 찾는 검색어(K-Beauty supplier 등)에 페이지가 노출되도록 다국어 검색 최적화를 적용합니다.')}
          ${row('🎵', '틱톡 · 유튜브 노출', '등록하신 제품 사진·영상을 숏폼 콘텐츠로 만들어 해외 소비자와 바이어에게 노출합니다.')}
          ${row('✉️', '바이어 직접 제안', '뷰티그라운드 수출팀이 국가별 바이어에게 귀사 제품을 직접 제안합니다. 바이어 문의 응대는 저희가 전담합니다.')}
          ${row('🛒', '판매 연결', '뷰티그라운드 온라인몰을 통해 국내외 소비자 판매로 연결됩니다.')}
        </table>
        <div style="background:#F6F6F6;border:1px solid #E5E5E5;border-radius:12px;padding:12px 16px;margin:16px 0 6px;">
          <p style="margin:0;font-size:12.5px;color:#333333;line-height:1.7;">
            <b style="color:${red};">완성도가 높을수록 더 많이 노출됩니다.</b> 제품 사진(각 상품 3장 이상)·영상·인증 정보를
            채워주세요. 페이지는 언제든 <a href="${SITE}/brand/export" style="color:${red};">브랜드 센터</a>에서 직접 수정할 수 있습니다.
          </p>
        </div>
      </div>

      <div style="text-align:center;padding:8px 24px 24px;">
        <img src="${qr}" alt="QR" width="120" height="120" style="border:1px solid #E5E5E5;border-radius:12px;"/>
        <p style="margin:8px 0 0;font-size:11px;color:#888888;">명함·상담 시 QR로 바로 보여주세요</p>
      </div>

      <div style="background:${ink};color:#CCCCCC;text-align:center;padding:16px;font-size:11px;line-height:1.7;">
        바이어 발굴·컨택·협상은 뷰티그라운드 수출팀이 전담하며,<br/>열람·문의 현황은 브랜드 센터와 리포트 메일로 알려드립니다.<br/>
        <span style="color:#FFFFFF;letter-spacing:2px;">BEAUTYGROUND · SEOUL</span>
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

// ══════════ 3) 파트너 허브(/partners) 전용 계정 — 쇼핑몰 회원가입(auth.users)과 완전히 독립 ══════════
// 이메일 인증코드만으로 가입/로그인. partner_hub_accounts/login_codes/sessions 3개 테이블은
// anon 직접 접근이 막혀있어(RLS 켜짐 + 정책 없음) 이 서버 함수(service_role)를 통해서만 드나든다.
const HUB_CODE_TTL_MS = 10 * 60 * 1000 // 10분
const HUB_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30일
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function genHubCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

function hubCodeEmailHtml(code: string) {
  return `
  <div style="font-family:-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#FAFAF8;">
    <p style="font-size:12px;letter-spacing:0.2em;color:#5B6EF5;font-weight:700;text-transform:uppercase;">BEAUTYGROUND PARTNER HUB</p>
    <p style="font-size:15px;color:#111;line-height:1.7;margin-top:16px;">아래 인증코드를 입력해 주세요. 10분간 유효합니다.</p>
    <p style="font-size:32px;font-weight:800;letter-spacing:0.15em;color:#111;background:#fff;border:1px solid #E5E0D8;border-radius:10px;padding:16px 20px;text-align:center;margin:20px 0;">${code}</p>
    <p style="font-size:12px;color:#8A8577;">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
  </div>`
}

async function hubSendCodeHandler(req: VercelRequest, res: VercelResponse) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(503).json({ ok: false, message: '메일 발송 설정이 없습니다' })
  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as { email?: string }
  const email = (body?.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, message: '올바른 이메일 주소를 입력해 주세요' })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const code = genHubCode()
  const expiresAt = new Date(Date.now() + HUB_CODE_TTL_MS).toISOString()
  const { error: insertErr } = await supabase.from('partner_hub_login_codes').insert({ email, code, expires_at: expiresAt })
  if (insertErr) return res.status(500).json({ ok: false, message: '코드 생성에 실패했습니다' })

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  try {
    await transporter.sendMail({
      from: `"뷰티그라운드 파트너 허브" <${GMAIL_USER}>`,
      to: email,
      subject: `[뷰티그라운드] 인증코드 ${code}`,
      html: hubCodeEmailHtml(code),
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[export-brand:hub-send-code] 발송 실패:', e)
    return res.status(500).json({ ok: false, message: '메일 발송에 실패했습니다' })
  }
}

async function hubVerifyCodeHandler(req: VercelRequest, res: VercelResponse) {
  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as { email?: string; code?: string }
  const email = (body?.email || '').trim().toLowerCase()
  const code = (body?.code || '').trim()
  if (!EMAIL_RE.test(email) || code.length !== 6) return res.status(400).json({ ok: false, message: '이메일과 6자리 코드를 확인해 주세요' })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: candidates } = await supabase
    .from('partner_hub_login_codes')
    .select('*')
    .eq('email', email)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  const latest = candidates?.[0] as { id: string; code: string; expires_at: string } | undefined

  if (!latest || latest.code !== code) return res.status(401).json({ ok: false, message: '인증코드가 올바르지 않습니다' })
  if (new Date(latest.expires_at).getTime() < Date.now()) return res.status(401).json({ ok: false, message: '인증코드가 만료되었습니다. 다시 요청해 주세요' })

  await supabase.from('partner_hub_login_codes').update({ consumed_at: new Date().toISOString() }).eq('id', latest.id)

  const { data: existing } = await supabase.from('partner_hub_accounts').select('*').eq('email', email).maybeSingle()
  let account = existing
  if (!account) {
    const { data: created, error: createErr } = await supabase
      .from('partner_hub_accounts')
      .insert({ email, last_login_at: new Date().toISOString() })
      .select()
      .single()
    if (createErr) return res.status(500).json({ ok: false, message: '계정 생성에 실패했습니다' })
    account = created
  } else {
    await supabase.from('partner_hub_accounts').update({ last_login_at: new Date().toISOString() }).eq('id', account.id)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + HUB_SESSION_TTL_MS).toISOString()
  const { error: sessionErr } = await supabase.from('partner_hub_sessions').insert({ token, account_id: account.id, expires_at: expiresAt })
  if (sessionErr) return res.status(500).json({ ok: false, message: '로그인 처리에 실패했습니다' })

  return res.status(200).json({ ok: true, token, email: account.email, companyName: account.company_name })
}

async function hubMeHandler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ ok: false })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: session } = await supabase.from('partner_hub_sessions').select('*').eq('token', token).maybeSingle()
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return res.status(401).json({ ok: false })

  const { data: account } = await supabase.from('partner_hub_accounts').select('*').eq('id', session.account_id).maybeSingle()
  if (!account) return res.status(401).json({ ok: false })
  return res.status(200).json({ ok: true, email: account.email, companyName: account.company_name })
}

async function hubLogoutHandler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token) {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
    await supabase.from('partner_hub_sessions').delete().eq('token', token)
  }
  return res.status(200).json({ ok: true })
}

// ══════════ 4) 국군복지단 PX(WA몰) 입찰정보 자동수집 — welfare.mil.kr ══════════
// gov-support-sync(company-og.ts)와 같은 이유로 여기 얹었다: Vercel Hobby 12개 함수 제한 때문에
// 새 파일을 못 만들어서, 이미 있는 export-brand.ts에 크론 액션으로 추가(2026-08-24).
// welfare.mil.kr 입찰정보 게시판은(기업마당과 마찬가지로) 정적 서버렌더링 HTML이라 fetch+정규식으로
// 충분히 파싱 가능함을 실제 HTML 확인 후 진행(헤드리스 브라우저 불필요).
interface MilitaryPxItem {
  bmSerial: string
  title: string
  regDate: string | null
  url: string
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch(() => {})
}

async function fetchMilitaryPxList(): Promise<MilitaryPxItem[]> {
  const res = await fetch('https://www.welfare.mil.kr/board/board.do?m_code=124&be_id=c_bid', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const html = await res.text()
  const items: MilitaryPxItem[] = []
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) {
    const row = m[1]
    const linkM = row.match(/bm_serial=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/)
    if (!linkM) continue
    const [, bmSerial, rawTitle] = linkM
    const title = rawTitle.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const tds = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((t) => t[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    // tds: [0]번호 [1]제목(위에서 별도 추출) [2]글쓴이 [3]등록일 [4]조회
    const regDate = tds[3]?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null
    items.push({
      bmSerial,
      title,
      regDate,
      url: `https://www.welfare.mil.kr/board/board.do?forwardName=board.view&be_id=c_bid&bm_serial=${bmSerial}&m_code=124`,
    })
  }
  return items
}

async function militaryPxSyncHandler(req: VercelRequest, res: VercelResponse) {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' })
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  let items: MilitaryPxItem[] = []
  try {
    items = await fetchMilitaryPxList()
  } catch (e) {
    console.error('[military-px-sync] 조회 실패:', e)
    return res.status(500).json({ ok: false, error: '게시판 조회 실패' })
  }

  const { data: existingRows } = await supabase.from('military_px_notices').select('bm_serial')
  const existingIds = new Set((existingRows ?? []).map((r) => r.bm_serial as string))
  const newItems = items.filter((it) => !existingIds.has(it.bmSerial))

  if (items.length > 0) {
    const { error } = await supabase.from('military_px_notices').upsert(
      items.map((it) => ({ bm_serial: it.bmSerial, title: it.title, reg_date: it.regDate, url: it.url })),
      { onConflict: 'bm_serial' }
    )
    if (error) return res.status(500).json({ ok: false, error: error.message })
  }

  if (newItems.length > 0) {
    let msg = `📢 국군복지단 PX 신규 공고 ${newItems.length}건 (/partners/military-px 반영됨)\n\n`
    for (const it of newItems.slice(0, 10)) msg += `• ${it.title}\n  ${it.url}\n\n`
    if (newItems.length > 10) msg += `...외 ${newItems.length - 10}건`
    await sendTelegram(msg.trim())
  }

  return res.status(200).json({ ok: true, checked: items.length, new: newItems.length })
}

// ── 액션 라우터 ──
// military-px-sync는 Vercel Cron이 GET으로 호출하므로(다른 액션은 전부 브라우저 fetch POST)
// 아래에서 메서드 체크보다 먼저 분기한다 — company-og.ts의 job 분기와 같은 이유.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action || '')
  if (!SERVICE_ROLE) return res.status(503).json({ message: '서버 설정이 없습니다' })
  if (action === 'military-px-sync') return militaryPxSyncHandler(req, res)

  if (req.method !== 'POST') return res.status(405).json({ message: 'POST only' })
  if (action === 'welcome') return welcomeHandler(req, res)
  if (action === 'translate') return translateHandler(req, res)
  if (action === 'hub-send-code') return hubSendCodeHandler(req, res)
  if (action === 'hub-verify-code') return hubVerifyCodeHandler(req, res)
  if (action === 'hub-me') return hubMeHandler(req, res)
  if (action === 'hub-logout') return hubLogoutHandler(req, res)
  return res.status(400).json({ message: 'action이 올바르지 않습니다' })
}
