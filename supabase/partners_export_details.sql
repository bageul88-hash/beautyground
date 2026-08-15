-- 브랜드 수출 상세정보(인증·수출국가·MOQ) — /brand/export 페이지 확장.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_certifications text[] DEFAULT '{}';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_countries text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS export_moq_notes text;

-- 기존 update_my_partner_export_pitch(text)를 대체 — 소개글+인증+수출국가+MOQ를 한 번에 저장.
-- SECURITY DEFINER로 이 4개 컬럼만 업데이트(commission_rate 등 다른 컬럼은 여전히 건드릴 수 없음).
create or replace function public.update_my_partner_export_details(
  p_pitch text,
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
revoke all on function public.update_my_partner_export_details(text, text[], text, text) from public;
grant execute on function public.update_my_partner_export_details(text, text[], text, text) to authenticated;

notify pgrst, 'reload schema';
