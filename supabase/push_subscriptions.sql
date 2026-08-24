-- 웹 푸시 구독 — 브라우저(디바이스) 단위 구독 정보를 저장.
-- 브랜드 팔로우(partner_follows)와 결합해, 팔로우한 브랜드가 라이브를 시작하면
-- 서버(api/live-input.ts)가 이 테이블의 구독으로 실제 알림을 발송한다.
-- Supabase SQL Editor에서 실행

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on push_subscriptions;
create policy "push_subscriptions_select_own" on push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on push_subscriptions;
create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on push_subscriptions;
create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
