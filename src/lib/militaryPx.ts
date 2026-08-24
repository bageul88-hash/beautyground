import { supabase } from './supabase'

// 국군복지단 PX(WA몰) 입찰정보 — welfare.mil.kr 입찰정보 게시판을 서버 크론
// (api/export-brand.ts?action=military-px-sync)이 매일 자동 수집해 military_px_notices_public
// 뷰로 노출. PartnerHub의 수기 게시물(partnerHub.ts)과 별개 소스 — PartnerHubList가
// military_px 카테고리일 때 함께 보여준다(gov_support/govSupport.ts와 동일 패턴).
export interface MilitaryPxNotice {
  id: string
  title: string
  reg_date: string | null
  url: string
  first_seen_at: string
}

export async function fetchMilitaryPxNotices(): Promise<MilitaryPxNotice[]> {
  const { data } = await supabase
    .from('military_px_notices_public')
    .select('*')
    .order('first_seen_at', { ascending: false })
    .limit(200)
  return (data ?? []) as MilitaryPxNotice[]
}
