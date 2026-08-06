-- 신규가입 적립금 3,000원 + 첫구매용 쿠폰 3종 자동 지급
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

-- 쿠폰 종류 정의(템플릿)
create table if not exists coupon_templates (
  id text primary key,
  label text not null,
  discount_type text not null check (discount_type in ('amount', 'percent', 'free_shipping')),
  discount_value numeric not null default 0, -- amount=원, percent=%
  max_discount numeric, -- percent형 상한(원)
  min_order_amount numeric not null default 0,
  active boolean not null default true
);

insert into coupon_templates (id, label, discount_type, discount_value, max_discount, min_order_amount) values
  ('signup_5000', '5,000원 할인 쿠폰', 'amount', 5000, null, 30000),
  ('signup_10pct', '10% 할인 쿠폰(최대 5,000원)', 'percent', 10, 5000, 0),
  ('signup_freeship', '무료배송 쿠폰', 'free_shipping', 0, null, 0)
on conflict (id) do nothing;

-- 발급된 쿠폰 인스턴스(사용자별). payment_id는 orders.payment_id(text)와 동일 키 — 라이브쿠폰과 동일 관례.
create table if not exists user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null references coupon_templates(id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  payment_id text
);
create index if not exists user_coupons_user_id_idx on user_coupons(user_id);

-- 적립금 원장(지급/사용) — balance는 쿼리 시점에 합산(만료된 미사용 지급분은 자동 제외)
create table if not exists point_transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null, -- +지급, -사용
  reason text not null,
  payment_id text,
  expires_at timestamptz, -- 지급 건에만 설정
  created_at timestamptz not null default now()
);
create index if not exists point_transactions_user_id_idx on point_transactions(user_id);

alter table user_coupons enable row level security;
alter table point_transactions enable row level security;
drop policy if exists "본인 쿠폰만 조회" on user_coupons;
create policy "본인 쿠폰만 조회" on user_coupons for select using (auth.uid() = user_id);
drop policy if exists "본인 적립금만 조회" on point_transactions;
create policy "본인 적립금만 조회" on point_transactions for select using (auth.uid() = user_id);

-- 신규가입 시 자동 지급 트리거(이메일·카카오 등 가입 경로 무관 전체 적용)
create or replace function public.handle_new_user_signup_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz := now() + interval '30 days';
begin
  insert into point_transactions (user_id, amount, reason, expires_at)
  values (new.id, 3000, 'signup_bonus', v_expires);

  insert into user_coupons (user_id, template_id, expires_at)
  select new.id, id, v_expires from coupon_templates where active = true;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bonus on auth.users;
create trigger on_auth_user_created_bonus
  after insert on auth.users
  for each row execute function public.handle_new_user_signup_bonus();

-- 본인 적립금 잔액 조회(만료된 미사용 지급분 자동 제외)
create or replace function public.get_my_points_balance()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from point_transactions
  where user_id = auth.uid()
    and (amount < 0 or expires_at is null or expires_at >= now());
$$;
grant execute on function public.get_my_points_balance() to authenticated;

-- 본인 유효 쿠폰 목록(미사용 + 만료 전)
create or replace function public.get_my_valid_coupons()
returns table (
  id uuid, template_id text, label text, discount_type text,
  discount_value numeric, max_discount numeric, min_order_amount numeric, expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select uc.id, uc.template_id, ct.label, ct.discount_type, ct.discount_value, ct.max_discount, ct.min_order_amount, uc.expires_at
  from user_coupons uc
  join coupon_templates ct on ct.id = uc.template_id
  where uc.user_id = auth.uid() and uc.used_at is null and uc.expires_at >= now()
  order by uc.expires_at asc;
$$;
grant execute on function public.get_my_valid_coupons() to authenticated;

-- 결제 직전 적립금 사용 확정(라이브쿠폰의 redeem_live_coupon과 동일 패턴 — 결제 전 원자적으로 차감).
-- 동시 결제(다른 탭) 경합 방지를 위해 사용자별 advisory lock 사용.
create or replace function public.redeem_points(p_amount integer, p_payment_id text)
returns integer -- 차감 후 잔액
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select coalesce(sum(amount), 0) into v_balance
  from point_transactions
  where user_id = auth.uid()
    and (amount < 0 or expires_at is null or expires_at >= now());

  if v_balance < p_amount then
    raise exception 'insufficient points balance';
  end if;

  insert into point_transactions (user_id, amount, reason, payment_id)
  values (auth.uid(), -p_amount, 'order_use', p_payment_id);

  return v_balance - p_amount;
end;
$$;
grant execute on function public.redeem_points(integer, text) to authenticated;

-- 결제가 그 자리에서 취소/실패한 경우(동기 경로) 차감분 되돌림. payment-complete.ts 검증 실패 시에도 호출됨.
create or replace function public.release_points(p_payment_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from point_transactions where payment_id = p_payment_id and user_id = auth.uid() and amount < 0;
$$;
grant execute on function public.release_points(text) to authenticated;

-- 결제 직전 쿠폰 사용 확정 — 본인 소유·미사용·미만료 쿠폰만 사용 처리.
create or replace function public.redeem_signup_coupon(p_coupon_id uuid, p_payment_id text)
returns setof user_coupons
language sql
security definer
set search_path = public
as $$
  update user_coupons
  set used_at = now(), payment_id = p_payment_id
  where id = p_coupon_id
    and user_id = auth.uid()
    and used_at is null
    and expires_at >= now()
  returning *;
$$;
grant execute on function public.redeem_signup_coupon(uuid, text) to authenticated;

-- 결제 취소/실패 시 쿠폰 사용 취소(되돌림)
create or replace function public.release_signup_coupon(p_payment_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update user_coupons set used_at = null, payment_id = null
  where payment_id = p_payment_id and user_id = auth.uid();
$$;
grant execute on function public.release_signup_coupon(text) to authenticated;
