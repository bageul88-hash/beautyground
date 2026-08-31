-- 미션 시스템 — 관리자 쓰기 정책 (missions.sql 실행 후 이어서 실행)
-- 기존 admin_lockdown.sql의 is_admin() 함수를 그대로 사용한다(app_admins 테이블 기반).
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor

-- missions: 관리자만 등록/수정/삭제 (읽기는 앞서 만든 missions_public_read 정책이 담당)
drop policy if exists "missions_insert_admin" on public.missions;
create policy "missions_insert_admin" on public.missions
  for insert with check (public.is_admin());

drop policy if exists "missions_update_admin" on public.missions;
create policy "missions_update_admin" on public.missions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "missions_delete_admin" on public.missions;
create policy "missions_delete_admin" on public.missions
  for delete using (public.is_admin());

-- 관리자는 비활성 미션도 조회할 수 있어야 관리 화면에서 켜고 끌 수 있음
drop policy if exists "missions_select_admin" on public.missions;
create policy "missions_select_admin" on public.missions
  for select using (public.is_admin());

-- mission_progress: 관리자 전체 조회(운영 점검용). 쓰기는 서버(service_role)만.
drop policy if exists "mission_progress_select_admin" on public.mission_progress;
create policy "mission_progress_select_admin" on public.mission_progress
  for select using (public.is_admin());
