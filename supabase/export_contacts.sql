-- 수출 전용 계정 — 기존 판매 파트너 로그인(partners.user_id)과 완전히 분리된 별도 로그인.
-- 브랜드의 수출 담당자가 이 계정으로 로그인하면 "수출 소개"만 보이고, 대시보드/판매내역/
-- 정산내역(라이브 판매실적·정산금)에는 접근할 수 없다.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create table if not exists export_contacts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table export_contacts enable row level security;

-- 본인 행 조회(로그인 후 자기 partner_id 알아내기용)
drop policy if exists "export_contacts_select_own" on export_contacts;
create policy "export_contacts_select_own" on export_contacts
  for select using (auth.uid() = user_id);

-- 아직 아무도 연결 안 된(user_id 없는) 초대 슬롯은 브랜드 확인용으로 공개 조회 가능
-- (partners_link_signup.sql의 partners_select_unclaimed와 동일 패턴)
drop policy if exists "export_contacts_select_unclaimed" on export_contacts;
create policy "export_contacts_select_unclaimed" on export_contacts
  for select using (user_id is null);

-- 관리자가 /admin/partners에서 브랜드별 수출 전용 초대 슬롯 생성
create or replace function public.create_export_contact_slot(p_partner_id uuid)
returns export_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row export_contacts;
begin
  if not public.is_admin() then
    raise exception '관리자만 가능합니다.';
  end if;
  insert into export_contacts (partner_id) values (p_partner_id) returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.create_export_contact_slot(uuid) from public;
grant execute on function public.create_export_contact_slot(uuid) to authenticated;

-- 가입 링크로 들어온 사용자가 슬롯을 claim
create or replace function public.claim_export_contact_by_id(p_id uuid)
returns export_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row export_contacts;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update export_contacts
    set user_id = auth.uid()
    where id = p_id and user_id is null
    returning * into v_row;

  if v_row.id is null then
    raise exception '이미 사용됐거나 존재하지 않는 가입링크입니다.';
  end if;

  return v_row;
end;
$$;
revoke all on function public.claim_export_contact_by_id(uuid) from public;
grant execute on function public.claim_export_contact_by_id(uuid) to authenticated;

-- 로그인한 사용자의 partner_id를, "판매 파트너 계정"이든 "수출 전용 계정"이든 구분 없이
-- 알아내는 공통 헬퍼. 아래 4개 export RPC + storage 업로드 정책에서 공통으로 써서
-- 두 계정 타입이 "같은 브랜드 데이터"를 편집할 수 있게 하면서도, 대시보드/판매내역/정산내역
-- 등 판매 관련 화면은 이 헬퍼를 쓰지 않으므로(여전히 partners.user_id만 확인) 수출 전용
-- 계정에서는 절대 열리지 않는다.
create or replace function public.my_export_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select id from partners where user_id = auth.uid()),
    (select partner_id from export_contacts where user_id = auth.uid())
  )
$$;
revoke all on function public.my_export_partner_id() from public;
grant execute on function public.my_export_partner_id() to authenticated;

-- 수출 전용 계정은 partners 테이블을 직접 못 읽으므로(partners_select_own은
-- user_id=auth.uid() 기준이라 export_contacts 경유 계정은 해당 안 됨), 자기 브랜드 행을
-- 조회할 수 있는 전용 RPC. /brand/export 페이지가 기존 데이터를 불러올 때 사용(lib/partner.ts
-- getMyBrandAccess).
create or replace function public.get_my_export_partner()
returns public.partners
language sql
stable
security definer
set search_path = public
as $$
  select * from partners where id = public.my_export_partner_id()
$$;
revoke all on function public.get_my_export_partner() from public;
grant execute on function public.get_my_export_partner() to authenticated;

-- 아래 4개는 기존 함수를 my_export_partner_id() 사용하도록 재정의(시그니처 동일, 안전하게 교체됨).

create or replace function public.update_my_partner_export_details(
  p_pitch text,
  p_pitch_en text,
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
      export_pitch_en = p_pitch_en,
      export_certifications = p_certifications,
      export_countries = p_countries,
      export_moq_notes = p_moq_notes
  where id = public.my_export_partner_id()
  returning * into v_row;

  if v_row.id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  return v_row;
end;
$$;

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
  where id = public.my_export_partner_id()
  returning * into v_row;

  if v_row.id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  return v_row;
end;
$$;

create or replace function public.set_my_product_export_featured(p_product_id uuid, p_featured boolean)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.products;
  v_partner_id uuid;
begin
  v_partner_id := public.my_export_partner_id();
  if v_partner_id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  update public.products
  set is_export_featured = p_featured
  where id = p_product_id and partner_id = v_partner_id
  returning * into v_row;

  if v_row.id is null then
    raise exception '해당 상품에 대한 권한이 없습니다.';
  end if;

  return v_row;
end;
$$;

create or replace function public.update_my_product_export_content(
  p_product_id uuid,
  p_image_urls text[],
  p_description text,
  p_description_en text
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.products;
  v_partner_id uuid;
begin
  v_partner_id := public.my_export_partner_id();
  if v_partner_id is null then
    raise exception '연결된 브랜드 계정을 찾을 수 없습니다.';
  end if;

  update public.products
  set export_image_urls = p_image_urls,
      export_description = p_description,
      export_description_en = p_description_en
  where id = p_product_id and partner_id = v_partner_id
  returning * into v_row;

  if v_row.id is null then
    raise exception '해당 상품에 대한 권한이 없습니다.';
  end if;

  return v_row;
end;
$$;

-- storage 업로드 정책도 my_export_partner_id() 기준으로 교체 — 수출 전용 계정도 자기 브랜드
-- 폴더(export/<partner_id>/...)에 로고·상품 이미지를 올릴 수 있어야 하므로.
drop policy if exists "brand can upload own export images" on storage.objects;
create policy "brand can upload own export images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'export'
    and (storage.foldername(name))[2] = (select public.my_export_partner_id()::text)
  );

notify pgrst, 'reload schema';
