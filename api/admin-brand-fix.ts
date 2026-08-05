import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 일회성 데이터 정리 스크립트 — 195개 상품이 전부 partner_id=뷰티그라운드로 뭉쳐있던 것을
// source_url 도메인 기준으로 실제 브랜드(partners row)에 재배정한다.
// 사용 후 이 파일은 삭제할 것.
const TEMP_SECRET = '2847482611f9628c05d961e6cc5743d3bb9df613d0e6c812'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bjqtuklkskrqzbuxdwxm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

// 도메인 → 브랜드명 (신규 partner 생성 시 사용할 이름)
const DOMAIN_BRAND: Record<string, string> = {
  'makeuphelper.co.kr': '메이크업헬퍼',
  'www.cellinffect.com': '셀인펙트',
  'bylimu.co.kr': '바이리뮤',
  'www.petitfee.com': '쁘띠페',
  'cerolabs.co.kr': '세로랩스',
  'kiwiglow.co.kr': '키위글로우',
  'ordique.com': '오디크',
  'navicle.co.kr': '나비클',
  'www.drlab.co.kr': '닥터랩',
  'cominglebeauty.com': '커밍글',
  'davydiffuser.com': '데이비디퓨저',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${TEMP_SECRET}`) {
    res.status(401).json({ ok: false, error: 'unauthorized' })
    return
  }
  if (!SERVICE_ROLE) {
    res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY 미설정' })
    return
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const mode = (req.query.mode as string) || 'diagnose'
  const bodyObj = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, partner_id, source_url')
    .limit(1000)
  if (prodErr) { res.status(500).json({ ok: false, error: prodErr.message }); return }

  const { data: partners, error: partErr } = await supabase
    .from('partners')
    .select('id, brand_name, user_id, status, commission_rate')
  if (partErr) { res.status(500).json({ ok: false, error: partErr.message }); return }

  const byDomain: Record<string, { count: number; ids: string[]; names: string[] }> = {}
  for (const p of products ?? []) {
    let domain = '(없음)'
    if (p.source_url) {
      try { domain = new URL(p.source_url).hostname } catch { domain = '(파싱실패)' }
    }
    if (!byDomain[domain]) byDomain[domain] = { count: 0, ids: [], names: [] }
    byDomain[domain].count++
    byDomain[domain].ids.push(p.id)
    byDomain[domain].names.push(p.name)
  }

  if (mode === 'diagnose') {
    res.status(200).json({
      ok: true,
      totalProducts: products?.length ?? 0,
      partners,
      byDomain: Object.fromEntries(
        Object.entries(byDomain).map(([d, v]) => [d, { count: v.count, sampleNames: v.names.slice(0, 3) }])
      ),
    })
    return
  }

  if (mode === 'apply') {
    const overrides = (bodyObj.domainBrand || {}) as Record<string, string>
    const mapping = { ...DOMAIN_BRAND, ...overrides }
    const results: Record<string, unknown> = {}

    for (const [domain, info] of Object.entries(byDomain)) {
      const brandName = mapping[domain]
      if (!brandName) {
        results[domain] = { skipped: true, reason: '매핑 없음', count: info.count }
        continue
      }
      // 기존 partner 조회, 없으면 생성
      let partner = (partners ?? []).find((pt) => pt.brand_name === brandName)
      if (!partner) {
        const { data: created, error: createErr } = await supabase
          .from('partners')
          .insert({ brand_name: brandName, status: 'active', commission_rate: 30 })
          .select('id, brand_name')
          .single()
        if (createErr) { results[domain] = { error: createErr.message }; continue }
        partner = created as { id: string; brand_name: string; user_id?: string | null; status?: string; commission_rate?: number }
      }
      const { error: updErr } = await supabase
        .from('products')
        .update({ partner_id: partner.id })
        .in('id', info.ids)
      results[domain] = updErr ? { error: updErr.message } : { updated: info.ids.length, partner_id: partner.id, brand_name: brandName }
    }

    res.status(200).json({ ok: true, results })
    return
  }

  res.status(400).json({ ok: false, error: 'mode는 diagnose 또는 apply' })
}
