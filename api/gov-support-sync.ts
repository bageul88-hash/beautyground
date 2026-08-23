import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 기업마당(bizinfo.go.kr) 정부지원사업 신규 공고를 매일 수집해 gov_support_programs에 저장하고
// (/partners/gov-support에서 공개 노출), 신규 건은 대표님 텔레그램으로도 알림.
// Vercel Cron이 매일 09:10 KST(vercel.json)에 GET으로 호출 — CRON_SECRET으로 외부 임의호출 차단.
// 원래 로컬 PC(Windows 작업스케줄러 + _scrape_automation/bizinfo-watch.mjs)에서 검증한 스크래핑
// 로직을 서버로 그대로 이식(2026-08-24) — PC가 꺼져 있어도 항상 최신 유지되도록.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const CRON_SECRET = process.env.CRON_SECRET

// 뷰티그라운드(오프라인 매장 + 온라인 커머스, 뷰티/스킨케어/헤어/바디/향수 전반) 관련 키워드
const KEYWORDS = ['화장품', '뷰티', '소상공인', '스마트상점', '온라인쇼핑몰', '판로지원', '라이브커머스', '전자상거래']

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

async function fetchList(keyword: string): Promise<BizinfoItem[]> {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  for (const kw of KEYWORDS) {
    try {
      const items = await fetchList(kw)
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
