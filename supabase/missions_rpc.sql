-- 미션 적립 RPC — 2026-09-01
-- Vercel 함수가 12/12로 꽉 차 새 API 라우트를 만들 수 없으므로, 기존 패턴(supabase.rpc)대로 DB 함수로 처리한다.
-- security definer 라서 point_transactions/mission_progress의 RLS를 우회해 서버 권한으로 적립한다.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor

-- ────────────────────────────────────────────────────────────────
-- 1) 내 미션 목록 + 오늘 진행상황 (활성 미션만)
-- ────────────────────────────────────────────────────────────────
create or replace function public.get_my_missions()
returns table (
  id uuid, key text, title text, description text, icon text,
  type text, metric text, target_value integer,
  reward_points integer, milestones jsonb, reward_note text,
  max_per_day integer, cooldown_sec integer,
  current_value integer, claim_count integer, awarded_points integer,
  last_claim_at timestamptz, completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.id, m.key, m.title, m.description, m.icon,
    m.type, m.metric, m.target_value,
    m.reward_points, m.milestones, m.reward_note,
    m.max_per_day, m.cooldown_sec,
    coalesce(p.current_value, 0),
    coalesce(p.claim_count, 0),
    coalesce(p.awarded_points, 0),
    p.last_claim_at, p.completed_at
  from public.missions m
  left join public.mission_progress p
    on p.mission_id = m.id
   and p.user_id = auth.uid()
   and p.progress_date = (now() at time zone 'Asia/Seoul')::date
  where m.active = true
    and (m.starts_at is null or m.starts_at <= now())
    and (m.ends_at   is null or m.ends_at   >= now())
  order by m.sort_order, m.created_at;
$$;

revoke all on function public.get_my_missions() from public;
grant execute on function public.get_my_missions() to authenticated;

-- ────────────────────────────────────────────────────────────────
-- 2) 내 포인트 잔액 (만료 안 된 적립분 - 사용분)
-- ────────────────────────────────────────────────────────────────
create or replace function public.get_my_point_balance()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from public.point_transactions
  where user_id = auth.uid()
    and (expires_at is null or expires_at > now());
$$;

revoke all on function public.get_my_point_balance() from public;
grant execute on function public.get_my_point_balance() to authenticated;

-- ────────────────────────────────────────────────────────────────
-- 3) 미션 진행값 보고 + 자동 적립
--    p_value = 이번에 보고할 값(걸음수 총합, 시청 분수 등). 출석·일기처럼 1회성이면 1.
--    구간 보상(milestones)이 있으면 "이번에 새로 넘긴 구간"만큼만 지급한다(중복 지급 방지).
-- ────────────────────────────────────────────────────────────────
create or replace function public.claim_mission(p_key text, p_value integer default 1)
returns table (awarded integer, total_awarded integer, balance integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_m          public.missions%rowtype;
  v_today      date := (now() at time zone 'Asia/Seoul')::date;
  v_prog       public.mission_progress%rowtype;
  v_new_value  integer;
  v_award      integer := 0;
  v_ms         jsonb;
  v_prev_award integer;
begin
  if v_uid is null then
    return query select 0, 0, 0, '로그인이 필요합니다'::text; return;
  end if;

  select * into v_m from public.missions
   where key = p_key and active = true
     and (starts_at is null or starts_at <= now())
     and (ends_at   is null or ends_at   >= now());
  if not found then
    return query select 0, 0, public.get_my_point_balance(), '진행 중인 미션이 아닙니다'::text; return;
  end if;

  -- 오늘 진행행 확보(없으면 생성)
  insert into public.mission_progress (mission_id, user_id, progress_date)
  values (v_m.id, v_uid, v_today)
  on conflict (mission_id, user_id, progress_date) do nothing;

  select * into v_prog from public.mission_progress
   where mission_id = v_m.id and user_id = v_uid and progress_date = v_today
   for update;

  -- 지급 횟수 제한
  if v_prog.claim_count >= v_m.max_per_day then
    return query select 0, v_prog.awarded_points, public.get_my_point_balance(), '오늘은 모두 받았어요'::text; return;
  end if;

  -- 재지급 간격(1분 체류형 등)
  if v_m.cooldown_sec > 0 and v_prog.last_claim_at is not null
     and v_prog.last_claim_at > now() - make_interval(secs => v_m.cooldown_sec) then
    return query select 0, v_prog.awarded_points, public.get_my_point_balance(), '조금 뒤에 다시 받을 수 있어요'::text; return;
  end if;

  -- 누적형(걸음·시청분)은 보고값을 최대치로, 1회형은 +1
  if v_m.metric in ('steps', 'live_minutes') then
    v_new_value := greatest(coalesce(v_prog.current_value, 0), p_value);
  else
    v_new_value := coalesce(v_prog.current_value, 0) + greatest(p_value, 1);
  end if;

  -- 보상 계산
  if jsonb_array_length(coalesce(v_m.milestones, '[]'::jsonb)) > 0 then
    -- 달성한 구간의 누적 보상에서, 이미 지급한 만큼을 뺀 차액만 지급
    select coalesce(sum((e->>'points')::int), 0) into v_award
      from jsonb_array_elements(v_m.milestones) e
     where (e->>'value')::int <= v_new_value;

    select coalesce(sum((e->>'points')::int), 0) into v_prev_award
      from jsonb_array_elements(v_m.milestones) e
     where (e->>'value')::int <= coalesce(v_prog.current_value, 0);

    v_award := greatest(v_award - v_prev_award, 0);
  else
    -- 구간 없음: 목표 도달 시 기본 보상
    if v_new_value >= v_m.target_value and coalesce(v_prog.current_value, 0) < v_m.target_value then
      v_award := v_m.reward_points;
    else
      v_award := 0;
    end if;
  end if;

  -- 진행 갱신
  update public.mission_progress
     set current_value  = v_new_value,
         claim_count    = claim_count + (case when v_award > 0 then 1 else 0 end),
         awarded_points = awarded_points + v_award,
         last_claim_at  = case when v_award > 0 then now() else last_claim_at end,
         completed_at   = case when v_new_value >= v_m.target_value and completed_at is null
                               then now() else completed_at end
   where id = v_prog.id;

  -- 포인트 지급
  if v_award > 0 then
    insert into public.point_transactions (user_id, amount, reason, expires_at)
    values (v_uid, v_award, 'mission:' || v_m.key,
            now() + make_interval(days => v_m.point_expire_days));
  end if;

  return query
    select v_award,
           (select awarded_points from public.mission_progress where id = v_prog.id),
           public.get_my_point_balance(),
           (case when v_award > 0 then '포인트를 받았어요' else '아직 목표에 도달하지 않았어요' end)::text;
end;
$$;

revoke all on function public.claim_mission(text, integer) from public;
grant execute on function public.claim_mission(text, integer) to authenticated;
