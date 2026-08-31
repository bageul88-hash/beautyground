-- 일기(살아가는 이야기) — 2026-09-01
-- 유저가 사진과 함께 일상을 남기면 포인트를 받는 참여 콘텐츠. 좋아요가 많은 글은 '이달의 우수 사연'으로 선정한다.
-- ⚠️ 기존 community_posts(브랜드 회원사 전용 사내 블로그, 관리자만 작성)와는 완전히 다른 것이므로 새로 만든다.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor

-- ────────────────────────────────────────────────────────────────
-- 1) diaries — 유저 일기
-- ────────────────────────────────────────────────────────────────
create table if not exists public.diaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  nickname    text,                                   -- 작성 시점의 표시 이름(스냅샷)
  content     text not null,
  images      text[] not null default '{}',           -- Supabase Storage(product-images/diaries/…) 공개 URL
  like_count  integer not null default 0,             -- 집계 캐시(정렬·우수사연 선정용)
  status      text not null default 'visible'
              check (status in ('visible', 'hidden')), -- 신고·운영상 숨김 처리용
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.diaries is '유저 일기(살아가는 이야기) — 작성 시 diary_post 미션 자동 적립, 좋아요 상위글은 이달의 우수 사연';

create index if not exists idx_diaries_feed on public.diaries (status, created_at desc);
create index if not exists idx_diaries_likes on public.diaries (status, like_count desc, created_at desc);
create index if not exists idx_diaries_user on public.diaries (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────────
-- 2) diary_likes — 좋아요(1인 1회)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.diary_likes (
  diary_id   uuid not null references public.diaries(id) on delete cascade,
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (diary_id, user_id)
);

create index if not exists idx_diary_likes_user on public.diary_likes (user_id);

-- ────────────────────────────────────────────────────────────────
-- 3) RLS
-- ────────────────────────────────────────────────────────────────
alter table public.diaries enable row level security;
alter table public.diary_likes enable row level security;

-- 공개된 일기는 누구나 읽기(비로그인 포함 — 피드 노출용)
drop policy if exists diaries_public_read on public.diaries;
create policy diaries_public_read on public.diaries
  for select using (status = 'visible');

-- 본인 글은 상태와 무관하게 조회/수정/삭제 가능
drop policy if exists diaries_own_all on public.diaries;
create policy diaries_own_all on public.diaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 관리자는 전체 조회·숨김 처리
drop policy if exists diaries_admin_all on public.diaries;
create policy diaries_admin_all on public.diaries
  for all using (public.is_admin()) with check (public.is_admin());

-- 좋아요는 본인 것만 (읽기는 공개 — 내가 눌렀는지 표시용)
drop policy if exists diary_likes_read on public.diary_likes;
create policy diary_likes_read on public.diary_likes
  for select using (true);

drop policy if exists diary_likes_own_write on public.diary_likes;
create policy diary_likes_own_write on public.diary_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 4) 일기 작성 + 미션 자동 적립
--    화면에서 따로 claim_mission을 부르지 않고 여기서 한 번에 처리한다(적립 누락·중복 호출 방지).
-- ────────────────────────────────────────────────────────────────
create or replace function public.create_diary(
  p_content text,
  p_images  text[] default '{}',
  p_nickname text default null
)
returns table (diary_id uuid, awarded integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_claim record;
begin
  if v_uid is null then
    return query select null::uuid, 0, '로그인이 필요합니다'::text; return;
  end if;
  if p_content is null or length(btrim(p_content)) < 5 then
    return query select null::uuid, 0, '내용을 5자 이상 입력해 주세요'::text; return;
  end if;

  insert into public.diaries (user_id, nickname, content, images)
  values (v_uid, p_nickname, btrim(p_content), coalesce(p_images, '{}'))
  returning id into v_id;

  -- diary_post 미션이 열려 있으면 자동 적립(없거나 이미 받았으면 0P)
  select * into v_claim from public.claim_mission('diary_post', 1);

  return query select v_id, coalesce(v_claim.awarded, 0), coalesce(v_claim.message, '')::text;
end;
$$;

revoke all on function public.create_diary(text, text[], text) from public;
grant execute on function public.create_diary(text, text[], text) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- 5) 좋아요 토글 (like_count 동기화)
-- ────────────────────────────────────────────────────────────────
create or replace function public.toggle_diary_like(p_diary_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
  v_count integer;
begin
  if v_uid is null then
    return query select false, 0; return;
  end if;

  select exists(select 1 from public.diary_likes where diary_id = p_diary_id and user_id = v_uid)
    into v_exists;

  if v_exists then
    delete from public.diary_likes where diary_id = p_diary_id and user_id = v_uid;
  else
    insert into public.diary_likes (diary_id, user_id) values (p_diary_id, v_uid)
    on conflict do nothing;
  end if;

  select count(*)::integer into v_count from public.diary_likes where diary_id = p_diary_id;
  update public.diaries set like_count = v_count, updated_at = now() where id = p_diary_id;

  return query select (not v_exists), v_count;
end;
$$;

revoke all on function public.toggle_diary_like(uuid) from public;
grant execute on function public.toggle_diary_like(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- 6) 일기 피드 조회 (내가 좋아요 눌렀는지 포함)
--    p_sort: 'recent'(최신) | 'popular'(좋아요순)
-- ────────────────────────────────────────────────────────────────
create or replace function public.get_diary_feed(
  p_sort text default 'recent',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid, user_id uuid, nickname text, content text, images text[],
  like_count integer, liked_by_me boolean, is_mine boolean, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.user_id, d.nickname, d.content, d.images,
         d.like_count,
         exists(select 1 from public.diary_likes l where l.diary_id = d.id and l.user_id = auth.uid()),
         (d.user_id = auth.uid()),
         d.created_at
  from public.diaries d
  where d.status = 'visible'
  order by
    case when p_sort = 'popular' then d.like_count end desc nulls last,
    d.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

revoke all on function public.get_diary_feed(text, integer, integer) from public;
grant execute on function public.get_diary_feed(text, integer, integer) to anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 7) 이달의 우수 사연 — 이번 달 좋아요 상위 글
-- ────────────────────────────────────────────────────────────────
create or replace function public.get_monthly_best_diaries(p_limit integer default 3)
returns table (
  id uuid, nickname text, content text, images text[], like_count integer, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.nickname, d.content, d.images, d.like_count, d.created_at
  from public.diaries d
  where d.status = 'visible'
    and d.created_at >= date_trunc('month', now() at time zone 'Asia/Seoul')
  order by d.like_count desc, d.created_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_monthly_best_diaries(integer) from public;
grant execute on function public.get_monthly_best_diaries(integer) to anon, authenticated;
