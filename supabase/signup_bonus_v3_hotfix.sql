-- 긴급 수정: signup_bonus_v3.sql 실행 후 신규 회원가입이 전부 실패하는 문제 (2026-08-23)
-- 원인: handle_new_user_signup_bonus() 함수가 benefit_claims 테이블을 참조하는데,
-- 그 테이블을 만드는 signup_bonus_v2.sql이 실제로는 한 번도 실행된 적이 없어서 테이블 자체가 없었음.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

create table if not exists public.benefit_claims (
  benefit text not null,
  identity_key text not null,
  user_id uuid,
  claimed_at timestamptz not null default now(),
  primary key (benefit, identity_key)
);
alter table public.benefit_claims enable row level security;

NOTIFY pgrst, 'reload schema';
