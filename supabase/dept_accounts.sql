-- 백화점 담당자 계정 — 코드 게이트(/dept/:key) 대신 정식 아이디/비밀번호 로그인으로 전환(2026-08-15).
-- 계정은 관리자가 Supabase 대시보드에서 만든 뒤 admin_create_dept_account RPC로 이 테이블에 연결.
-- 한 백화점(dept_key)에 여러 지점 계정이 있을 수 있다(예: AK플라자_광명, AK플라자_수원역).
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

create table if not exists public.dept_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dept_key text not null check (dept_key in ('hyundai', 'ak')),
  display_name text not null, -- 예: "AK플라자_광명"
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

alter table public.dept_accounts enable row level security;

-- 본인 계정만 조회 (hosts_select_own과 동일 패턴)
drop policy if exists "dept_accounts_select_own" on public.dept_accounts;
create policy "dept_accounts_select_own" on public.dept_accounts
  for select using (auth.uid() = user_id);

-- 관리자는 전체 조회+쓰기
drop policy if exists "dept_accounts_admin_all" on public.dept_accounts;
create policy "dept_accounts_admin_all" on public.dept_accounts
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists dept_accounts_user_id_idx on public.dept_accounts (user_id);
