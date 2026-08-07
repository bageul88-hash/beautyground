-- 홈 테마(시그널 색상) — 관리자 테마 편집 페이지(/admin/theme)에서 저장, 홈이 CSS 변수로 적용
-- Supabase SQL Editor에서 실행
--
-- theme 예시: {"signalRed":"#E60012","signalBlue":"#0047FF","signalYellow":"#FFD400"}
-- null이면 기본색(생방송 슬레이트 원색) 사용.

alter table home_settings add column if not exists theme jsonb;

notify pgrst, 'reload schema';
