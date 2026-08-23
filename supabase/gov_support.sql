-- 정부지원사업 정보 (브랜드 파트너 허브 /partners/gov-support 카테고리에 자동 노출)
-- 기업마당(bizinfo.go.kr) 공고를 서버 크론(api/gov-support-sync.ts)이 매일 긁어와 upsert.
-- partner_hub.sql과 동일한 패턴: 베이스 테이블은 잠금(서비스롤만 쓰기), 공개 뷰로만 읽기 노출.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create table if not exists public.gov_support_programs (
  id uuid primary key default gen_random_uuid(),
  pblancid text unique not null,   -- 기업마당 공고 ID (PBLN_...) — 중복 upsert 기준
  title text not null,
  category text,                   -- 기업마당 원본 분야(금융/기술/인력/수출/내수/창업/경영/기타)
  org text,                        -- 소관부처·지자체
  region text,
  apply_period text,
  reg_date date,
  url text not null,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists gov_support_programs_reg_date_idx
  on public.gov_support_programs (reg_date desc);

-- RLS: 베이스 테이블은 전면 잠금 — 쓰기는 service_role(크론 함수)만, 정책 없음 = anon/authenticated 직접 접근 차단.
alter table public.gov_support_programs enable row level security;

-- 공개 조회용 뷰 — 컬럼 전부 공공정보라 안전하게 그대로 노출.
create or replace view public.gov_support_programs_public as
  select id, title, category, org, region, apply_period, reg_date, url, first_seen_at
  from public.gov_support_programs
  order by first_seen_at desc;

grant select on public.gov_support_programs_public to anon, authenticated;

notify pgrst, 'reload schema';
