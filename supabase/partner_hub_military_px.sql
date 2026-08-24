-- 파트너 허브(/partners)에 "국군복지단 PX" 카테고리 추가 — WA몰(군 복지 온라인쇼핑몰) 입점 정보.
-- 기존 partner_hub_posts.category CHECK 제약을 military_px 포함하도록 교체.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

alter table public.partner_hub_posts drop constraint if exists partner_hub_posts_category_check;
alter table public.partner_hub_posts
  add constraint partner_hub_posts_category_check
  check (category in ('gov_support', 'dept_store', 'operations', 'military_px'));

notify pgrst, 'reload schema';
