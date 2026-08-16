-- 셀프 가입 수출 브랜드의 제품 직접 추가 + 수출 이미지 업로드 권한 (2026-08-17)
-- 셀프 가입 브랜드는 쇼핑몰 상품이 없으므로 수출 전용 상품(status='hidden' — 쇼핑몰에는 절대 노출 안 됨)을
-- 직접 만들 수 있어야 한다. 이미지 업로드 스토리지 정책도 함께 설치(이전 세션 파일이 실행되지 않았던 것 확인됨).
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

-- 1) 수출 전용 상품 생성 — 내 브랜드에만, 쇼핑몰 비노출(hidden)
create or replace function public.create_my_export_product(p_name text)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_row public.products;
  v_name text := trim(p_name);
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  select id into v_partner_id from partners where user_id = auth.uid();
  if v_partner_id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;
  if length(v_name) < 1 or length(v_name) > 80 then
    raise exception '제품명은 1~80자로 입력해 주세요.';
  end if;
  insert into products (partner_id, name, price, status, is_export_featured)
  values (v_partner_id, v_name, 0, 'hidden', true)
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.create_my_export_product(text) from public;
grant execute on function public.create_my_export_product(text) to authenticated;

-- 2) 내가 만든 수출 전용 상품 삭제 — hidden 상태(쇼핑몰 미노출) 상품만, 내 브랜드 것만
create or replace function public.delete_my_export_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  select id into v_partner_id from partners where user_id = auth.uid();
  if v_partner_id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;
  delete from products
  where id = p_product_id and partner_id = v_partner_id and status = 'hidden';
  if not found then
    raise exception '삭제할 수 없는 상품입니다. (쇼핑몰 판매 상품은 뷰티그라운드에 요청해 주세요)';
  end if;
end;
$$;
revoke all on function public.delete_my_export_product(uuid) from public;
grant execute on function public.delete_my_export_product(uuid) to authenticated;

-- 3) 수출 이미지(로고·제품 사진) 업로드 스토리지 정책 — export/<내 partner_id>/ 폴더에만 업로드 가능
drop policy if exists "brand can upload own export images" on storage.objects;
create policy "brand can upload own export images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'export'
    and (storage.foldername(name))[2] = (select id::text from partners where user_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
