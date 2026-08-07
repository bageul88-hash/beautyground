// 유입 경로(마케팅 어트리뷰션) — 광고 픽셀 없이도 utm 파라미터·리퍼러로 "어디서 왔는지"를 기록한다.
// 최초 유입(퍼스트터치)만 잡고, 이후 방문에서는 덮어쓰지 않는다 — 실제로 그 손님을 데려온
// 채널의 공을 계속 인정하기 위함(마지막에 그냥 재방문한 채널로 바뀌지 않게).
import { supabase } from './supabase'

const ATTRIB_KEY = 'bg_attrib_v1'
const VISIT_LOGGED_KEY = 'bg_visit_logged_v1'
const USER_SYNCED_KEY = 'bg_attrib_synced_v1'

export type Attribution = {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  referrer_domain: string
  landing_path: string
}

const REFERRER_LABELS: Array<[RegExp, string]> = [
  [/naver\.com$/i, 'naver.com'],
  [/google\.[a-z.]+$/i, 'google.com'],
  [/(instagram\.com)$/i, 'instagram.com'],
  [/(facebook\.com|fb\.com)$/i, 'facebook.com'],
  [/kakao\.com$|kakaocorp\.com$/i, 'kakao.com'],
  [/youtube\.com$/i, 'youtube.com'],
]

function referrerDomain(referrer: string): string {
  if (!referrer) return '직접접속'
  try {
    const host = new URL(referrer).hostname.replace(/^www\.|^m\.|^l\./, '')
    for (const [re, label] of REFERRER_LABELS) if (re.test(host)) return label
    return host || '직접접속'
  } catch {
    return '직접접속'
  }
}

// 첫 방문에서 한 번만 저장 — 이후 방문/페이지 이동에서는 유지.
export function captureAttributionOnce(): Attribution {
  const existing = localStorage.getItem(ATTRIB_KEY)
  if (existing) {
    try { return JSON.parse(existing) as Attribution } catch { /* 손상됐으면 새로 만듦 */ }
  }
  const params = new URLSearchParams(window.location.search)
  const attrib: Attribution = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    referrer_domain: referrerDomain(document.referrer),
    landing_path: window.location.pathname,
  }
  localStorage.setItem(ATTRIB_KEY, JSON.stringify(attrib))
  return attrib
}

// 브라우저 세션(탭 새로고침 포함, 탭 닫으면 초기화)당 방문 로그 1건만 남긴다.
export async function logVisitOnce() {
  if (sessionStorage.getItem(VISIT_LOGGED_KEY)) return
  sessionStorage.setItem(VISIT_LOGGED_KEY, '1')
  const a = captureAttributionOnce()
  const device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
  await supabase.from('site_visits').insert({
    utm_source: a.utm_source || null,
    utm_medium: a.utm_medium || null,
    utm_campaign: a.utm_campaign || null,
    referrer_domain: a.referrer_domain,
    landing_path: a.landing_path,
    device,
  })
}

// 로그인 상태를 감지했을 때 호출 — 이메일 가입이든 카카오/네이버 소셜 로그인이든 상관없이,
// 그 계정에 아직 유입정보가 없으면 최초 유입정보를 한 번만 심어준다(가입 채널 = 그 사람을
// 데려온 채널로 영구 기록). 이미 있으면 아무것도 하지 않는다.
export async function syncAttributionToUser() {
  if (sessionStorage.getItem(USER_SYNCED_KEY)) return
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return
  const meta = user.user_metadata as Record<string, unknown> | undefined
  if (meta && (meta.utm_source || meta.referrer_domain)) {
    sessionStorage.setItem(USER_SYNCED_KEY, '1')
    return
  }
  const a = captureAttributionOnce()
  await supabase.auth.updateUser({
    data: {
      utm_source: a.utm_source,
      utm_medium: a.utm_medium,
      utm_campaign: a.utm_campaign,
      referrer_domain: a.referrer_domain,
      landing_path: a.landing_path,
    },
  })
  sessionStorage.setItem(USER_SYNCED_KEY, '1')
}
