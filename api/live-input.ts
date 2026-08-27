import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// 라이브 송출 채널(Cloudflare Stream Live Input) 발급·조회.
//   GET  ?liveId=<id> : 내 라이브의 송출 주소(RTMPS)·스트림키·연결상태 조회
//   POST {liveId}     : 채널 생성 + lives.stream_uid 저장 (이미 있으면 기존 채널 반환)
//   POST {hostToken, markLive:true} : 상태를 live로 전환만 함(채널 생성 없이) — 진행자가
//     브라우저에서 실제 WebRTC 송출을 시작한 직후 호출. Vercel Hobby 플랜 서버리스 함수
//     12개 제한 때문에 별도 api/live-go-live.ts로 안 두고 여기 합침(2026-08-20).
//   POST {pushAction:'sendCoupon', userIds, title, body, image, url} : 관리자 쿠폰 생성기 발송
//     (admin/CouponGenerator.tsx) — admin_issue_coupon RPC로 이미 뽑은 대상에게 웹 푸시 발송.
//     같은 12개 함수 한도 이유로 여기 합침(2026-08-27).
// 스트림 키는 DB에 저장하지 않고 매번 Cloudflare에서 조회한다
// (lives 테이블은 소비자도 읽는 공개 테이블이라 키를 넣으면 방송 탈취 위험).
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CF_API = 'https://api.cloudflare.com/client/v4'

// 팔로우한 브랜드 라이브 시작 알림(웹 푸시). 같은 12개 함수 한도 이유로 이 파일에 합침.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:beautyground.official@gmail.com'
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// 방송이 live로 전환된 직후 호출 — 팔로워의 저장된 구독으로 실제 알림 발송.
// 발송 실패는 절대 방송 시작 응답을 막지 않는다(전체 try/catch).
async function sendLiveStartNotifications(
  supabase: SupabaseClient,
  live: { id: string; title: string; partner_id: string | null; host_id?: string | null }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  if (!live.partner_id && !live.host_id) return
  try {
    // 브랜드가 진행하는 라이브는 partner_follows, 매장(호스트)이 직접 여는 라이브는 host_follows —
    // 서로 다른 팔로우 대상이라 알림 문구도 브랜드명/매장명으로 갈린다.
    let notifyName = '뷰티그라운드'
    let userIds: string[] = []
    if (live.partner_id) {
      const { data: partner } = await supabase.from('partners').select('brand_name').eq('id', live.partner_id).single()
      notifyName = partner?.brand_name ?? notifyName
      const { data: follows } = await supabase.from('partner_follows').select('user_id').eq('partner_id', live.partner_id)
      userIds = (follows ?? []).map((f: { user_id: string }) => f.user_id)
    } else if (live.host_id) {
      const { data: host } = await supabase.from('hosts').select('name').eq('id', live.host_id).single()
      notifyName = host?.name ?? notifyName
      const { data: follows } = await supabase.from('host_follows').select('user_id').eq('host_id', live.host_id)
      userIds = (follows ?? []).map((f: { user_id: string }) => f.user_id)
    }
    if (userIds.length === 0) return

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)
    if (!subs || subs.length === 0) return

    const payload = JSON.stringify({
      title: `${notifyName} 라이브 시작`,
      body: live.title,
      data: { url: `/app/live/${live.id}` },
    })

    await Promise.all(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number } | null)?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error('[live-input] push send failed', sub.id, statusCode)
          }
        }
      })
    )
  } catch (err) {
    console.error('[live-input] sendLiveStartNotifications failed', err)
  }
}

interface CfLiveInput {
  uid: string
  rtmps?: { url?: string; streamKey?: string }
  webRTC?: { url?: string }
  status?: { current?: { state?: string } } | null
}

