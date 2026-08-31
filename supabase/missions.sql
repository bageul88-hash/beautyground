-- 미션(활동 리워드) 시스템 — 2026-08-31
-- 목적: 걷기·출석·일기·라이브시청 등 참여 활동을 "코드 수정 없이" 관리자 화면에서 만들고 끌 수 있게 한다.
--       ("살아 움직이는 앱" 원칙 — 이벤트를 5분 만에 열고 닫을 수 있어야 함)
-- 포인트 지급은 기존 point_transactions 원장을 그대로 사용한다(신규 원장 만들지 않음).
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

-- ────────────────────────────────────────────────────────────────
-- 1) missions — 미션 정의 (관리자가 등록/수정)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.missions (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,               -- 코드 참조용 고유키 (예: 'walk_daily', 'diary_post')
  title        text not null,                      -- 화면 표시명 (예: '2,000보 걸으면 100P')
  description  text,                               -- 설명/안내 문구
  icon         text,                               -- 이모지 또는 아이콘 키

  -- 미션 유형
  type         text not null                       -- daily: 매일 반복 / streak: 연속달성 / cumulative: 기간누적 / once: 1회성
               check (type in ('daily','streak','cumulative','once')),
  metric       text not null,                      -- 측정 지표: steps / attendance / live_minutes / diary_post / review_post / custom
  target_value integer not null default 1,         -- 목표값 (2000보, 7일, 30분 …)

  -- 보상
  reward_points integer not null default 0,        -- 목표 달성 시 기본 보상
  milestones    jsonb not null default '[]'::jsonb,-- 구간 보상 [{"value":1000,"points":5},{"value":5000,"points":10}]
  reward_note   text,                              -- 보상 부가설명(선물 등 포인트 외 보상 표기용)

  -- 운영 조건
  max_per_day  integer not null default 1,         -- 하루 최대 지급 횟수 (탭구경형은 8 등)
  cooldown_sec integer not null default 0,         -- 재지급 최소 간격(초) — 1분 체류형 미션용
  starts_at    timestamptz,                        -- 비우면 상시
  ends_at      timestamptz,
  point_expire_days integer not null default 30,   -- 지급 포인트 만료일수

  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.missions is '활동 미션 정의 — 관리자 화면에서 등록/수정, 코드 수정 없이 미션 추가·중단';
comment on column public.missions.milestones is '구간별 보상. 예) [{"value":1000,"points":5},{"value":5000,"points":10},{"value":10000,"points":15}]';

create index if not exists idx_missions_active on public.missions (active, sort_order);

-- ────────────────────────────────────────────────────────────────
-- 2) mission_progress — 유저별 진행/달성 기록 (중복지급 방지 + 진행률 표시)
-- ────────────────────────────────────────────────────────────────
create table if not exists public.mission_progress (
  id            bigserial primary key,
  mission_id    uuid not null references public.missions(id) on delete cascade,
  user_id       uuid not null,
  progress_date date not null default (now() at time zone 'Asia/Seoul')::date, -- 일일 미션의 날짜 구분(KST 기준)

  current_value integer not null default 0,        -- 현재 진행값 (걸음수 등)
  claim_count   integer not null default 0,        -- 당일 지급 횟수 (max_per_day 제한용)
  awarded_points integer not null default 0,       -- 당일 지급된 포인트 합계
  last_claim_at timestamptz,                       -- 마지막 지급 시각 (cooldown 판정용)
  completed_at  timestamptz,                       -- 목표 달성 시각

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (mission_id, user_id, progress_date)      -- 같은 미션·같은 날 1행
);

create index if not exists idx_mission_progress_user on public.mission_progress (user_id, progress_date desc);

-- streak(연속달성) 판정을 위한 보조 인덱스
create index if not exists idx_mission_progress_streak on public.mission_progress (mission_id, user_id, progress_date desc);

-- ────────────────────────────────────────────────────────────────
-- 3) RLS — 유저는 자기 진행기록만 조회, 미션 정의는 활성분만 공개 읽기
-- ────────────────────────────────────────────────────────────────
alter table public.missions enable row level security;
alter table public.mission_progress enable row level security;

drop policy if exists missions_public_read on public.missions;
create policy missions_public_read on public.missions
  for select using (active = true);

drop policy if exists mission_progress_own_read on public.mission_progress;
create policy mission_progress_own_read on public.mission_progress
  for select using (auth.uid() = user_id);

-- 쓰기(미션 등록/수정, 진행기록 적립)는 서버(service_role)에서만 수행 → 별도 정책 없음(RLS 우회)

-- ────────────────────────────────────────────────────────────────
-- 4) 초기 미션 3종 (일단 비활성 상태로 넣어두고, 화면 완성 후 켠다)
-- ────────────────────────────────────────────────────────────────
insert into public.missions (key, title, description, icon, type, metric, target_value, reward_points, milestones, max_per_day, sort_order, active)
values
  ('walk_daily', '걷고 포인트 받기', '오늘 걸은 만큼 포인트를 드려요', '👟',
   'daily', 'steps', 10000, 0,
   '[{"value":1000,"points":5},{"value":5000,"points":10},{"value":10000,"points":15}]'::jsonb,
   3, 10, false),

  ('diary_post', '오늘의 일기 쓰기', '살아가는 이야기를 사진과 함께 남겨보세요', '📔',
   'daily', 'diary_post', 1, 30, '[]'::jsonb,
   1, 20, false),

  ('live_watch', '라이브 시청하기', '방송을 보면 포인트가 쌓여요', '📺',
   'daily', 'live_minutes', 60, 0,
   '[{"value":10,"points":5},{"value":30,"points":15},{"value":60,"points":30}]'::jsonb,
   1, 30, false)
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────
-- 5) updated_at 자동 갱신
-- ────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_missions_touch on public.missions;
create trigger trg_missions_touch before update on public.missions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_mission_progress_touch on public.mission_progress;
create trigger trg_mission_progress_touch before update on public.mission_progress
  for each row execute function public.touch_updated_at();
