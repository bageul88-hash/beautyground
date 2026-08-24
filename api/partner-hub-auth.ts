import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

// 파트너 허브(/partners) 전용 계정 시스템 — ?action=send-code(인증코드 발송) | verify-code(인증
// 후 로그인/가입) | me(세션 토큰으로 본인 조회) | logout(세션 폐기)
// Supabase Auth(auth.users, 쇼핑몰 회원가입과 공유)를 아예 쓰지 않는다 — 이 3개 테이블
// (partner_hub_accounts/login_codes/sessions)은 anon 직접 접근이 막혀있어 이 서버 함수를
// 통해서만 드나든다(service_role 키 사용). "쇼핑몰 회원가입과는 독립적이어야 한다"는 요구사항
// 때문에 의도적으로 분리(2026-08-24).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''

const CODE_TTL_MS = 10 * 60 * 1000 // 10분
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30일
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function genCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

function codeEmailHtml(code: string) {
  return `
  <div style="font-family:-apple-system,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;background:#FAFAF8;">
    <p style="font-size:12px;letter-spacing:0.2em;color:#5B6EF5;font-weight:700;text-transform:uppercase;">BEAUTYGROUND PARTNER HUB</p>
    <p style="font-size:15px;color:#111;line-height:1.7;margin-top:16px;">아래 인증코드를 입력해 주세요. 10분간 유효합니다.</p>
    <p style="font-size:32px;font-weight:800;letter-spacing:0.15em;color:#111;background:#fff;border:1px solid #E5E0D8;border-radius:10px;padding:16px 20px;text-align:center;margin:20px 0;">${code}</p>
    <p style="font-size:12px;color:#8A8577;">본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
  </div>`
}

async function sendCodeHandler(req: VercelRequest, res: VercelResponse) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(503).json({ ok: false, message: '메일 발송 설정이 없습니다' })
  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) as { email?: string }
  const email = (body?.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, message: '올바른 이메일 주소를 입력해 주세요' })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const code = genCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()
  const { error: insertErr } = await supabase.from('partner_hub_login_codes').insert({ email, code, expires_at: expiresAt })
  if (insertErr) return res.status(500).json({ ok: false, message: '코드 생성에 실패했습니다' })

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  try {
    await transporter.sendMail({
      from: `"뷰티그라운드 파트너 허브" <${GMAIL_USER}>`,
      to: email,
      subject: `[뷰티그라운드] 인증코드 ${code}`,
      html: codeEmailHtml(code),
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[partner-hub-auth:send-code] 발송 실패:', e)
    return res.status(500).json({ ok: false, message: '메일 발송에 실패했습니다' })
  }
}

async function verifyCodeHandler(req: VercelRequest, res: VercelResponse) {
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

  // 계정 upsert (없으면 최초 가입)
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
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const { error: sessionErr } = await supabase.from('partner_hub_sessions').insert({ token, account_id: account.id, expires_at: expiresAt })
  if (sessionErr) return res.status(500).json({ ok: false, message: '로그인 처리에 실패했습니다' })

  return res.status(200).json({ ok: true, token, email: account.email, companyName: account.company_name })
}

async function meHandler(req: VercelRequest, res: VercelResponse) {
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

async function logoutHandler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (token) {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
    await supabase.from('partner_hub_sessions').delete().eq('token', token)
  }
  return res.status(200).json({ ok: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'POST only' })
  if (!SERVICE_ROLE) return res.status(503).json({ ok: false, message: '서버 설정이 없습니다' })
  const action = String(req.query.action || '')
  if (action === 'send-code') return sendCodeHandler(req, res)
  if (action === 'verify-code') return verifyCodeHandler(req, res)
  if (action === 'me') return meHandler(req, res)
  if (action === 'logout') return logoutHandler(req, res)
  return res.status(400).json({ ok: false, message: 'unknown action' })
}
