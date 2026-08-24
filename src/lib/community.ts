import { supabase } from './supabase'

// 브랜드 회원사 전용 커뮤니티(/brand/community) 공유 로직 — partnerHub.ts와 같은 패턴.
// community_posts_feed 뷰가 접근권한(work=브랜드 회원 전체, life=구독자만)을 이미 필터링해서
// 반환하므로, 프론트는 그냥 조회만 하면 된다(RLS 위반 시 빈 배열/null로 돌아옴).
export type CommunityCategory = 'work' | 'life'

export const COMMUNITY_CATEGORY_META: Record<CommunityCategory, { label: string; short: string }> = {
  work: { label: '업무', short: '뷰티그라운드 소식' },
  life: { label: '사는이야기', short: '음악·영화·여행 같은 사는 이야기' },
}

export interface CommunityPost {
  id: string
  category: CommunityCategory
  tags: string[] | null
  title: string
  excerpt: string | null
  body: string
  thumbnail_url: string | null
  published_at: string
}

export async function fetchCommunityFeed(category: CommunityCategory): Promise<CommunityPost[]> {
  const { data } = await supabase
    .from('community_posts_feed')
    .select('*')
    .eq('category', category)
    .order('published_at', { ascending: false })
  return (data ?? []) as CommunityPost[]
}

export async function fetchCommunityPostById(id: string): Promise<CommunityPost | null> {
  const { data } = await supabase.from('community_posts_feed').select('*').eq('id', id).maybeSingle()
  return (data as CommunityPost | null) ?? null
}

export async function isFollowingLife(partnerId: string): Promise<boolean> {
  const { data } = await supabase
    .from('community_category_follows')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('category', 'life')
    .maybeSingle()
  return !!data
}

export async function followLifeCategory(partnerId: string) {
  const { error } = await supabase
    .from('community_category_follows')
    .insert({ partner_id: partnerId, category: 'life' })
  if (error) throw error
}

export async function unfollowLifeCategory(partnerId: string) {
  const { error } = await supabase
    .from('community_category_follows')
    .delete()
    .eq('partner_id', partnerId)
    .eq('category', 'life')
  if (error) throw error
}
