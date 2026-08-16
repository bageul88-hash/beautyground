-- 수출 페이지 다국어 콘텐츠 저장 (2026-08-17)
-- 브랜드는 한글만 쓰고, 저장 시 서버(api/export-translate)가 Gemini로 9개 언어 번역을 만들어 여기에 저장한다.
-- 바이어 페이지(/x/:key)는 저장된 번역을 읽기만 하므로 언어 수가 늘어도 페이지 속도에 영향 없음.
-- 언어 키: en, ja, zh_cn(간체), zh_tw(번체), ms(말레이), id(인니), vi(베트남), th(태국), ru(러시아)
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

-- 브랜드 소개 번역: { "en": "...", "ja": "...", ... }
ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_pitch_i18n jsonb DEFAULT '{}'::jsonb;

-- 상품 번역: { "name": { "en": "...", ... }, "desc": { "en": "...", ... } }
ALTER TABLE products ADD COLUMN IF NOT EXISTS export_i18n jsonb DEFAULT '{}'::jsonb;

-- 공개 뷰에 번역 컬럼 포함 (기존 컬럼 구성 + export_pitch_i18n)
create or replace view export_brand_public as
  select id, brand_name, export_logo_url, export_pitch_en, export_certifications, export_countries, export_moq_notes,
         export_pitch_i18n
  from partners
  where status = 'active';

grant select on export_brand_public to anon, authenticated;

NOTIFY pgrst, 'reload schema';
