-- 백화점 담당자 셀프 가입을 코드 없이 단순화(2026-08-15, 대표님 지시) — 가입 링크(/dept/register)
-- 자체를 저희가 필요한 담당자에게만 전달하는 방식이라 별도 코드가 굳이 필요 없다고 판단.
-- 로그인 후 자기 자신의 user_id로 dept_accounts 행을 직접 만들 수 있게 INSERT 정책 추가.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

drop policy if exists "dept_accounts_insert_own" on public.dept_accounts;
create policy "dept_accounts_insert_own" on public.dept_accounts
  for insert with check (auth.uid() = user_id);
