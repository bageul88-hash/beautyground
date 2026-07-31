-- 관리자용 회원 목록 조회 RPC.
-- auth.users 는 클라이언트(anon/authenticated)에서 직접 select 할 수 없으므로(스키마 자체가 비공개),
-- admin_lockdown.sql 의 host_settlements RPC들과 같은 패턴으로 SECURITY DEFINER 함수를 통해서만 노출한다.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run
-- 선행 조건: admin_lockdown.sql(is_admin()), membership_tiers.sql 이 먼저 적용되어 있어야 함.

create or replace function public.admin_list_members()
returns table (
  id uuid,
  email text,
  name text,
  phone text,
  provider text,
  created_at timestamptz,
  total_spent bigint,
  order_count bigint,
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
        count(distinct payment_id) as order_count
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
