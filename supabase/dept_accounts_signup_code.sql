-- 백화점 담당자 자체가입 — 관리자가 이메일 없이 "가입코드"만 발급하고, 담당자 본인이
-- /dept/register에서 이메일·비밀번호·코드를 직접 입력해 가입한다(2026-08-15, 대표님 지시).
-- admin_create_dept_account RPC(이메일 선연결 방식)는 더 이상 admin UI에서 쓰지 않지만
-- 남겨둬도 무해하므로 별도 정리 불필요.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

alter table public.dept_accounts
  add column if not exists signup_code text unique;

-- 코드로 셀프 가입 — 로그인은 이미 auth.signUp()으로 끝난 뒤 호출.
-- user_id가 아직 비어있는(관리자가 발급만 하고 아무도 안 쓴) 코드만 매칭.
create or replace function public.claim_dept_account(p_code text)
returns public.dept_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dept_accounts;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.dept_accounts
    set user_id = auth.uid()
    where signup_code = p_code and user_id is null
    returning * into v_row;

  if v_row.id is null then
    raise exception '유효하지 않거나 이미 사용된 코드입니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.claim_dept_account(text) from public;
grant execute on function public.claim_dept_account(text) to authenticated;
