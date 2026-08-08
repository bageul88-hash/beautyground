import { supabase } from './supabase'

// 적립금·쿠폰 — 신규가입 시 자동 지급(supabase/signup_bonus.sql, auth.users INSERT 트리거).
// 잔액/쿠폰 목록은 서버 RPC(get_my_points_balance/get_my_valid_coupons)로만 조회 — 만료 처리도 RPC 안에서 처리됨.

export interface ValidCoupon {
  id: string
  templateId: string
  label: string
  discountType: 'amount' | 'percent' | 'free_shipping'
  discountValue: number
  maxDiscount: number | null
  minOrderAmount: number
  expiresAt: string
}

export async function getMyPointsBalance(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0
  const { data, error } = await supabase.rpc('get_my_points_balance')
  if (error) return 0
  return Number(data ?? 0)
}

// 할인 미리보기 계산(화면 표시용) — 서버(payment-complete.ts)가 최종 검증 시 동일 로직으로 재계산함
export function couponDiscountFor(coupon: ValidCoupon, subtotal: number): number {
  if (subtotal < coupon.minOrderAmount) return 0
  if (coupon.discountType === 'free_shipping') return 0 // 배송비 자체를 0으로 만드는 방식이라 금액 할인 아님
  if (coupon.discountType === 'percent') {
    const raw = Math.round((subtotal * coupon.discountValue) / 100)
    return Math.min(raw, coupon.maxDiscount ?? raw, subtotal)
  }
  return Math.min(coupon.discountValue, subtotal)
}

// 결제 직전 적립금 사용 확정 — 원자적(동시 결제 경합 방지). 실패 시 예외 던짐.
export async function redeemPoints(amount: number, paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_points', { p_amount: amount, p_payment_id: paymentId })
  if (error) throw new Error(error.message)
}

export async function releasePoints(paymentId: string): Promise<void> {
  await supabase.rpc('release_points', { p_payment_id: paymentId })
}

// 결제 직전 쿠폰 사용 확정 — 성공 시 true, 이미 쓰였거나 만료 등으로 실패 시 false.
export async function redeemSignupCoupon(couponId: string, paymentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('redeem_signup_coupon', { p_coupon_id: couponId, p_payment_id: paymentId })
  if (error) return false
  return Array.isArray(data) && data.length > 0
}

export async function releaseSignupCoupon(paymentId: string): Promise<void> {
  await supabase.rpc('release_signup_coupon', { p_payment_id: paymentId })
}

// 카카오 친구추가 혜택(자율신고) — supabase/kakao_friend_bonus.sql. 이미 신청했으면 false 반환.
export async function claimKakaoFriendBonus(): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_kakao_friend_bonus')
  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function hasClaimedKakaoFriendBonus(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { data, error } = await supabase.rpc('has_claimed_kakao_friend_bonus')
  if (error) return false
  return Boolean(data)
}

export async function getMyValidCoupons(): Promise<ValidCoupon[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const { data, error } = await supabase.rpc('get_my_valid_coupons')
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map((c) => ({
    id: c.id as string,
    templateId: c.template_id as string,
    label: c.label as string,
    discountType: c.discount_type as ValidCoupon['discountType'],
    discountValue: Number(c.discount_value),
    maxDiscount: c.max_discount == null ? null : Number(c.max_discount),
    minOrderAmount: Number(c.min_order_amount),
    expiresAt: c.expires_at as string,
  }))
}
