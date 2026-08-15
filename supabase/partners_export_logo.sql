-- 브랜드 BI 로고 (해외 바이어 제안 자료용) — /brand/export 페이지 확장.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_logo_url text;

create or replace function public.update_my_partner_export_logo(p_logo_url text)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partners;
begin
  update public.partners
  set export_logo_url = p_logo_url
  where user_id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.update_my_partner_export_logo(text) from public;
grant execute on function public.update_my_partner_export_logo(text) to authenticated;

notify pgrst, 'reload schema';
