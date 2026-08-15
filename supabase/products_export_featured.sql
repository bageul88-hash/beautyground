-- 브랜드가 자기 상품 중 "수출 대표상품"으로 고를 수 있게 하는 플래그.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_export_featured boolean DEFAULT false;

-- 브랜드 본인 소유 상품의 is_export_featured만 토글 가능 (products 테이블에 열린 UPDATE RLS를
-- 주지 않고, partner_id 소유 확인 후 이 컬럼 하나만 SECURITY DEFINER로 업데이트).
create or replace function public.set_my_product_export_featured(p_product_id uuid, p_featured boolean)
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
  set is_export_featured = p_featured
  where id = p_product_id and partner_id = v_partner_id
  returning * into v_row;

  if v_row.id is null then
    raise exception '해당 상품에 대한 권한이 없습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.set_my_product_export_featured(uuid, boolean) from public;
grant execute on function public.set_my_product_export_featured(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
