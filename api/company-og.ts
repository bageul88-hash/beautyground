import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// /company 링크 공유 시 미리보기(OG)를 쇼핑몰 네이밍 대신 회사소개서용으로 바꿔서 내보낸다.
// SPA라 라우트별 메타태그가 불가능하므로, 이 함수가 index.html을 받아 head 메타만 치환해 반환한다.
// (크롤러·사용자 모두 동일 HTML — 앱 번들이 그대로 로드되므로 화면은 기존 /company 페이지와 동일)

const OG_TITLE = 'LIFE IS BEAUTY'
const OG_DESC = '뷰티그라운드 회사소개서'

// ── ?job=gov-support-sync ──────────────────────────────────────────────────
// 정부지원사업(기업마당) 자동수집 크론(Vercel Cron, vercel.json)도 이 파일에 얹혀 있다.
// Vercel Hobby 플랜의 "배포당 서버리스 함수 12개" 제한에 이미 걸려 있어(2026-08-24 실측),
// 새 함수 파일을 늘리는 대신 가장 가볍고 무관한 기존 엔드포인트에 쿼리 분기로 얹었다.
// 나중에 이런 유틸성 크론이 더 늘어나면 그때 Pro 플랜 업그레이드를 고려할 것.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

const GOV_SUPPORT_KEYWORDS = ['화장품', '뷰티', '소상공인', '스마트상점', '온라인쇼핑몰', '판로지원', '라이브커머스', '전자상거래']

interface BizinfoItem {
  pblancId: string
  title: string
  category: string | null
  org: string | null
  region: string | null
  applyPeriod: string | null
  regDate: string | null
  url: string
}

function toIsoDate(s: string | null): string | null {
  if (!s) return null
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

async function fetchBizinfoList(keyword: string): Promise<BizinfoItem[]> {
  const url =
    'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do?' +
    new URLSearchParams({
      rows: '15',
      cpage: '1',
      schEndAt: 'N',
      condition: 'searchPblancNm',
      condition1: 'AND',
      keyword,
    }).toString()

  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const html = await res.text()
  const items: BizinfoItem[] = []
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(html))) {
    const row = m[1]
    const linkM = row.match(/selectSIIA200Detail\.do\?[^"]*pblancId=(PBLN_\d+)"[^>]*title="([^"]+?)\s*페이지 이동"/)
    if (!linkM) continue
    const [, pblancId, title] = linkM
    const tds = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((t) => t[1].replace(/\s+/g, ' ').trim())
    items.push({
      pblancId,
      title,
      category: tds[1] || null,
      applyPeriod: tds[2] || null,
      region: tds[3] || null,
      org: tds[4] || null,
      regDate: toIsoDate(tds[5] || null),
      url: `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${pblancId}`,
    })
  }
  return items
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch(() => {})
}

async function runGovSupportSync(req: VercelRequest, res: VercelResponse) {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, error: '서버 환경변수 누락: SUPABASE_SERVICE_ROLE_KEY' })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

  const byId = new Map<string, BizinfoItem>()
  for (const kw of GOV_SUPPORT_KEYWORDS) {
    try {
      const items = await fetchBizinfoList(kw)
      for (const it of items) byId.set(it.pblancId, it)
    } catch (e) {
      console.error(`[gov-support-sync] "${kw}" 조회 실패:`, e)
    }
  }

  const { data: existingRows } = await supabase.from('gov_support_programs').select('pblancid')
  const existingIds = new Set((existingRows ?? []).map((r) => r.pblancid as string))
  const newItems = Array.from(byId.values()).filter((it) => !existingIds.has(it.pblancId))

  if (byId.size > 0) {
    const { error } = await supabase.from('gov_support_programs').upsert(
      Array.from(byId.values()).map((it) => ({
        pblancid: it.pblancId,
        title: it.title,
        category: it.category,
        org: it.org,
        region: it.region,
        apply_period: it.applyPeriod,
        reg_date: it.regDate,
        url: it.url,
      })),
      { onConflict: 'pblancid', ignoreDuplicates: true }
    )
    if (error) {
      res.status(500).json({ ok: false, error: error.message })
      return
    }
  }

  if (newItems.length > 0) {
    let msg = `📢 정부 지원사업 신규 공고 ${newItems.length}건 (/partners/gov-support 반영됨)\n\n`
    for (const it of newItems.slice(0, 10)) {
      msg += `• ${it.title}\n  ${[it.org, it.region].filter(Boolean).join(' · ')}\n  ${it.url}\n\n`
    }
    if (newItems.length > 10) msg += `...외 ${newItems.length - 10}건`
    await sendTelegram(msg.trim())
  }

  res.status(200).json({ ok: true, checked: byId.size, new: newItems.length })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.job === 'gov-support-sync') {
    await runGovSupportSync(req, res)
    return
  }

  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'beautyground.co.kr'
  const origin = `https://${host}`
  let html: string
  try {
    const r = await fetch(`${origin}/index.html`)
    html = await r.text()
  } catch (e) {
    console.error('[company-og] index.html fetch 실패:', e)
    res.setHeader('Location', '/')
    res.status(302).end()
    return
  }

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${OG_TITLE} | ${OG_DESC}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${OG_DESC}" />`)
    .replace(/<meta\s+property="og:site_name"[\s\S]*?\/>/, `<meta property="og:site_name" content="BEAUTYGROUND" />`)
    .replace(/<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${OG_TITLE}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${OG_DESC}" />`)
    .replace(/<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${origin}/company" />`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate')
  res.status(200).send(html)
}
