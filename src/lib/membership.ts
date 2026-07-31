import { supabase } from './supabase'

// 회원 등급제 — 누적 구매금액(결제완료 이후 상태의 주문 합계, 배송비 제외) 기준
// 적립률은 안내용(적립금 실사용은 결제 오픈 후 활성화)
// 등급 자체는 membership_tiers 테이블(관리자 설정 가능)에서 불러오고, 테이블이 비어있거나
// 조회에 실패하면 DEFAULT_TIERS로 폴백한다(supabase/membership_tiers.sql 미적용 환경 대비).

export interface MembershipTier {
  key: string
  label: string
  min: number // 누적 구매금액 하한(원)
  rewardRate: number // 적립률(%)
  color: string // 배지 색
  bg: string
}

// 등급 배지는 색 대신 잉크 농도로만 단계를 구분한다(원색은 신호 전용 — 등급은 신호가 아니라 상태 표시).
const DEFAULT_TIERS: MembershipTier[] = [
  { key: 'BASIC', label: 'BASIC', min: 0, rewardRate: 1, color: '#8E9199', bg: '#F4F5F7' },
  { key: 'SILVER', label: 'SILVER', min: 100_000, rewardRate: 2, color: '#5B5E66', bg: '#F4F5F7' },
  { key: 'GOLD', label: 'GOLD', min: 300_000, rewardRate: 3, color: '#17181C', bg: '#FFFFFF' },
  { key: 'VIP', label: 'VIP', min: 700_000, rewardRate: 5, color: '#FFFFFF', bg: '#17181C' },
]

let cachedTiers: MembershipTier[] | null = null

// 등급표 조회(관리자 설정) — 세션 중 1회만 조회 후 캐시(관리자가 등급을 바꾸면 새로고침 시 반영).
export async function getTiers(): Promise<MembershipTier[]> {
  if (cachedTiers) return cachedTiers
  const { data, error } = await supabase
    .from('membership_tiers')
    .select('tier_key, label, min_spent, reward_rate, color, bg')
    .order('min_spent', { ascending: true })

  if (error || !data || data.length === 0) return DEFAULT_TIERS

  cachedTiers = data.map((t) => ({
    key: t.tier_key as string,
    label: t.label as string,
    min: Number(t.min_spent),
    rewardRate: Number(t.reward_rate),
    color: t.color as string,
    bg: t.bg as string,
  }))
  return cachedTiers
}

// 누적 구매금액으로 등급 산정
export function calcTier(tiers: MembershipTier[], totalSpent: number): MembershipTier {
  let tier = tiers[0]
  for (const t of tiers) if (totalSpent >= t.min) tier = t
  return tier
}

// 다음 등급과 남은 금액 (최고 등급이면 null)
export function nextTierInfo(tiers: MembershipTier[], totalSpent: number): { next: MembershipTier; remain: number } | null {
  const next = tiers.find((t) => t.min > totalSpent)
  if (!next) return null
  return { next, remain: next.min - totalSpent }
}

export interface MembershipInfo {
  totalSpent: number
  tier: MembershipTier
  next: { next: MembershipTier; remain: number } | null
}

// 내 등급 조회 — 결제완료(paid) 이후 단계(shipped/done 포함)의 주문 합계.
// 배송비 행(order_name='배송비', product_id 없음)은 구매금액에서 제외.
export async function getMyMembership(): Promise<MembershipInfo> {
  const tiers = await getTiers()
  const { data: { session } } = await supabase.auth.getSession()
  const empty: MembershipInfo = { totalSpent: 0, tier: tiers[0], next: nextTierInfo(tiers, 0) }
  if (!session) return empty

  const { data } = await supabase
    .from('orders')
    .select('amount, status, product_id, order_name')
    .eq('user_id', session.user.id)
    .in('status', ['paid', 'shipped', 'done'])

  const rows = (data ?? []) as { amount: number; product_id: string | null; order_name: string | null }[]
  const totalSpent = rows
    .filter((r) => r.product_id && r.order_name !== '배송비')
    .reduce((s, r) => s + (r.amount || 0), 0)

  return { totalSpent, tier: calcTier(tiers, totalSpent), next: nextTierInfo(tiers, totalSpent) }
}
