-- 가입 혜택 개편 v3 (2026-08-23 대표님 수정안)
-- ① 가입 쿠폰 3단계로 개편: 10만원 이상 5,000원 / 5만원 이상 3,000원 / 3만원 이상 1,000원
--    (v2의 2단계 5,000/2,000원 구성을 대체 — 이미 발급된 v2 쿠폰은 그대로 유효, 신규가입부터 v3 적용)
-- ② 어뷰징 방지: 같은 전화번호로 이미 가입된 계정이 있으면 신규가입 자체를 차단
--    (전화번호는 입력만 받고 실제 SMS 인증은 안 하고 있어 매번 다른 이메일로 여러 계정을 만들어
--     쿠폰만 반복 수령하는 게 가능했음 — SMS 본인인증 도입 전까지의 1차 방어선)
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

-- 1) 쿠폰 템플릿: v3 3종 추가, v2 2,000원 쿠폰은 신규 발급 중단(기존 보유자는 그대로 사용 가능)
insert into coupon_templates (id, label, discount_type, discount_value, max_discount, min_order_amount) values
  ('signup_5000_v3', '5,000원 할인 쿠폰(10만원 이상)', 'amount', 5000, null, 100000),
  ('signup_3000_v3', '3,000원 할인 쿠폰(5만원 이상)', 'amount', 3000, null, 50000),
  ('signup_1000_v3', '1,000원 할인 쿠폰(3만원 이상)', 'amount', 1000, null, 30000)
on conflict (id) do nothing;
update coupon_templates set active = false where id = 'signup_2000';

-- 2) 가입 트리거 v3 — 쿠폰 3종으로 교체(적립금 3,000원·1회지급 로직은 v2 그대로 유지)
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
  v_keys := array_remove(array[lower(nullif(new.email, '')), nullif(new.phone, '')], null);
  if array_length(v_keys, 1) is null then
    v_keys := array[new.id::text];
  end if;

  select exists(select 1 from benefit_claims where benefit = 'signup' and identity_key = any(v_keys)) into v_dup;
  if v_dup then
    return new;
  end if;

  insert into benefit_claims (benefit, identity_key, user_id)
  select 'signup', k, new.id from unnest(v_keys) as k
  on conflict do nothing;

  insert into point_transactions (user_id, amount, reason, expires_at)
  values (new.id, 3000, 'signup_bonus', v_expires);

  insert into user_coupons (user_id, template_id, expires_at)
  select new.id, t, v_expires from unnest(array['signup_5000_v3', 'signup_3000_v3', 'signup_1000_v3']) as t;

  return new;
end;
$$;

-- 3) 전화번호 중복가입 차단 — user_metadata.phone 기준(입력은 받되 SMS 인증은 없는 현재 구조의 1차 방어)
create or replace function public.block_duplicate_phone_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := nullif(trim(new.raw_user_meta_data->>'phone'), '');
  v_dup boolean;
begin
  if v_phone is null then
    return new; -- 카카오 등 phone 메타가 없는 가입 경로는 통과(별도 정책 필요 시 추후 추가)
  end if;

  select exists(
    select 1 from auth.users
    where id <> new.id and nullif(trim(raw_user_meta_data->>'phone'), '') = v_phone
  ) into v_dup;

  if v_dup then
    raise exception '이미 가입된 전화번호입니다.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_block_dup_phone on auth.users;
create trigger on_auth_user_block_dup_phone
  before insert on auth.users
  for each row execute function public.block_duplicate_phone_signup();

NOTIFY pgrst, 'reload schema';
