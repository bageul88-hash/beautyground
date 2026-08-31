-- 구간 보상 미션의 지급 횟수 제한 보정 (2026-09-01, 실행 완료)
--
-- 문제: live_watch는 구간이 3개(10/30/60분)인데 max_per_day가 1로 설정돼 있어
--       10분 5P를 받는 순간 claim_count가 한도에 걸려 30분·60분 보상을 영영 못 받았다.
--       (1시간을 봐도 5P가 끝. walk_daily는 3으로 맞게 돼 있어 드러나지 않았다)
-- 조치: ① live_watch 데이터를 3회로 보정
--       ② claim_mission이 구간 개수만큼은 항상 지급하도록 한도를 자동 보정 —
--          관리자가 /admin/missions에서 구간만 늘리고 지급 횟수를 안 늘려도 같은 사고가 안 난다.
--
-- 검증(2026-09-01): 10분→5P, 30분→+15P, 45분→0P, 60분→+30P, 90분→0P = 누적 50P.

update public.missions
   set max_per_day = 3, updated_at = now()
 where key = 'live_watch' and max_per_day < 3;

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
  v_ms_count   integer;
  v_limit      integer;
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

  insert into public.mission_progress (mission_id, user_id, progress_date)
  values (v_m.id, v_uid, v_today)
  on conflict (mission_id, user_id, progress_date) do nothing;

  select * into v_prog from public.mission_progress
   where mission_id = v_m.id and user_id = v_uid and progress_date = v_today
   for update;

  -- 구간이 있으면 최소 구간 개수만큼은 받을 수 있어야 한다.
  v_ms_count := jsonb_array_length(coalesce(v_m.milestones, '[]'::jsonb));
  v_limit := case when v_ms_count > 0 then greatest(v_m.max_per_day, v_ms_count)
                  else v_m.max_per_day end;

  if v_prog.claim_count >= v_limit then
    return query select 0, v_prog.awarded_points, public.get_my_point_balance(), '오늘은 모두 받았어요'::text; return;
  end if;

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

  if v_ms_count > 0 then
    -- 달성한 구간의 누적 보상에서 이미 지급한 만큼을 뺀 차액만 지급
    select coalesce(sum((e->>'points')::int), 0) into v_award
      from jsonb_array_elements(v_m.milestones) e
     where (e->>'value')::int <= v_new_value;

    select coalesce(sum((e->>'points')::int), 0) into v_prev_award
      from jsonb_array_elements(v_m.milestones) e
     where (e->>'value')::int <= coalesce(v_prog.current_value, 0);

    v_award := greatest(v_award - v_prev_award, 0);
  else
    if v_new_value >= v_m.target_value and coalesce(v_prog.current_value, 0) < v_m.target_value then
      v_award := v_m.reward_points;
    else
      v_award := 0;
    end if;
  end if;

  update public.mission_progress
     set current_value  = v_new_value,
         claim_count    = claim_count + (case when v_award > 0 then 1 else 0 end),
         awarded_points = awarded_points + v_award,
         last_claim_at  = case when v_award > 0 then now() else last_claim_at end,
         completed_at   = case when v_new_value >= v_m.target_value and completed_at is null
                               then now() else completed_at end
   where id = v_prog.id;

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
