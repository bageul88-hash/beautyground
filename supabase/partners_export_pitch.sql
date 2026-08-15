-- 브랜드 자체 작성 수출 소개글 (/brand/export 페이지)
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_pitch text;

-- 브랜드 본인이 자기 export_pitch만 수정할 수 있는 RPC. partners 테이블에 열린 UPDATE RLS를
-- 주지 않는 이유: commission_rate·status 등 다른 컬럼까지 브랜드가 건드릴 수 있게 되는 걸 막기 위함
-- (SECURITY DEFINER로 export_pitch 컬럼 하나만 업데이트).
create or replace function public.update_my_partner_export_pitch(p_pitch text)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partners;
begin
  update public.partners
  set export_pitch = p_pitch
  where user_id = auth.uid()
  returning * into v_row;

  if v_row.id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.update_my_partner_export_pitch(text) from public;
grant execute on function public.update_my_partner_export_pitch(text) to authenticated;

notify pgrst, 'reload schema';
