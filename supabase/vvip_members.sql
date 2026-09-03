-- VVIP 등급(수동 지정) — app_staff/staff_members.sql과 완전히 동일한 화이트리스트 패턴.
-- 구매금액 기반 VIP(membership_tiers)와는 별개로, 대표님이 특정 고객을 직접 VVIP로 지정한다.
-- VVIP는 적립 없이 브랜드별 할인(백화점 입점 20% / 온라인 전용 30%)만 받는다(2026-09-03 대표님 지시).
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행.
-- 선행 조건: admin_lockdown.sql(is_admin()) 이 먼저 적용되어 있어야 함.

-- ── 1) VVIP 이메일 허용목록 ──────────────────────────────────────────────
create table if not exists public.app_vvip (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.app_vvip enable row level security;

-- ── 2) is_vvip() 판별 함수 ────────────────────────────────────────────────
create or replace function public.is_vvip()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_vvip
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_vvip() from public;
grant execute on function public.is_vvip() to authenticated;

-- ── 3) 관리자용 VVIP 목록 조회 ────────────────────────────────────────────
create or replace function public.admin_list_vvip()
returns table (email text, note text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 VVIP 목록을 조회할 수 있습니다.';
  end if;
  return query select v.email, v.note, v.created_at from public.app_vvip v order by v.created_at desc;
end;
$$;
revoke all on function public.admin_list_vvip() from public;
grant execute on function public.admin_list_vvip() to authenticated;

-- ── 4) 관리자용 VVIP 등록/해제 ────────────────────────────────────────────
create or replace function public.admin_set_vvip(p_email text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 VVIP를 지정할 수 있습니다.';
  end if;
  insert into public.app_vvip (email, note)
  values (lower(trim(p_email)), p_note)
  on conflict (email) do update set note = excluded.note;
end;
$$;
revoke all on function public.admin_set_vvip(text, text) from public;
grant execute on function public.admin_set_vvip(text, text) to authenticated;

create or replace function public.admin_remove_vvip(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 VVIP 지정을 해제할 수 있습니다.';
  end if;
  delete from public.app_vvip where lower(email) = lower(trim(p_email));
end;
$$;
revoke all on function public.admin_remove_vvip(text) from public;
grant execute on function public.admin_remove_vvip(text) to authenticated;

-- ── 5) 브랜드별 백화점 입점 여부 — 기본값 true(2026-09-03 확인: 현재 활성 브랜드는 전부 백화점 입점) ──
-- 온라인 전용 신규 브랜드가 들어오면 관리자에서 false로 바꿔주면 VVIP 할인율이 30%로 적용된다.
alter table public.partners add column if not exists is_dept_store_brand boolean not null default true;

notify pgrst, 'reload schema';
