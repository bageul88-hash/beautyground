-- 지점 전용 가입링크 방식(2026-08-15) — 관리자가 백화점+지점명을 미리 지정해 만든
-- dept_accounts 행의 id 자체가 가입링크(/dept/register/:id)가 된다. 담당자는 그 링크를 열어
-- 이메일·비밀번호만 입력(브랜드/지점명은 이미 정해져 있어 직접 고를 여지가 없음).
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

-- 아직 아무도 가입 안 한(user_id 없는) 슬롯은 누구나 조회 가능 — 가입 전 "가입 대상: OOO" 표시용.
-- 민감정보 없음(dept_key/display_name뿐이라 안전). 가입되면(user_id 채워지면) 더는 이 정책으로 안 보임
-- (그 다음부턴 dept_accounts_select_own이 이어받음).
drop policy if exists "dept_accounts_select_unclaimed" on public.dept_accounts;
create policy "dept_accounts_select_unclaimed" on public.dept_accounts
  for select using (user_id is null);

-- id로 특정 슬롯을 본인 계정에 연결 (claim_dept_account의 id 버전 — signup_code 대신 id 사용)
create or replace function public.claim_dept_account_by_id(p_id uuid)
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
    where id = p_id and user_id is null
    returning * into v_row;

  if v_row.id is null then
    raise exception '이미 사용됐거나 존재하지 않는 가입링크입니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.claim_dept_account_by_id(uuid) from public;
grant execute on function public.claim_dept_account_by_id(uuid) to authenticated;
