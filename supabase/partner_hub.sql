-- 브랜드 파트너 허브(/partners) — 정부지원사업·백화점 입점·브랜드 운영정보 CMS + 누적 방문자 카운터.
-- "정보 제공" 페이지다(신청/입점 폼 없음) — 2026-08-10 삭제된 구 /partners·/proposal("입점 브랜드
-- 모집")과는 다른 목적이니 혼동 금지.
-- 전제: admin_lockdown.sql 이 먼저 실행되어 public.is_admin() 함수가 존재해야 함.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

-- ── 1) 게시물 테이블 ──────────────────────────────────────────────────────
-- 카테고리는 3종만 허용(수출 바이어 매칭 타일은 /export로 바로 링크되는 탭이라 게시물이 없음).
create table if not exists public.partner_hub_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('gov_support', 'dept_store', 'operations')),
  title text not null,
  excerpt text,             -- 목록/최신소식 카드용 짧은 요약(비우면 프론트에서 본문 앞부분으로 대체)
  body text not null,       -- 서식 없는 여러 문단 텍스트(리치 에디터 없음, textarea 그대로 저장)
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz, -- 최초 발행 시각. 재수정해도 유지(최신소식 정렬을 흔들지 않기 위함)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_hub_posts_public_feed_idx
  on public.partner_hub_posts (status, published_at desc);

-- RLS: 베이스 테이블은 관리자 전용(작성/조회/발행 전부 admin CMS에서만 접근).
alter table public.partner_hub_posts enable row level security;

drop policy if exists "partner_hub_posts_admin_all" on public.partner_hub_posts;
create policy "partner_hub_posts_admin_all"
  on public.partner_hub_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 공개 조회용 뷰 — 발행(published)된 게시물의 안전한 컬럼만 anon/일반회원에게 노출.
create or replace view public.partner_hub_posts_public as
  select id, category, title, excerpt, body, thumbnail_url, published_at
  from public.partner_hub_posts
  where status = 'published';

grant select on public.partner_hub_posts_public to anon, authenticated;

-- ── 2) 누적 방문자 카운터 ─────────────────────────────────────────────────
-- /partners 페이지 전용 카운터(사이트 전체 유입 로그인 attribution.ts와는 별개 — 혼동 금지).
-- 싱글턴 1행만 사용.
create table if not exists public.partner_hub_counter (
  id smallint primary key default 1,
  total_visits bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint partner_hub_counter_singleton check (id = 1)
);

insert into public.partner_hub_counter (id, total_visits)
values (1, 0)
on conflict (id) do nothing;

-- 베이스 테이블은 전면 잠금(직접 UPDATE로 조작 못 하게) — 읽기는 아래 공개 뷰로, 증가는 RPC로만.
alter table public.partner_hub_counter enable row level security;
-- (정책 없음 = anon/authenticated 직접 접근 전면 차단, service_role/SECURITY DEFINER만 통과)

create or replace view public.partner_hub_counter_public as
  select total_visits from public.partner_hub_counter where id = 1;

grant select on public.partner_hub_counter_public to anon, authenticated;

-- 세션당 1회만 호출되는(프론트 sessionStorage 가드) 원자적 증가 RPC. 증가된 새 합계를 반환.
create or replace function public.increment_partner_hub_visit()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  update public.partner_hub_counter
  set total_visits = total_visits + 1,
      updated_at = now()
  where id = 1
  returning total_visits into v_total;

  return v_total;
end;
$$;
revoke all on function public.increment_partner_hub_visit() from public;
grant execute on function public.increment_partner_hub_visit() to anon, authenticated;

notify pgrst, 'reload schema';
