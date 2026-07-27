-- ============================================================================
-- 판매자(상품 소유) 계정을 대표님 관리자 계정으로 통합 — 2026-07-27
-- 목적: beautyground.official@gmail.com 하나로 로그인하면
--       상품/주문/정산(판매자) + 회사 관리(관리자)를 모두 다루게 한다.
-- 방식: 기존 활성 판매자(테스트브랜드, 상품 181개 소유)의 소유주(user_id)를
--       beautyground.official 로 바꾼다. 상품·주문은 partner_id 로 연결돼 있어
--       한 줄만 바꾸면 모든 상품이 자동으로 대표님 계정으로 따라온다.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에 붙여넣고 Run.
--
-- 참고 ID:
--   beautyground.official user_id = 497a68ad-0a3e-4af7-a511-48f51c5eb121
--   기존 판매자 partners.id       = 464b8675-ad5e-4601-b82a-3ecf19fd11c3 (테스트브랜드)
-- ============================================================================

update public.partners
set user_id    = '497a68ad-0a3e-4af7-a511-48f51c5eb121',
    brand_name = '뷰티그라운드'
where id = '464b8675-ad5e-4601-b82a-3ecf19fd11c3';

-- 확인용: 아래를 실행해 user_id/brand_name/status 가 바뀌었는지 확인
--   select id, brand_name, status, user_id from public.partners;
