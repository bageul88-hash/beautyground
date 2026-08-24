-- 국군복지단 PX(WA몰) 입찰정보 자동수집 — welfare.mil.kr 입찰정보 게시판을 매일 크론이 긁어온다.
-- gov_support_programs(기업마당)와 동일 패턴 — 별도 테이블, 공개 뷰로만 anon 노출.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create table if not exists public.military_px_notices (
  id uuid primary key default gen_random_uuid(),
  bm_serial text not null unique, -- welfare.mil.kr 게시글 고유번호(bm_serial) — 중복 upsert 기준
  title text not null,
  reg_date date,
  url text not null,
  first_seen_at timestamptz not null default now()
);

alter table public.military_px_notices enable row level security;
-- (정책 없음 = anon/authenticated 직접 접근 차단, service_role 크론만 씀)

create or replace view public.military_px_notices_public as
  select id, title, reg_date, url, first_seen_at
  from public.military_px_notices
  order by first_seen_at desc;

grant select on public.military_px_notices_public to anon, authenticated;

notify pgrst, 'reload schema';
