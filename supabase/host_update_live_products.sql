-- 진행자가 자기 라이브에 판매 상품을 붙이는 RPC (2026-08-27).
-- lives 테이블엔 호스트용 update RLS 정책이 없어(호스트가 status/host_token 등 민감 컬럼을
-- 직접 못 건드리게 하려는 의도) product_ids/highlight_product_id만 딱 집어 바꿀 수 있게
-- create_my_live(supabase/host_create_live.sql)와 같은 SECURITY DEFINER 패턴을 쓴다.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor에서 Run

create or replace function public.host_update_live_products(
  p_live_id uuid,
  p_product_ids uuid[],
  p_highlight_product_id uuid default null
)
returns public.lives
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host_id uuid;
  v_row public.lives;
begin
  select h.id into v_host_id from public.hosts h where h.user_id = auth.uid() and h.status = 'active';
  if v_host_id is null then
    raise exception '승인된 진행자만 상품을 등록할 수 있습니다.';
  end if;

  if p_highlight_product_id is not null and not (p_highlight_product_id = any(p_product_ids)) then
    raise exception '대표 상품은 등록한 상품 목록 안에 있어야 합니다.';
  end if;

  update public.lives
  set product_ids = p_product_ids,
      highlight_product_id = p_highlight_product_id
  where id = p_live_id and host_id = v_host_id
  returning * into v_row;

  if v_row.id is null then
    raise exception '본인 라이브만 상품을 등록할 수 있습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.host_update_live_products(uuid, uuid[], uuid) from public;
grant execute on function public.host_update_live_products(uuid, uuid[], uuid) to authenticated;

notify pgrst, 'reload schema';
