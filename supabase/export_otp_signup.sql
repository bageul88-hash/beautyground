-- 브랜드 셀프 가입(이메일 OTP 로그인 후 새 브랜드 생성) — 2026-08-17 (v2: export_contacts 미존재 환경 대응)
-- 처음 로그인한 이메일이 브랜드명을 입력하면 partners에 status='pending'으로 생성된다.
-- pending 상태는 export_brand_public 뷰(status='active' 필터)에 안 잡히므로
-- 관리자(/admin/partners)가 active로 승인하기 전까지 바이어에게 노출되지 않는다.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create or replace function public.create_my_export_brand(p_brand_name text)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partners;
  v_name text := trim(p_brand_name);
  v_dup boolean := false;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if length(v_name) < 1 or length(v_name) > 40 then
    raise exception '브랜드명은 1~40자로 입력해 주세요.';
  end if;
  -- 이미 브랜드가 연결된 계정은 중복 생성 금지
  if exists (select 1 from partners where user_id = auth.uid()) then
    raise exception '이미 연결된 브랜드가 있습니다.';
  end if;
  -- 수출 전용 계정 테이블(export_contacts)은 아직 생성 전인 환경일 수 있으므로 존재할 때만 검사
  if to_regclass('public.export_contacts') is not null then
    execute 'select exists(select 1 from public.export_contacts where user_id = $1)' into v_dup using auth.uid();
    if v_dup then
      raise exception '이미 연결된 브랜드가 있습니다.';
    end if;
  end if;
  -- 같은 이름의 활성/대기 브랜드가 있으면 안내 (중복 페이지 방지)
  if exists (select 1 from partners where lower(trim(brand_name)) = lower(v_name) and status in ('active','pending')) then
    raise exception '이미 등록된 브랜드명입니다. 기존 담당자라면 뷰티그라운드에 연결을 요청해 주세요.';
  end if;

  insert into partners (brand_name, user_id, status)
  values (v_name, auth.uid(), 'pending')
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.create_my_export_brand(text) from public;
grant execute on function public.create_my_export_brand(text) to authenticated;

NOTIFY pgrst, 'reload schema';
