-- 관리자 페이지 8종 신설을 위한 RLS 정책 + 정산 RPC.
-- is_admin()은 admin_lockdown.sql에서 이미 생성됨(app_admins 이메일 기준).
-- 실행: Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) → SQL Editor

-- ── 1) orders: 관리자 전체 조회+수정 (전체 주문 관리 + 취소 확정) ──
drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders
  for select using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- ── 2) products: 관리자 전체 쓰기 (타 브랜드 상품 숨김/수정 + 리뷰 검수) ──
-- 조회는 이미 전체 공개(products public read)라 정책 추가 불필요.
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 3) partners: 관리자 전체 조회+수정 (입점 승인 후 정지/재활성화) ──
-- 기존 Applications.tsx의 upsert가 정책 부재로 실패할 수 있던 문제도 같이 해결됨.
drop policy if exists "partners_admin_select" on public.partners;
create policy "partners_admin_select" on public.partners
  for select using (public.is_admin());

drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all" on public.partners
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 4) lives: 관리자 전체 쓰기 (문제 방송 강제 종료/숨김) ──
-- 조회는 이미 전체 공개(lives public read).
drop policy if exists "lives_admin_all" on public.lives;
create policy "lives_admin_all" on public.lives
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 5) live_coupons: 관리자 전체 쓰기 (문제 쿠폰 비활성화) ──
-- 조회는 이미 전체 공개(live_coupons_public_read).
drop policy if exists "live_coupons_admin_all" on public.live_coupons;
create policy "live_coupons_admin_all" on public.live_coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- ── 6) settlements: 관리자 정산 생성/조회/지급확정 RPC 3종 (host_settlements와 동일 패턴) ──
drop policy if exists "settlements_admin_select" on public.settlements;
create policy "settlements_admin_select" on public.settlements
  for select using (public.is_admin());

-- 6-1) 정산 생성/미리보기 — 판매금액(paid/shipped/done, 배송비 행 제외) × 파트너 수수료율
create or replace function public.admin_generate_partner_settlement(
  p_partner_id uuid,
  p_period text,
  p_dry_run boolean default false
)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_end   timestamptz := v_start + interval '1 month';
  v_total bigint;
  v_rate numeric(5,2);
  v_commission bigint;
  v_payout bigint;
  v_existing_status text;
  v_row public.settlements;
begin
  if not public.is_admin() then
    raise exception '관리자만 정산을 생성할 수 있습니다.';
  end if;

  select status into v_existing_status
  from public.settlements
  where partner_id = p_partner_id and period = p_period;

  if v_existing_status = 'paid' then
    raise exception '이미 지급 완료된 정산입니다. (partner_id=%, period=%)', p_partner_id, p_period;
  end if;

  select coalesce(sum(o.amount), 0) into v_total
  from public.orders o
  where o.partner_id = p_partner_id
    and o.status in ('paid', 'shipped', 'done')
    and o.product_id is not null
    and coalesce(o.order_name, '') is distinct from '배송비'
    and o.created_at >= v_start
    and o.created_at < v_end;

  select commission_rate into v_rate from public.partners where id = p_partner_id;
  v_rate := coalesce(v_rate, 0);
  v_commission := round(v_total * v_rate / 100);
  v_payout := v_total - v_commission;

  if p_dry_run then
    v_row.partner_id := p_partner_id;
    v_row.period := p_period;
    v_row.total_sales := v_total;
    v_row.commission := v_commission;
    v_row.payout_amount := v_payout;
    v_row.status := 'pending';
    return v_row;
  end if;

  insert into public.settlements (partner_id, period, total_sales, commission, payout_amount, status)
  values (p_partner_id, p_period, v_total, v_commission, v_payout, 'pending')
  on conflict (partner_id, period) do update
    set total_sales = excluded.total_sales,
        commission = excluded.commission,
        payout_amount = excluded.payout_amount
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.admin_generate_partner_settlement(uuid, text, boolean) from public;
grant execute on function public.admin_generate_partner_settlement(uuid, text, boolean) to authenticated;

-- settlements에 (partner_id, period) 유니크 제약이 없으면 on conflict가 동작하지 않으므로 추가
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'settlements_partner_period_key'
  ) then
    alter table public.settlements add constraint settlements_partner_period_key unique (partner_id, period);
  end if;
end $$;

-- 6-2) 지급 완료 처리
create or replace function public.admin_mark_partner_settlement_paid(p_settlement_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
begin
  if not public.is_admin() then
    raise exception '관리자만 지급 완료 처리할 수 있습니다.';
  end if;

  update public.settlements
  set status = 'paid'
  where id = p_settlement_id and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception '대기 중인 정산만 지급 완료 처리할 수 있습니다. (id=%)', p_settlement_id;
  end if;

  return v_row;
end;
$$;
revoke all on function public.admin_mark_partner_settlement_paid(uuid) from public;
grant execute on function public.admin_mark_partner_settlement_paid(uuid) to authenticated;

-- 6-3) 전체 정산 목록 조회
create or replace function public.admin_list_partner_settlements()
returns table (
  id uuid,
  partner_id uuid,
  brand_name text,
  period text,
  total_sales bigint,
  commission bigint,
  payout_amount bigint,
  status text,
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
    select s.id, s.partner_id, p.brand_name, s.period, s.total_sales, s.commission, s.payout_amount, s.status, s.created_at
    from public.settlements s
    join public.partners p on p.id = s.partner_id
    order by s.created_at desc;
end;
$$;
revoke all on function public.admin_list_partner_settlements() from public;
grant execute on function public.admin_list_partner_settlements() to authenticated;

notify pgrst, 'reload schema';
