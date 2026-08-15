-- 관리자가 이메일로 브랜드 로그인 계정을 partners 행에 연결하는 RPC.
-- 계정 자체는 대표님이 Supabase 대시보드 → Authentication → Add user 로 먼저 만든 뒤,
-- 이 RPC로 연결한다(자체 회원가입 화면 없음 — 14개뿐인 기존 브랜드라 관리자가 직접 연결하기로 결정).
-- is_admin()은 admin_lockdown.sql에서 이미 생성됨.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

create or replace function public.admin_link_partner_account(p_partner_id uuid, p_email text)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.partners;
begin
  if not public.is_admin() then
    raise exception '관리자만 계정을 연결할 수 있습니다.';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception '해당 이메일로 가입된 계정이 없습니다. Supabase 대시보드에서 먼저 계정을 생성해 주세요.';
  end if;

  update public.partners set user_id = v_user_id where id = p_partner_id
  returning * into v_row;

  if v_row.id is null then
    raise exception '해당 브랜드를 찾을 수 없습니다. (partner_id=%)', p_partner_id;
  end if;

  return v_row;
end;
$$;
revoke all on function public.admin_link_partner_account(uuid, text) from public;
grant execute on function public.admin_link_partner_account(uuid, text) to authenticated;
