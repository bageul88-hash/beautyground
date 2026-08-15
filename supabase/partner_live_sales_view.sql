-- 브랜드 본인의 라이브 방송별 판매내역("이 방송에서 몇 개/얼마 팔렸는지").
-- host_sales_view.sql과 동일 패턴 — 뷰 정의 안에서 auth.uid()로 필터링하므로
-- orders 테이블에 별도 RLS 정책을 추가할 필요가 없다(추가하면 구매자 PII 노출 위험).
-- 구매자 개인정보(이름/연락처)는 컬럼 자체를 포함하지 않는다.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

create or replace view public.partner_live_sales_view as
  select
    o.id,
    o.live_id,
    o.product_id,
    o.amount,
    o.quantity,
    o.status,
    o.created_at,
    o.partner_id,
    l.title as live_title,
    l.scheduled_at as live_scheduled_at,
    l.dept_key
  from public.orders o
  left join public.lives l on l.id = o.live_id
  where o.partner_id in (select id from public.partners where user_id = auth.uid());

grant select on public.partner_live_sales_view to authenticated;
