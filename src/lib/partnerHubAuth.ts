// 파트너 허브(/partners) 전용 계정 — 쇼핑몰 회원가입(Supabase Auth)과 완전히 독립된 시스템.
// 세션은 서버가 발급한 랜덤 토큰을 localStorage에 저장해서 유지한다(Supabase 세션 아님).
const SESSION_KEY = 'bg_partner_hub_session'

export interface PartnerHubSession {
  token: string
  email: string
  companyName: string | null
}

export function getStoredSession(): PartnerHubSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as PartnerHubSession) : null
  } catch {
    return null
  }
}

function storeSession(session: PartnerHubSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function sendLoginCode(email: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/export-brand?action=hub-send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && data.ok, message: data.message }
}

export async function verifyLoginCode(email: string, code: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/export-brand?action=hub-verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.ok) {
    storeSession({ token: data.token, email: data.email, companyName: data.companyName ?? null })
    return { ok: true }
  }
  return { ok: false, message: data.message }
}

// 페이지 로드 시 저장된 토큰이 아직 유효한지 서버에서 재확인(만료/로그아웃 대비).
export async function refreshSession(): Promise<PartnerHubSession | null> {
  const stored = getStoredSession()
  if (!stored) return null
  const res = await fetch('/api/export-brand?action=hub-me', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stored.token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.ok) {
    const next = { token: stored.token, email: data.email, companyName: data.companyName ?? null }
    storeSession(next)
    return next
  }
  clearStoredSession()
  return null
}

export async function logout(): Promise<void> {
  const stored = getStoredSession()
  if (stored) {
    await fetch('/api/export-brand?action=hub-logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stored.token}` },
    }).catch(() => {})
  }
  clearStoredSession()
}
