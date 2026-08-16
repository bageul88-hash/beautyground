-- 브랜드 소개글 영문 버전 — /brand/export "번역하기" 버튼으로 채움, 공개 /export 페이지의
-- "Featured Brands" 섹션에서 해외 바이어에게 노출됨.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_pitch_en text;

-- update_my_partner_export_details를 5번째 인자(p_pitch_en) 포함하도록 교체.
-- 기존 함수 시그니처(text,text[],text,text)는 더 이상 프론트에서 호출하지 않으므로 drop.
drop function if exists public.update_my_partner_export_details(text, text[], text, text);

create or replace function public.update_my_partner_export_details(
  p_pitch text,
  p_pitch_en text,
  p_certifications text[],
  p_countries text,
  p_moq_notes text
)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partners;
begin
  update public.partners
  set export_pitch = p_pitch,
      export_pitch_en = p_pitch_en,
      export_certifications = p_certifications,
      export_countries = p_countries,
      export_moq_notes = p_moq_notes
  where user_id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.update_my_partner_export_details(text, text, text[], text, text) from public;
grant execute on function public.update_my_partner_export_details(text, text, text[], text, text) to authenticated;

-- 공개 /export 페이지에서 브랜드 목록을 anon으로 조회하기 위한 전용 뷰.
-- partners 는 "본인만 조회" RLS라 anon이 직접 못 읽음(products_public_read.sql의 partner_brands
-- 뷰와 동일한 패턴) — commission_rate/user_id/contact 등 민감 컬럼은 절대 노출하지 않고,
-- 수출 소개에 필요한 컬럼만 골라서 공개하며, status='active'인 브랜드만 노출.
create or replace view export_brand_public as
  select id, brand_name, export_logo_url, export_pitch_en, export_certifications, export_countries, export_moq_notes
  from partners
  where status = 'active';

grant select on export_brand_public to anon, authenticated;

notify pgrst, 'reload schema';
