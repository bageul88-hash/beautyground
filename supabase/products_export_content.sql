-- 수출 대표상품의 별도 이미지·설명 (소비자용 사진/설명과 분리) — /brand/export 페이지 확장.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE products ADD COLUMN IF NOT EXISTS export_image_urls text[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS export_description text; -- 브랜드가 쓰는 한글 설명
ALTER TABLE products ADD COLUMN IF NOT EXISTS export_description_en text; -- /api/translate로 자동번역된 영문

-- is_export_featured 토글(set_my_product_export_featured)과 별개 RPC — 대표상품 선택 여부와
-- 수출용 이미지/설명 편집을 분리해서, 하나를 바꿀 때 다른 하나가 실수로 덮어써지지 않게 한다.
create or replace function public.update_my_product_export_content(
  p_product_id uuid,
  p_image_urls text[],
  p_description text,
  p_description_en text
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.products;
  v_partner_id uuid;
begin
  select id into v_partner_id from public.partners where user_id = auth.uid();
  if v_partner_id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  update public.products
  set export_image_urls = p_image_urls,
      export_description = p_description,
      export_description_en = p_description_en
  where id = p_product_id and partner_id = v_partner_id
  returning * into v_row;

  if v_row.id is null then
    raise exception '해당 상품에 대한 권한이 없습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.update_my_product_export_content(uuid, text[], text, text) from public;
grant execute on function public.update_my_product_export_content(uuid, text[], text, text) to authenticated;

-- 브랜드가 자기 소유 상품 폴더(export/<partner_id>/...)에만 이미지 업로드 가능.
-- product-images 버킷은 이미 공개 읽기이므로(기존 소비자용 이미지) 별도 select 정책은 불필요.
drop policy if exists "brand can upload own export images" on storage.objects;
create policy "brand can upload own export images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'export'
    and (storage.foldername(name))[2] = (select id::text from public.partners where user_id = auth.uid())
  );

notify pgrst, 'reload schema';
