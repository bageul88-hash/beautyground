-- 브랜드 스토리 사진 — /brand/export에서 브랜드가 캡션 없이 사진만 여러 장(최대 5장) 올리면
-- /x/:key 공개 페이지에 "From the Brand" 섹션으로 그리드 노출된다. 사진이 하나도 없으면
-- 섹션 자체를 숨긴다(products/certifications와 동일한 조건부 노출 패턴).
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_story_images text[] NOT NULL DEFAULT '{}';

-- 판매 파트너 계정·수출 전용 계정(export_contacts) 둘 다 편집 가능 —
-- my_export_partner_id() 헬퍼는 export_contacts.sql에 이미 정의되어 있다.
create or replace function public.update_my_partner_export_story_images(p_images text[])
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partners;
begin
  update public.partners
  set export_story_images = p_images
  where id = public.my_export_partner_id()
  returning * into v_row;

  if v_row.id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.update_my_partner_export_story_images(text[]) from public;
grant execute on function public.update_my_partner_export_story_images(text[]) to authenticated;

-- 공개 뷰(export_brand_public, partners_export_pitch_en.sql)에 컬럼 추가.
create or replace view export_brand_public as
  select id, brand_name, export_logo_url, export_pitch_en, export_certifications, export_countries, export_moq_notes, export_story_images
  from partners
  where status = 'active';

grant select on export_brand_public to anon, authenticated;

notify pgrst, 'reload schema';
