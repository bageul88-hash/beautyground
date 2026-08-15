-- 백화점 담당자 코드 페이지(/dept/:key)용 방송별 판매 집계.
-- 담당자는 실제 로그인 계정이 없고 코드(LiveGate와 동일한 클라이언트 게이트)로만 들어오므로
-- auth.uid() 기반 스코프가 불가능 — 대신 개별 주문·구매자 정보 없이 "합계"만 anon에 공개한다.
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
  group by o.live_id, l.title, l.scheduled_at, l.dept_key;

grant select on public.dept_live_sales_view to anon, authenticated;