function toInfo(result: CfLiveInput) {
  return {
    ok: true,
    uid: result.uid,
    rtmpsUrl: result.rtmps?.url ?? null,
    streamKey: result.rtmps?.streamKey ?? null,
    webRtcUrl: result.webRTC?.url ?? null,
    connected: result.status?.current?.state === 'connected',
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'GET/POST 요청만 허용됩니다.' })
    return
  }
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, reason: '서버 환경변수 누락: SUPABASE_SERVICE_ROLE_KEY' })
    return
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  // 웹 푸시 구독 등록/해제 — 브랜드 팔로우 시 호출. 클라우드플레어 설정과 무관하므로 아래 CF 체크보다 먼저 처리.
  const pushAction = req.method === 'POST' ? (body as { pushAction?: string } | null)?.pushAction : undefined
  if (pushAction === 'subscribe' || pushAction === 'unsubscribe') {
    const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    if (!token) {
      res.status(401).json({ ok: false, reason: '로그인이 필요합니다.' })
      return
    }
    const { data: userData } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (!user) {
      res.status(401).json({ ok: false, reason: '세션이 만료되었습니다. 다시 로그인해 주세요.' })
      return
    }
    const { endpoint, keys } =
      (body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null) ?? {}
    if (!endpoint) {
      res.status(400).json({ ok: false, reason: 'endpoint 가 필요합니다.' })
      return
    }
    if (pushAction === 'subscribe') {
      if (!keys?.p256dh || !keys?.auth) {
        res.status(400).json({ ok: false, reason: 'keys 가 필요합니다.' })
        return
      }
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({ user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
      if (error) {
        res.status(500).json({ ok: false, reason: '구독 저장에 실패했습니다.' })
        return
      }
    } else {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
    }
    res.status(200).json({ ok: true })
    return
  }

  // 관리자 쿠폰 생성기 — 대상 회원에게 웹 푸시 일괄 발송. 같은 12개 함수 한도 이유로 이 파일에 합침(2026-08-27).
  // 발급 대상 user_id 목록은 admin_issue_coupon RPC(브라우저에서 먼저 호출)로 이미 계산돼 넘어온다.
  if (pushAction === 'sendCoupon') {
    const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    if (!token) {
      res.status(401).json({ ok: false, reason: '로그인이 필요합니다.' })
      return
    }
    const { data: userData } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (!user?.email) {
      res.status(401).json({ ok: false, reason: '세션이 만료되었습니다. 다시 로그인해 주세요.' })
      return
    }
    const { data: adminRow } = await supabase
      .from('app_admins')
      .select('email')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()
    if (!adminRow) {
      res.status(403).json({ ok: false, reason: '관리자만 쿠폰을 발송할 수 있습니다.' })
      return
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      res.status(501).json({ ok: false, reason: '웹 푸시(VAPID) 환경변수가 설정되지 않았습니다.' })
      return
    }
    const {
      userIds, title: pushTitle, body: pushBody, image: pushImage, url: pushUrl,
    } = (body as { userIds?: string[]; title?: string; body?: string; image?: string; url?: string } | null) ?? {}
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ ok: false, reason: '발송 대상이 없습니다.' })
      return
    }
    if (!pushTitle || !pushBody) {
      res.status(400).json({ ok: false, reason: 'title/body 가 필요합니다.' })
      return
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)
    const payload = JSON.stringify({
      title: pushTitle,
      body: pushBody,
      image: pushImage || undefined,
      data: { url: pushUrl || '/app/benefits' },
    })

    let sent = 0
    await Promise.all(
      (subs ?? []).map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent += 1
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number } | null)?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error('[live-input] coupon push send failed', sub.id, statusCode)
          }
        }
      })
    )
    res.status(200).json({ ok: true, targeted: userIds.length, subscribed: (subs ?? []).length, sent })
    return
  }

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    res.status(501).json({
      ok: false,
      reason:
        '클라우드플레어 연동이 아직 설정되지 않았습니다. Vercel 환경변수에 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN(Stream 편집 권한)을 추가하세요.',
    })
    return
  }

  const hostToken =
    req.method === 'GET'
      ? String(req.query.hostToken ?? '')
      : String((body as { hostToken?: string } | null)?.hostToken ?? '')
  const markLive = req.method === 'POST' && (body as { markLive?: boolean } | null)?.markLive === true
  let liveId =
    req.method === 'GET'
      ? String(req.query.liveId ?? '')
      : String((body as { liveId?: string } | null)?.liveId ?? '')

  let authorized = false

  if (hostToken) {
    // 링크(토큰) 방식 — 로그인 없이 진행자 본인 확인. 유효성(기간·종료여부)은 RPC 안에서 검사.
    const { data: liveRow, error: rpcErr } = await supabase.rpc('get_live_by_host_token', {
      p_token: hostToken,
    })
    if (rpcErr || !liveRow) {
      res.status(403).json({ ok: false, reason: rpcErr?.message ?? '유효하지 않은 링크입니다.' })
      return
    }
    liveId = liveRow.id
    authorized = true

    if (markLive) {
      const { error: upErr } = await supabase
        .from('lives')
        .update({ status: 'live' })
        .eq('id', liveId)
        .neq('status', 'ended')
      if (upErr) {
        res.status(500).json({ ok: false, reason: '상태 변경에 실패했습니다.' })
        return
      }
      await sendLiveStartNotifications(supabase, {
        id: liveId,
        title: String(liveRow.title ?? ''),
        partner_id: (liveRow.partner_id as string | null) ?? null,
        host_id: (liveRow.host_id as string | null) ?? null,
      })
      res.status(200).json({ ok: true })
      return
    }
  } else {
    // 로그인한 파트너/진행자 본인 확인 (Supabase 액세스 토큰) — 기존 방식(관리자·브랜드센터용)
    const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    if (!token) {
      res.status(401).json({ ok: false, reason: '로그인이 필요합니다.' })
      return
    }
    const { data: userData } = await supabase.auth.getUser(token)
    const user = userData?.user
    if (!user) {
      res.status(401).json({ ok: false, reason: '세션이 만료되었습니다. 다시 로그인해 주세요.' })
      return
    }
    if (!liveId) {
      res.status(400).json({ ok: false, reason: 'liveId 가 필요합니다.' })
      return
    }
    const { data: live } = await supabase
      .from('lives')
      .select('id, title, partner_id, host_id, stream_uid')
      .eq('id', liveId)
      .single()
    if (!live) {
      res.status(404).json({ ok: false, reason: '라이브를 찾을 수 없습니다.' })
      return
    }
    if (live.partner_id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id, user_id')
        .eq('id', live.partner_id)
        .single()
      if (partner && partner.user_id === user.id) authorized = true
    }
    if (!authorized && live.host_id) {
      const { data: host } = await supabase
        .from('hosts')
        .select('id, user_id')
        .eq('id', live.host_id)
        .single()
      if (host && host.user_id === user.id) authorized = true
    }
    if (!authorized) {
      res.status(403).json({ ok: false, reason: '본인 라이브만 관리할 수 있습니다.' })
      return
    }
  }

  const { data: live } = await supabase
    .from('lives')
    .select('id, title, stream_uid')
    .eq('id', liveId)
    .single()
  if (!live) {
    res.status(404).json({ ok: false, reason: '라이브를 찾을 수 없습니다.' })
    return
  }

  const cfHeaders = {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  // 생성 (이미 채널이 있으면 아래 조회로 폴스루)
  if (req.method === 'POST' && !live.stream_uid) {
    const r = await fetch(`${CF_API}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`, {
      method: 'POST',
      headers: cfHeaders,
      body: JSON.stringify({
        meta: { name: live.title },
        recording: { mode: 'automatic' }, // 자동 녹화 → 추후 다시보기용
      }),
    })
    const j = (await r.json()) as { success?: boolean; result?: CfLiveInput; errors?: unknown }
    if (!r.ok || !j.success || !j.result) {
      console.error('[live-input] create failed', r.status, JSON.stringify(j.errors ?? j))
      res.status(502).json({ ok: false, reason: `클라우드플레어 채널 생성 실패 (${r.status})` })
      return
    }
    const { error: upErr } = await supabase
      .from('lives')
      .update({ stream_uid: j.result.uid })
      .eq('id', liveId)
    if (upErr) {
      console.error('[live-input] stream_uid save failed', upErr)
      res.status(500).json({ ok: false, reason: '채널은 생성됐으나 저장에 실패했습니다. 다시 시도해 주세요.' })
      return
    }
    res.status(200).json(toInfo(j.result))
    return
  }

  // 조회
  if (!live.stream_uid) {
    res.status(404).json({ ok: false, reason: '송출 채널이 아직 없습니다. 먼저 채널을 만들어 주세요.' })
    return
  }
  const r = await fetch(
    `${CF_API}/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${live.stream_uid}`,
    { headers: cfHeaders }
  )
  const j = (await r.json()) as { success?: boolean; result?: CfLiveInput; errors?: unknown }
  if (!r.ok || !j.success || !j.result) {
    console.error('[live-input] fetch failed', r.status, JSON.stringify(j.errors ?? j))
    res.status(502).json({ ok: false, reason: `송출 채널 조회 실패 (${r.status})` })
    return
  }
  res.status(200).json(toInfo(j.result))
}
