-- 라이브 예상 방송시간(분 단위). 시청자에게 "약 60분 예정"처럼 안내하고, 종료 예정시각 계산 등에 사용.
-- NULL 허용(미입력 = 미정). 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

alter table public.lives
  add column if not exists duration_minutes int;
