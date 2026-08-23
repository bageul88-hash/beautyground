import { supabase } from './supabase'

// 브랜드 파트너 허브(/partners) 공유 로직 — 카테고리 메타, 게시물/방문자수 조회, 방문자수 증가.
// 이 페이지 전용 sessionStorage 키를 쓴다(attribution.ts의 VISIT_LOGGED_KEY와 다름) —
// App.tsx가 모든 페이지에서 logVisitOnce()를 이미 소모하므로 그 키를 재사용하면 이 카운터의
// "세션당 1회 증가"가 항상 막힌다.
const PARTNER_HUB_VISIT_KEY = 'bg_partner_hub_visit_v1'

export type PartnerHubCategory = 'gov_support' | 'dept_store' | 'operations'

export const CATEGORY_META: Record<PartnerHubCategory, { slug: string; label: string; short: string; emoji: string }> = {
  gov_support: { slug: 'gov-support', label: '정부지원사업', short: '뷰티 브랜드를 위한 정부·지자체 지원사업 정보', emoji: '🏛' },
  dept_store: { slug: 'dept-store', label: '백화점 입점', short: '백화점 입점 절차와 준비사항 안내', emoji: '🏢' },
  operations: { slug: 'operations', label: '브랜드 운영정보', short: '인증·유통·마케팅 등 브랜드 운영에 도움되는 정보', emoji: '📋' },
}

export function slugToCategory(slug: string): PartnerHubCategory | null {
  const found = (Object.entries(CATEGORY_META) as [PartnerHubCategory, (typeof CATEGORY_META)[PartnerHubCategory]][])
    .find(([, meta]) => meta.slug === slug)
  return found ? found[0] : null
}

export interface PartnerHubPost {
  id: string
  category: PartnerHubCategory
  title: string
  excerpt: string | null
  body: string
  thumbnail_url: string | null
  published_at: string
}

export async function fetchLatestPosts(limit = 8): Promise<PartnerHubPost[]> {
  const { data } = await supabase
    .from('partner_hub_posts_public')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as PartnerHubPost[]
}

export async function fetchPostsByCategory(category: PartnerHubCategory): Promise<PartnerHubPost[]> {
  const { data } = await supabase
    .from('partner_hub_posts_public')
    .select('*')
    .eq('category', category)
    .order('published_at', { ascending: false })
  return (data ?? []) as PartnerHubPost[]
}

export async function fetchPostById(id: string): Promise<PartnerHubPost | null> {
  const { data } = await supabase.from('partner_hub_posts_public').select('*').eq('id', id).maybeSingle()
  return (data as PartnerHubPost | null) ?? null
}

export async function fetchVisitorCount(): Promise<number> {
  const { data } = await supabase.from('partner_hub_counter_public').select('total_visits').maybeSingle()
  return (data as { total_visits: number } | null)?.total_visits ?? 0
}

// 세션당 1회만 실제로 증가 RPC를 호출한다. 이미 이 세션에서 호출했으면 null 반환(호출자는 기존
// fetchVisitorCount() 값을 그대로 쓰면 됨).
export async function bumpVisitorCountOnce(): Promise<number | null> {
  if (sessionStorage.getItem(PARTNER_HUB_VISIT_KEY)) return null
  sessionStorage.setItem(PARTNER_HUB_VISIT_KEY, '1')
  const { data, error } = await supabase.rpc('increment_partner_hub_visit')
  if (error) return null
  return data as number
}
