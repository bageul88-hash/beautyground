-- ============================================================================
-- 관리자 권한 잠금 (admin lockdown) — 2026-07-27
-- 목적: 지금까지 "로그인한 아무 계정 = 관리자"였던 구멍을 막는다.
--       정산·수수료·진행자상태·홈배너 등 민감 쓰기를 '지정된 관리자 이메일'로만 허용.
-- 판별 기준: app_admins 테이블에 등록된 이메일(대표님 결정 — 특정 이메일 지정 방식).
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에 전체 붙여넣고 Run.
--       (기존 hosts.sql/commission_tiers.sql/host_settlements.sql/hero_banners.sql/
--        home_settings.sql/home_extras.sql 를 이미 실행한 DB에 덮어쓰기로 적용)
-- ============================================================================

-- ── 1) 관리자 이메일 허용목록 ────────────────────────────────────────────────
-- 이 테이블은 아무 정책도 두지 않는다(anon/authenticated 접근 전면 차단).
-- 오직 SQL Editor(service_role)와 is_admin()(SECURITY DEFINER)만 접근 가능.
create table if not exists public.app_admins (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- (정책 없음 = 일반 사용자는 읽기/쓰기 모두 불가)

-- 관리자 이메일 등록 (소문자로 저장). 필요 시 여기서 추가/삭제.
-- test3@test.com 은 기존 관리에 쓰던 계정이라 전환 중 잠김 방지용으로 함께 등록.
--   → beautyground.official@gmail.com 로그인이 정상 확인되면 test3 행은 삭제 권장.
insert into public.app_admins (email, note) values
  ('beautyground.official@gmail.com', '대표님 관리자 계정'),
  ('test3@test.com', '전환용 기존 계정 — 확인 후 삭제 권장')
on conflict (email) do nothing;

-- ── 2) is_admin() 판별 함수 ─────────────────────────────────────────────────
-- 현재 로그인 사용자의 JWT 이메일이 app_admins 에 있으면 true.
-- SECURITY DEFINER 라서 app_admins 의 RLS를 우회해 목록을 조회할 수 있다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ── 3) commission_tiers: 쓰기를 관리자로 잠금 (조회는 투명성 위해 유지) ──────────
drop policy if exists "commission_tiers_insert_admin" on public.commission_tiers;
create policy "commission_tiers_insert_admin" on public.commission_tiers
  for insert with check (public.is_admin());

drop policy if exists "commission_tiers_update_admin" on public.commission_tiers;
create policy "commission_tiers_update_admin" on public.commission_tiers
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "commission_tiers_delete_admin" on public.commission_tiers;
create policy "commission_tiers_delete_admin" on public.commission_tiers
  for delete using (public.is_admin());

-- ── 4) hosts: 상태 변경(승인/정지)을 관리자로 잠금 ──────────────────────────────
-- 조회(hosts_select_admin)는 파트너 LiveForm 의 진행자 드롭다운(id,name)이 쓰므로
-- 이번엔 열어둔다. (연락처 등 전체노출은 후속 과제 — id,name 전용 뷰로 분리 예정)
drop policy if exists "hosts_update_admin" on public.hosts;
create policy "hosts_update_admin" on public.hosts
  for update using (public.is_admin()) with check (public.is_admin());

-- ── 5) hero_banners: 쓰기를 관리자로 잠금 (공개 조회는 유지) ──────────────────────
drop policy if exists "hero_banners_admin_all" on public.hero_banners;
create policy "hero_banners_admin_all" on public.hero_banners
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 6) home_settings(공지 마퀴): 쓰기를 관리자로 잠금 ──────────────────────────
-- ⚠️ 이 DB(beautyground-main)에는 home_settings 테이블이 없어 건너뛴다(마퀴 미사용).
--    존재하는 환경에서만 적용되도록 to_regclass 로 가드. (없으면 잠글 것도 없음)
do $$
begin
  if to_regclass('public.home_settings') is not null then
    drop policy if exists "home_settings_admin_write" on public.home_settings;
    execute 'create policy "home_settings_admin_write" on public.home_settings
      for update using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;

