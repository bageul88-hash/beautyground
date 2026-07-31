-- 고객 회원 등급표(구매 등급/적립률). 관리자가 자유롭게 등급(이름/기준 누적구매금액/적립률)을 추가·수정.
-- 기존엔 src/lib/membership.ts 에 하드코딩되어 있던 BASIC/SILVER/GOLD/VIP 4단계를 그대로 시드 데이터로 이관.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

create table if not exists public.membership_tiers (
  id uuid primary key default gen_random_uuid(),
  tier_key text not null unique,
  label text not null,
  min_spent bigint not null default 0,                 -- 이 누적구매금액(원) 이상부터 적용되는 등급 기준
  reward_rate numeric(5,2) not null default 0 check (reward_rate >= 0 and reward_rate <= 100),
  color text not null default '#8E9199',
  bg text not null default '#F4F5F7',
  created_at timestamptz not null default now()
);

alter table public.membership_tiers enable row level security;

-- 등급표는 마이페이지에서 비로그인 상태로도 보일 수 있어 전체 공개 조회.
drop policy if exists "membership_tiers_select_public" on public.membership_tiers;
create policy "membership_tiers_select_public" on public.membership_tiers
  for select using (true);

-- 쓰기는 관리자만 (admin_lockdown.sql 의 is_admin() 사용).
drop policy if exists "membership_tiers_admin_all" on public.membership_tiers;
create policy "membership_tiers_admin_all" on public.membership_tiers
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.membership_tiers (tier_key, label, min_spent, reward_rate, color, bg) values
  ('BASIC', 'BASIC', 0, 1, '#8E9199', '#F4F5F7'),
  ('SILVER', 'SILVER', 100000, 2, '#5B5E66', '#F4F5F7'),
  ('GOLD', 'GOLD', 300000, 3, '#17181C', '#FFFFFF'),
  ('VIP', 'VIP', 700000, 5, '#FFFFFF', '#17181C')
on conflict (tier_key) do nothing;

notify pgrst, 'reload schema';
