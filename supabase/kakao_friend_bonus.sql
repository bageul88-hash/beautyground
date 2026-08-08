-- 카카오톡 채널 친구추가 혜택: 무료배송 쿠폰 + 적립금 3,000원 (3만원 이상 구매 시)
-- ⚠️ 반드시 supabase/signup_bonus.sql을 먼저(또는 같이) 실행할 것 — coupon_templates/user_coupons/point_transactions 테이블을 그대로 재사용함.
-- 검증 방식: 자율신고(버튼 클릭 시 즉시 지급) — 카카오 비즈니스 채널의 "친구추가 여부 확인" API 인증이
-- 아직 확보되지 않아 2026-08-08 대표님 확정으로 우선 이 방식 채택. 나중에 API 인증되면 claim_kakao_friend_bonus를
-- 실제 친구 여부 확인 후 지급하도록 바꾸면 됨(호출부 프론트 코드는 그대로 두고 이 함수만 교체).
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

insert into coupon_templates (id, label, discount_type, discount_value, max_discount, min_order_amount) values
  ('kakao_friend_freeship', '카카오 친구추가 무료배송 쿠폰', 'free_shipping', 0, null, 30000)
on conflict (id) do nothing;

-- 1인 1회 지급 방지용 신청 기록
create table if not exists kakao_friend_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table kakao_friend_claims enable row level security;
drop policy if exists "본인 신청 내역만 조회" on kakao_friend_claims;
create policy "본인 신청 내역만 조회" on kakao_friend_claims for select using (auth.uid() = user_id);

-- 혜택 신청(자율신고) — 이미 신청한 적 있으면 false, 최초 신청이면 적립금+쿠폰 지급 후 true.
create or replace function public.claim_kakao_friend_bonus()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz := now() + interval '30 days';
begin
  insert into kakao_friend_claims (user_id) values (auth.uid())
  on conflict (user_id) do nothing;

  if not found then
    return false; -- 이미 신청한 사용자
  end if;

  insert into point_transactions (user_id, amount, reason, expires_at)
  values (auth.uid(), 3000, 'kakao_friend_bonus', v_expires);

  insert into user_coupons (user_id, template_id, expires_at)
  values (auth.uid(), 'kakao_friend_freeship', v_expires);

  return true;
end;
$$;
grant execute on function public.claim_kakao_friend_bonus() to authenticated;

create or replace function public.has_claimed_kakao_friend_bonus()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from kakao_friend_claims where user_id = auth.uid());
$$;
grant execute on function public.has_claimed_kakao_friend_bonus() to authenticated;
