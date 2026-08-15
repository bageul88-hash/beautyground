-- 관리자가 이메일로 백화점 담당자 계정을 만드는 RPC.
-- 로그인 계정 자체는 대표님이 Supabase 대시보드 → Authentication → Add user 로 먼저 만든 뒤,
-- 이 RPC로 dept_accounts 행을 생성해 연결한다(admin_link_partner_account.sql과 동일 2단계 방식).
-- is_admin()은 admin_lockdown.sql에서 이미 생성됨.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

create or replace function public.admin_create_dept_account(
  p_email text,
  p_dept_key text,
  p_display_name text
)
returns public.dept_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.dept_accounts;
begin
  if not public.is_admin() then
    raise exception '관리자만 계정을 생성할 수 있습니다.';
  end if;

  if p_dept_key not in ('hyundai', 'ak') then
    raise exception '알 수 없는 백화점 구분입니다: %', p_dept_key;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception '해당 이메일로 가입된 계정이 없습니다. Supabase 대시보드에서 먼저 계정을 생성해 주세요.';
  end if;

  insert into public.dept_accounts (user_id, dept_key, display_name)
  values (v_user_id, p_dept_key, p_display_name)
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.admin_create_dept_account(text, text, text) from public;
grant execute on function public.admin_create_dept_account(text, text, text) to authenticated;
