-- 파트너 허브(/partners) 전용 회원 시스템 — 쇼핑몰 회원가입(auth.users, 소비자용)과 완전히
-- 분리된 독립 계정 체계. Supabase Auth를 아예 쓰지 않고 이메일 인증코드만으로 가입/로그인한다.
-- 3개 테이블 전부 anon/authenticated 직접 접근 정책이 없다(= 전면 차단) — 오직 서버(api/
-- partner-hub-auth.ts, service_role 키)를 통해서만 접근 가능.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create table if not exists public.partner_hub_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  company_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
alter table public.partner_hub_accounts enable row level security;

-- 6자리 인증코드 — 이메일당 여러 번 요청 가능(재발송), 검증 시 가장 최근 미사용·미만료 코드만 확인.
create table if not exists public.partner_hub_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.partner_hub_login_codes enable row level security;
create index if not exists partner_hub_login_codes_email_idx on public.partner_hub_login_codes (email, created_at desc);

-- 세션 토큰 — Supabase Auth JWT 대신 쓰는 자체 발급 랜덤 토큰(30일 유효).
create table if not exists public.partner_hub_sessions (
  token text primary key,
  account_id uuid not null references public.partner_hub_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.partner_hub_sessions enable row level security;

notify pgrst, 'reload schema';
