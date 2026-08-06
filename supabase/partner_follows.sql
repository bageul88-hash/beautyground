-- 브랜드(파트너) 팔로우 — 고객이 라이브 시청 중 브랜드를 팔로우해두면
-- 추후 그 브랜드의 다음 라이브 알림/우선노출에 쓸 수 있음.
-- Supabase SQL Editor에서 실행

create table if not exists partner_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, partner_id)
);

create index if not exists partner_follows_user_id_idx on partner_follows(user_id);
create index if not exists partner_follows_partner_id_idx on partner_follows(partner_id);

alter table partner_follows enable row level security;

drop policy if exists "partner_follows_select_own" on partner_follows;
create policy "partner_follows_select_own" on partner_follows
  for select using (auth.uid() = user_id);

drop policy if exists "partner_follows_insert_own" on partner_follows;
create policy "partner_follows_insert_own" on partner_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "partner_follows_delete_own" on partner_follows;
create policy "partner_follows_delete_own" on partner_follows
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
