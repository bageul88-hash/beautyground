-- 가입 혜택 개편 v2 (2026-08-18 대표님 수정안)
-- ① 가입 쿠폰: 10만원 이상 5,000원 / 5만원 이상 2,000원 (기존 10%·무료배송 쿠폰은 신규 발급 중단)
-- ② 적립금 3,000원 유지 — 사용 조건 "3만원 이상 구매"는 결제 검증(payment-complete.ts)에서 강제
-- ③ 혜택은 1회만: 탈퇴 후 재가입해도 같은 카카오 계정(이메일)·전화번호면 지급 안 함
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

-- 1) 쿠폰 템플릿 개편
update coupon_templates set label = '5,000원 할인 쿠폰(10만원 이상)', min_order_amount = 100000 where id = 'signup_5000';
insert into coupon_templates (id, label, discount_type, discount_value, max_discount, min_order_amount) values
  ('signup_2000', '2,000원 할인 쿠폰(5만원 이상)', 'amount', 2000, null, 50000)
on conflict (id) do nothing;
-- 신규 발급 중단(이미 발급된 쿠폰은 그대로 사용 가능)
update coupon_templates set active = false where id in ('signup_10pct', 'signup_freeship');

-- 2) 혜택 1회 지급 원장 — 탈퇴 후 재가입 감지용 (카카오 계정 이메일·전화번호 기준)
create table if not exists benefit_claims (
  benefit text not null,          -- 'signup' | 'kakao_friend'
  identity_key text not null,     -- lower(email) 또는 phone
  user_id uuid,                   -- 참고용(탈퇴하면 남는 기록이 목적이라 FK 없음)
  claimed_at timestamptz not null default now(),
  primary key (benefit, identity_key)
);
alter table benefit_claims enable row level security; -- 정책 없음 = 클라이언트 접근 차단(트리거·서버만 접근)

-- 3) 가입 트리거 v2 — 명시된 쿠폰만 지급 + 재가입 중복 지급 차단
--    (기존 트리거는 active=true 템플릿 전체를 지급해서 카카오 친구추가 쿠폰까지 가입 시 지급되던 문제도 함께 수정)
create or replace function public.handle_new_user_signup_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz := now() + interval '30 days';
  v_keys text[];
  v_dup boolean;
begin
  -- 신원 키: 카카오 계정 이메일 + 전화번호(있으면). 탈퇴해도 benefit_claims에 기록이 남는다.
  v_keys := array_remove(array[lower(nullif(new.email, '')), nullif(new.phone, '')], null);
  if array_length(v_keys, 1) is null then
    v_keys := array[new.id::text]; -- 이메일·전화 둘 다 없으면 차단 불가 — 계정 id로 기록만
  end if;

  select exists(select 1 from benefit_claims where benefit = 'signup' and identity_key = any(v_keys)) into v_dup;
  if v_dup then
    return new; -- 탈퇴 후 재가입 — 혜택 없음
  end if;

  insert into benefit_claims (benefit, identity_key, user_id)
  select 'signup', k, new.id from unnest(v_keys) as k
  on conflict do nothing;

  insert into point_transactions (user_id, amount, reason, expires_at)
  values (new.id, 3000, 'signup_bonus', v_expires);

  insert into user_coupons (user_id, template_id, expires_at)
  select new.id, t, v_expires from unnest(array['signup_5000', 'signup_2000']) as t;

  return new;
end;
$$;

-- 4) 카카오 친구추가 혜택 v2 — 재가입 중복 지급 차단 추가 (지급 내용은 기존 유지: 적립금 3,000 + 무료배송 쿠폰)
create or replace function public.claim_kakao_friend_bonus()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz := now() + interval '30 days';
  v_email text;
  v_phone text;
  v_keys text[];
  v_dup boolean;
begin
  insert into kakao_friend_claims (user_id) values (auth.uid())
  on conflict (user_id) do nothing;
  if not found then
    return false; -- 이 계정으로 이미 신청함
  end if;

  select lower(nullif(email, '')), nullif(phone, '') into v_email, v_phone from auth.users where id = auth.uid();
  v_keys := array_remove(array[v_email, v_phone], null);
  if array_length(v_keys, 1) is null then
    v_keys := array[auth.uid()::text];
  end if;

  select exists(select 1 from benefit_claims where benefit = 'kakao_friend' and identity_key = any(v_keys)) into v_dup;
  if v_dup then
    return false; -- 탈퇴 후 재가입한 동일 인물 — 지급 안 함
  end if;

  insert into benefit_claims (benefit, identity_key, user_id)
  select 'kakao_friend', k, auth.uid() from unnest(v_keys) as k
  on conflict do nothing;

  insert into point_transactions (user_id, amount, reason, expires_at)
  values (auth.uid(), 3000, 'kakao_friend_bonus', v_expires);

  insert into user_coupons (user_id, template_id, expires_at)
  values (auth.uid(), 'kakao_friend_freeship', v_expires);

  return true;
end;
$$;

NOTIFY pgrst, 'reload schema';
