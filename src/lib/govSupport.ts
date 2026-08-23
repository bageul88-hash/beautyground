import { supabase } from './supabase'

// 정부지원사업 정보(/partners/gov-support) — 기업마당(bizinfo.go.kr) 공고를 서버 크론
// (api/gov-support-sync.ts)이 매일 자동 수집해 gov_support_programs_public 뷰로 노출.
// PartnerHub의 수기 게시물(partnerHub.ts)과 별개 소스 — PartnerHubList가 gov_support 카테고리일 때 함께 보여준다.
export type GovSupportCategory = '금융' | '기술' | '인력' | '수출' | '내수' | '창업' | '경영' | '기타'

export interface GovSupportProgram {
  id: string
  title: string
  category: GovSupportCategory | null
  org: string | null
  region: string | null
  apply_period: string | null
  reg_date: string | null
  url: string
  first_seen_at: string
}

export async function fetchGovSupportPrograms(): Promise<GovSupportProgram[]> {
  const { data } = await supabase
    .from('gov_support_programs_public')
    .select('*')
    .order('first_seen_at', { ascending: false })
    .limit(200)
  return (data ?? []) as GovSupportProgram[]
}
