-- 유입 경로(마케팅 어트리뷰션) 추적 — 2026-08-08
-- 목적: 네이버/구글/메타(인스타그램 등) 광고나 검색·SNS를 통해 들어온 방문자가
--       실제로 회원가입·구매까지 이어지는지, 채널별로 알 수 있게 한다.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 전체 붙여넣고 Run
-- 선행 조건: admin_lockdown.sql(is_admin())이 먼저 적용되어 있어야 함.

-- 1) 방문 로그 — 로그인 여부와 무관하게 "이 채널에서 몇 명이 들어왔는지"를 남긴다.
--    브라우저 세션당 1행만 쌓이도록 클라이언트에서 sessionStorage로 중복 삽입을 막는다.
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_domain text,   -- naver.com / google.com / instagram.com / m.facebook.com / 직접접속 등
  landing_path text,      -- 처음 진입한 경로 (예: /app/product/xxx)
  device text             -- mobile / desktop
);

alter table public.site_visits enable row level security;

-- 누구나(비로그인 포함) 방문 로그를 남길 수 있어야 하므로 insert만 열어준다.
drop policy if exists "site_visits_insert_anyone" on public.site_visits;
create policy "site_visits_insert_anyone" on public.site_visits
  for insert with check (true);
-- select/update/delete 정책 없음 = 일반 사용자는 조회 불가, admin_traffic_summary() RPC로만 집계 조회.

create index if not exists site_visits_visited_at_idx on public.site_visits (visited_at);

-- 2) 관리자용 유입경로 집계 RPC.
--    방문(site_visits) / 가입(auth.users, 가입 시점에 저장한 utm_source 등) /
--    구매(orders → auth.users 연결)를 채널별로 각각 집계해 한 표로 합친다.
--    가입·구매의 채널은 "가입 시점에 저장된 최초 유입 정보"를 그대로 쓴다(회원가입 시 클라이언트가
--    localStorage의 최초 유입 정보를 raw_user_meta_data 에 심는다 — attribution.ts 참고).
create or replace function public.admin_traffic_summary(p_from timestamptz, p_to timestamptz)
returns table (
  source text,
  visits bigint,
  signups bigint,
  orders bigint,
  revenue bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.';
  end if;

  return query
  with v as (
    select
      coalesce(nullif(sv.utm_source, ''), nullif(sv.referrer_domain, ''), '직접접속') as src,
      count(*) as visits
    from public.site_visits sv
    where sv.visited_at >= p_from and sv.visited_at < p_to
    group by 1
  ),
  s as (
    select
      coalesce(nullif(u.raw_user_meta_data->>'utm_source', ''), nullif(u.raw_user_meta_data->>'referrer_domain', ''), '직접접속') as src,
      count(*) as signups
    from auth.users u
    where u.created_at >= p_from and u.created_at < p_to
    group by 1
  ),
  o as (
    select
      coalesce(nullif(u.raw_user_meta_data->>'utm_source', ''), nullif(u.raw_user_meta_data->>'referrer_domain', ''), '직접접속') as src,
      count(distinct ord.payment_id) as orders,
      coalesce(sum(ord.amount) filter (where ord.product_id is not null and ord.order_name is distinct from '배송비'), 0) as revenue
    from public.orders ord
    join auth.users u on u.id = ord.user_id
    where ord.created_at >= p_from and ord.created_at < p_to
      and ord.status in ('paid', 'shipped', 'done')
    group by 1
  )
  select
    coalesce(v.src, s.src, o.src) as source,
    coalesce(v.visits, 0) as visits,
    coalesce(s.signups, 0) as signups,
    coalesce(o.orders, 0) as orders,
    coalesce(o.revenue, 0) as revenue
  from v
  full outer join s on v.src = s.src
  full outer join o on coalesce(v.src, s.src) = o.src
  order by visits desc, revenue desc;
end;
$$;

revoke all on function public.admin_traffic_summary(timestamptz, timestamptz) from public;
grant execute on function public.admin_traffic_summary(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
