-- 회원 관리: 쇼핑몰 구매 vs 라이브커머스 구매 채널 구분 — 2026-08-08
-- orders.live_id 가 NULL이면 쇼핑몰(일반) 구매, 값이 있으면 그 라이브 방송을 통한 구매다
-- (host_sales_view.sql 에서 이미 쓰던 구분과 동일한 기준).
-- admin_list_members() 는 지금까지 total_spent/order_count 만 합산해서 채널 구분이 안 됐다 —
-- 회원별로 쇼핑몰/라이브 구매를 나눠서 함께 반환하도록 재정의한다.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 전체 붙여넣고 Run
-- 선행 조건: admin_members.sql 이 먼저 적용되어 있어야 함(같은 함수를 재정의).

-- 반환 컬럼 목록이 바뀌므로 create or replace 대신 drop 후 재생성해야 함(Postgres 제약).
drop function if exists public.admin_list_members();

create function public.admin_list_members()
returns table (
  id uuid,
  email text,
  name text,
  phone text,
  provider text,
  created_at timestamptz,
  total_spent bigint,
  order_count bigint,
  mall_spent bigint,
  mall_order_count bigint,
  live_spent bigint,
  live_order_count bigint,
  tier_label text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 회원 목록을 조회할 수 있습니다.';
  end if;

  return query
    select
      u.id,
      u.email::text,
      coalesce(u.raw_user_meta_data->>'name', '') as name,
      coalesce(u.raw_user_meta_data->>'phone', '') as phone,
      coalesce(
        u.raw_user_meta_data->>'provider',
        (select i.provider from auth.identities i where i.user_id = u.id order by i.created_at asc limit 1),
        'email'
      ) as provider,
      u.created_at,
      coalesce(o.total_spent, 0) as total_spent,
      coalesce(o.order_count, 0) as order_count,
      coalesce(o.mall_spent, 0) as mall_spent,
      coalesce(o.mall_order_count, 0) as mall_order_count,
      coalesce(o.live_spent, 0) as live_spent,
      coalesce(o.live_order_count, 0) as live_order_count,
      coalesce(
        (select mt.label from public.membership_tiers mt
         where mt.min_spent <= coalesce(o.total_spent, 0)
         order by mt.min_spent desc limit 1),
        'BASIC'
      ) as tier_label
    from auth.users u
    left join (
      select
        user_id,
        sum(amount) filter (where product_id is not null and order_name is distinct from '배송비') as total_spent,
        count(distinct payment_id) as order_count,
        sum(amount) filter (where product_id is not null and order_name is distinct from '배송비' and live_id is null) as mall_spent,
        count(distinct payment_id) filter (where live_id is null) as mall_order_count,
        sum(amount) filter (where product_id is not null and order_name is distinct from '배송비' and live_id is not null) as live_spent,
        count(distinct payment_id) filter (where live_id is not null) as live_order_count
      from public.orders
      where status in ('paid', 'shipped', 'done')
      group by user_id
    ) o on o.user_id = u.id
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_members() from public;
grant execute on function public.admin_list_members() to authenticated;

notify pgrst, 'reload schema';
