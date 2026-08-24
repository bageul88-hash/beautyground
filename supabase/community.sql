-- 브랜드 회원사 전용 커뮤니티(/brand/community) — 로그인한 브랜드 회원사만 열람하는 사내 블로그.
-- "업무"(뷰티그라운드 소식, 브랜드 회원 전체 공개)와 "사는이야기"(음악·영화·여행 등, 구독한
-- 회원에게만 공개) 두 카테고리. 글은 대표님(관리자)만 작성 — partner_hub.sql과 동일 패턴.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('work', 'life')), -- work=업무, life=사는이야기
  tags text[],                -- life 카테고리 하위 필터용(음악/영화/여행 등), work는 보통 null
  title text not null,
  excerpt text,
  body text not null,         -- 서식 없는 여러 문단 텍스트(리치 에디터 없음, textarea 그대로 저장)
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_feed_idx
  on public.community_posts (category, status, published_at desc);

-- RLS: 베이스 테이블은 관리자 전용(작성/조회/발행 전부 admin CMS에서만 접근).
alter table public.community_posts enable row level security;

drop policy if exists "community_posts_admin_all" on public.community_posts;
create policy "community_posts_admin_all"
  on public.community_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- '사는이야기' 카테고리 구독(관심등록) — 브랜드(partners)가 본인 명의로만 등록/해지 가능.
create table if not exists public.community_category_follows (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  category text not null check (category in ('life')),
  created_at timestamptz not null default now(),
  unique (partner_id, category)
);

alter table public.community_category_follows enable row level security;

drop policy if exists "community_follows_own" on public.community_category_follows;
create policy "community_follows_own"
  on public.community_category_follows
  for all
  using (partner_id in (select id from public.partners where user_id = auth.uid()))
  with check (partner_id in (select id from public.partners where user_id = auth.uid()));

-- 열람용 피드 뷰 — 카테고리별로 접근조건이 다름(work=브랜드 회원 전체, life=구독자만).
-- 정적 grant가 아니라 뷰 안에서 auth.uid() 기준으로 직접 필터링한다.
-- auth.uid()는 PostgREST가 요청마다 세팅하는 세션 GUC라 뷰 소유자 권한과 무관하게 호출자
-- 기준으로 정확히 동작한다(SECURITY DEFINER뷰라도 auth.uid()는 항상 실제 호출자 것).
create or replace view public.community_posts_feed as
  select cp.id, cp.category, cp.tags, cp.title, cp.excerpt, cp.body, cp.thumbnail_url, cp.published_at
  from public.community_posts cp
  where cp.status = 'published'
    and (
      (cp.category = 'work' and exists (
        select 1 from public.partners p where p.user_id = auth.uid()
      ))
      or
      (cp.category = 'life' and exists (
        select 1 from public.community_category_follows f
        join public.partners p on p.id = f.partner_id
        where p.user_id = auth.uid() and f.category = 'life'
      ))
    );

grant select on public.community_posts_feed to authenticated;

notify pgrst, 'reload schema';
