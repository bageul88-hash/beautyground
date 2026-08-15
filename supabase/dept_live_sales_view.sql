-- 백화점 담당자 대시보드(/dept/sales)용 방송별 판매 집계.
-- 2026-08-15: 코드 게이트 방식을 폐기하고 정식 계정(dept_accounts) 로그인으로 전환하면서,
-- 이 뷰도 anon 공개 대신 로그인한 담당자 본인의 dept_key로만 스코프한다(뷰 정의 안에서
-- auth.uid() 필터 — host_sales_view/partner_live_sales_view와 동일 패턴).
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

create or replace view public.dept_live_sales_view as
  select
    o.live_id,
    l.title as live_title,
    l.scheduled_at as live_scheduled_at,
    l.dept_key,
    sum(o.amount) as total_amount,
    sum(o.quantity) as total_quantity,
    count(*) as order_count
  from public.orders o
  join public.lives l on l.id = o.live_id
  where o.status in ('paid', 'shipped', 'done')
    and l.dept_key is not null
    and l.dept_key in (select dept_key from public.dept_accounts where user_id = auth.uid())
  group by o.live_id, l.title, l.scheduled_at, l.dept_key;

revoke select on public.dept_live_sales_view from anon;
grant select on public.dept_live_sales_view to authenticated;
