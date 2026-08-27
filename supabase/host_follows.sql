-- 매장(진행자/호스트) 팔로우 — 브랜드 소속이 아니라 매장(뷰티그라운드)이 직접 여는 라이브는
-- partner_follows 대상이 아니어서(live.partner_id가 없음) 팔로워가 있어도 다음 방송 알림이
-- 전혀 안 갔음(2026-08-27 실제 방송 중 발견). partner_follows와 동일 패턴으로 호스트 단위 팔로우를
-- 별도로 둔다 — 매장 QR로 미리 팔로우해두면 다음 라이브 시작 때 웹푸시가 가도록.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor에서 Run

create table if not exists host_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  host_id uuid not null references hosts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, host_id)
);

create index if not exists host_follows_user_id_idx on host_follows(user_id);
create index if not exists host_follows_host_id_idx on host_follows(host_id);

alter table host_follows enable row level security;

drop policy if exists "host_follows_select_own" on host_follows;
create policy "host_follows_select_own" on host_follows
  for select using (auth.uid() = user_id);

drop policy if exists "host_follows_insert_own" on host_follows;
create policy "host_follows_insert_own" on host_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "host_follows_delete_own" on host_follows;
create policy "host_follows_delete_own" on host_follows
  for delete using (auth.uid() = user_id);

-- 매장 QR 팔로우 랜딩(/app/host/:id/follow)은 로그인 전에도 매장 이름을 보여줘야 해서
-- (partners.brand_name처럼 이미 공개인 정보와 동급) hosts.name/status를 비로그인도 읽게 허용.
-- 민감정보(phone/email) 컬럼은 이 정책 대상이 아니라 그대로 비공개 — select('name,status')처럼
-- 필요한 컬럼만 골라 쓰는 클라이언트 쿼리로 실질적으로 노출을 좁힌다.
drop policy if exists "hosts_select_public" on hosts;
create policy "hosts_select_public" on hosts
  for select using (status = 'active');

notify pgrst, 'reload schema';
