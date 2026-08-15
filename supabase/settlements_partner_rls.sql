-- 브랜드 본인이 자기 정산 내역만 조회할 수 있게 (host_settlements_select_own과 동일 패턴).
-- 기존 settlements_admin_select(admin_ops.sql)와 공존 — select 정책은 OR로 합쳐지므로 관리자 접근은 그대로 유지.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

drop policy if exists "settlements_select_own" on public.settlements;
create policy "settlements_select_own" on public.settlements
  for select using (
    partner_id in (select id from public.partners where user_id = auth.uid())
  );
