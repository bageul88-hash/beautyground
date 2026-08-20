-- 직원 등급(회원가입 계정 기반) — 기존 비밀 링크(/staff/:key) 방식을 대체.
-- 관리자가 이메일을 app_staff 에 등록해두면, 그 계정으로 로그인한 사용자는
-- 일반 몰 화면에서 자동으로 "직원 구매" 메뉴가 열리고 employee_price 가 적용된다.
-- app_admins/is_admin() (admin_lockdown.sql) 과 동일한 화이트리스트 패턴.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행.
-- 선행 조건: admin_lockdown.sql(is_admin()) 이 먼저 적용되어 있어야 함.

-- ── 1) 직원 이메일 허용목록 ──────────────────────────────────────────────
-- app_admins 와 동일하게 정책 없음(anon/authenticated 직접 접근 전면 차단, RPC로만 노출).
create table if not exists public.app_staff (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.app_staff enable row level security;

-- ── 2) is_staff() 판별 함수 ──────────────────────────────────────────────
-- 현재 로그인 사용자의 JWT 이메일이 app_staff 에 있으면 true.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ── 3) 관리자용 직원 목록 조회 ───────────────────────────────────────────
create or replace function public.admin_list_staff()
returns table (email text, note text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 직원 목록을 조회할 수 있습니다.';
  end if;
  return query select s.email, s.note, s.created_at from public.app_staff s order by s.created_at desc;
end;
$$;
revoke all on function public.admin_list_staff() from public;
grant execute on function public.admin_list_staff() to authenticated;

-- ── 4) 관리자용 직원 등록/해제 ───────────────────────────────────────────
create or replace function public.admin_set_staff(p_email text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 직원을 지정할 수 있습니다.';
  end if;
  insert into public.app_staff (email, note)
  values (lower(trim(p_email)), p_note)
  on conflict (email) do update set note = excluded.note;
end;
$$;
revoke all on function public.admin_set_staff(text, text) from public;
grant execute on function public.admin_set_staff(text, text) to authenticated;

create or replace function public.admin_remove_staff(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 직원 지정을 해제할 수 있습니다.';
  end if;
  delete from public.app_staff where lower(email) = lower(trim(p_email));
end;
$$;
revoke all on function public.admin_remove_staff(text) from public;
grant execute on function public.admin_remove_staff(text) to authenticated;

notify pgrst, 'reload schema';