-- ── 7) category_thumbnails: 쓰기를 관리자로 잠금 (공개 조회는 유지) ───────────────
drop policy if exists "category_thumbnails_admin_all" on public.category_thumbnails;
create policy "category_thumbnails_admin_all" on public.category_thumbnails
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 8) host_settlements RPC 3종: 함수 내부에 관리자 확인 추가 ───────────────────
-- (기존엔 authenticated 전체에 grant 되어 손님도 정산 조회/생성/지급확정이 가능했음)

-- 8-1) 정산 생성/미리보기
create or replace function public.admin_generate_host_settlement(
  p_host_id uuid,
  p_period text,
  p_dry_run boolean default false
)
returns public.host_settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_end   timestamptz := v_start + interval '1 month';
  v_total bigint;
  v_tier_id uuid;
  v_tier_name text;
  v_rate numeric(5,2);
  v_commission bigint;
  v_existing_status text;
  v_row public.host_settlements;
begin
  if not public.is_admin() then
    raise exception '관리자만 정산을 생성할 수 있습니다.';
  end if;

  select status into v_existing_status
  from public.host_settlements
  where host_id = p_host_id and period = p_period;

  if v_existing_status = 'paid' then
    raise exception '이미 지급 완료된 정산입니다. (host_id=%, period=%)', p_host_id, p_period;
  end if;

  select coalesce(sum(o.amount), 0) into v_total
  from public.orders o
  join public.lives l on l.id = o.live_id
  where l.host_id = p_host_id
    and o.status in ('paid', 'shipped', 'done')
    and o.created_at >= v_start
    and o.created_at < v_end;

  select id, name, commission_rate into v_tier_id, v_tier_name, v_rate
  from public.commission_tiers
  where min_sales <= v_total
  order by min_sales desc
  limit 1;

  v_rate := coalesce(v_rate, 0);
  v_commission := round(v_total * v_rate / 100);

  if p_dry_run then
    v_row.host_id := p_host_id;
    v_row.period := p_period;
    v_row.total_sales := v_total;
    v_row.tier_id := v_tier_id;
    v_row.tier_name := v_tier_name;
    v_row.commission_rate := v_rate;
    v_row.commission_amount := v_commission;
    v_row.status := 'pending';
    return v_row;
  end if;

  insert into public.host_settlements
    (host_id, period, total_sales, tier_id, tier_name, commission_rate, commission_amount, status)
  values
    (p_host_id, p_period, v_total, v_tier_id, v_tier_name, v_rate, v_commission, 'pending')
  on conflict (host_id, period) do update
    set total_sales = excluded.total_sales,
        tier_id = excluded.tier_id,
        tier_name = excluded.tier_name,
        commission_rate = excluded.commission_rate,
        commission_amount = excluded.commission_amount
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.admin_generate_host_settlement(uuid, text, boolean) from public;
grant execute on function public.admin_generate_host_settlement(uuid, text, boolean) to authenticated;

-- 8-2) 지급 완료 처리
create or replace function public.admin_mark_host_settlement_paid(p_settlement_id uuid)
returns public.host_settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.host_settlements;
begin
  if not public.is_admin() then
    raise exception '관리자만 지급 완료 처리할 수 있습니다.';
  end if;

  update public.host_settlements
  set status = 'paid', paid_at = now()
  where id = p_settlement_id and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception '대기 중인 정산만 지급 완료 처리할 수 있습니다. (id=%)', p_settlement_id;
  end if;

  return v_row;
end;
$$;
revoke all on function public.admin_mark_host_settlement_paid(uuid) from public;
grant execute on function public.admin_mark_host_settlement_paid(uuid) to authenticated;

-- 8-3) 전체 정산 목록 조회
create or replace function public.admin_list_host_settlements()
returns table (
  id uuid,
  host_id uuid,
  host_name text,
  period text,
  total_sales bigint,
  tier_name text,
  commission_rate numeric,
  commission_amount bigint,
  status text,
  paid_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 정산 목록을 조회할 수 있습니다.';
  end if;

  return query
    select
      hs.id, hs.host_id, h.name as host_name, hs.period, hs.total_sales,
      hs.tier_name, hs.commission_rate, hs.commission_amount, hs.status, hs.paid_at, hs.created_at
    from public.host_settlements hs
    join public.hosts h on h.id = hs.host_id
    order by hs.created_at desc;
end;
$$;
revoke all on function public.admin_list_host_settlements() from public;
grant execute on function public.admin_list_host_settlements() to authenticated;

notify pgrst, 'reload schema';
