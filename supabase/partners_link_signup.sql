-- 브랜드 셀프가입 예시(2026-08-15) — 백화점 담당자와 동일한 "지점 전용 링크" 방식을
-- 브랜드에도 적용해보는 견본. /brand/register/:id 링크를 열면 그 브랜드의 로고(BI)가
-- 곧바로 표시되고, 담당자는 이메일·비밀번호만 입력하면 된다.
-- 실행: Supabase 대시보드(beautyground-main) → SQL Editor 에서 Run

-- 본인 계정 조회 — 브랜드 포털(BrandLayout/Dashboard 등)이 getMyPartner()로 자기 행을
-- 읽으려면 이 정책이 필요하다(기존엔 admin_ops.sql의 admin 전용 정책만 있었음).
drop policy if exists "partners_select_own" on public.partners;
create policy "partners_select_own" on public.partners
  for select using (auth.uid() = user_id);

-- 아직 아무도 연결 안 된(user_id 없는) 브랜드는 이름·로고만 공개 조회 가능 —
-- 가입 전 "가입 대상: OOO" 확인용. commission_rate 등 민감한 값도 같이 보이지만
-- 파트너센터 시절엔 이미 공개 조회였던 값들이라(products_public_read.sql 참고) 무해함.
drop policy if exists "partners_select_unclaimed" on public.partners;
create policy "partners_select_unclaimed" on public.partners
  for select using (user_id is null);

create or replace function public.claim_partner_account_by_id(p_id uuid)
returns public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partners;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.partners
    set user_id = auth.uid()
    where id = p_id and user_id is null
    returning * into v_row;

  if v_row.id is null then
    raise exception '이미 사용됐거나 존재하지 않는 가입링크입니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.claim_partner_account_by_id(uuid) from public;
grant execute on function public.claim_partner_account_by_id(uuid) to authenticated;
