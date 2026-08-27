-- 관리자 쿠폰 생성기 — 월별/이벤트/시크릿 쿠폰을 만들어 회원(전체/쇼핑몰/라이브)에게 일괄 발급.
-- 기존 가입혜택 쿠폰 시스템(coupon_templates + user_coupons, signup_bonus*.sql)을 그대로 재사용 —
-- get_my_valid_coupons/redeem_signup_coupon 등 결제·마이페이지 로직은 수정 없이 그대로 동작한다.
-- 실행: Supabase 대시보드(beautyground-mall, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run
-- 선행 조건: signup_bonus.sql(coupon_templates/user_coupons), admin_lockdown.sql(is_admin()),
--           members_channel_breakdown.sql(orders.live_id 로 쇼핑몰/라이브 구분) 이 먼저 적용돼 있어야 함.

alter table coupon_templates add column if not exists campaign_type text not null default 'general';
alter table coupon_templates
  drop constraint if exists coupon_templates_campaign_type_check;
alter table coupon_templates
  add constraint coupon_templates_campaign_type_check check (campaign_type in ('general', 'secret', 'event'));
alter table coupon_templates add column if not exists banner_image text;
alter table coupon_templates add column if not exists created_by uuid references auth.users(id);
alter table coupon_templates add column if not exists created_at timestamptz not null default now();

-- 1) 쿠폰 템플릿 생성 (관리자 전용)
create or replace function public.admin_create_coupon_template(
  p_label text,
  p_discount_type text,
  p_discount_value numeric,
  p_max_discount numeric,
  p_min_order_amount numeric,
  p_campaign_type text,
  p_banner_image text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if not public.is_admin() then
    raise exception '관리자만 쿠폰을 생성할 수 있습니다.';
  end if;
  if p_discount_type not in ('amount', 'percent', 'free_shipping') then
    raise exception '할인 유형이 올바르지 않습니다.';
  end if;

  v_id := 'promo_' || to_char(now(), 'YYYYMMDDHH24MISS') || '_' || substr(md5(random()::text), 1, 6);

  insert into coupon_templates (
    id, label, discount_type, discount_value, max_discount, min_order_amount, campaign_type, banner_image, created_by
  ) values (
    v_id, p_label, p_discount_type, p_discount_value, p_max_discount, p_min_order_amount,
    coalesce(nullif(p_campaign_type, ''), 'general'), p_banner_image, auth.uid()
  );

  return v_id;
end;
$$;
revoke all on function public.admin_create_coupon_template(text, text, numeric, numeric, numeric, text, text) from public;
grant execute on function public.admin_create_coupon_template(text, text, numeric, numeric, numeric, text, text) to authenticated;

-- 2) 대상 회원에게 일괄 발급 (관리자 전용) — p_target: 'all' | 'mall' | 'live' | 'self' | 'selected'
--    mall/live 구분 기준은 members_channel_breakdown.sql 과 동일(orders.live_id 유무).
--    p_target='selected' 일 때만 p_user_ids(회원 관리 화면에서 고른 회원 id 목록)를 사용.
--    인자 개수가 바뀌므로(uuid[] 추가) create or replace 대신 drop 후 재생성해야 함(Postgres 제약,
--    안 그러면 3-인자 옛 함수가 오버로드로 남아 PostgREST RPC 호출이 어느 쪽인지 모호해짐).
drop function if exists public.admin_issue_coupon(text, text, int);
create or replace function public.admin_issue_coupon(
  p_template_id text,
  p_target text,
  p_expires_days int,
  p_user_ids uuid[] default null
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 쿠폰을 발급할 수 있습니다.';
  end if;
  if p_target not in ('all', 'mall', 'live', 'self', 'selected') then
    raise exception '발급 대상이 올바르지 않습니다.';
  end if;

  -- 'self' = 실제 회원 건드리지 않는 테스트 발송(관리자 본인에게만)
  if p_target = 'self' then
    return query
      insert into user_coupons (user_id, template_id, expires_at)
      values (auth.uid(), p_template_id, now() + make_interval(days => greatest(coalesce(p_expires_days, 30), 1)))
      returning user_coupons.user_id;
    return;
  end if;

  -- 'selected' = 회원 관리 화면에서 체크박스로 고른 회원에게만
  if p_target = 'selected' then
    if p_user_ids is null or array_length(p_user_ids, 1) is null then
      raise exception '선택된 회원이 없습니다.';
    end if;
    return query
      insert into user_coupons (user_id, template_id, expires_at)
      select uid, p_template_id, now() + make_interval(days => greatest(coalesce(p_expires_days, 30), 1))
      from unnest(p_user_ids) as uid
      returning user_coupons.user_id;
    return;
  end if;

  return query
    insert into user_coupons (user_id, template_id, expires_at)
    select target_users.id, p_template_id, now() + make_interval(days => greatest(coalesce(p_expires_days, 30), 1))
    from (
      select u.id
      from auth.users u
      where p_target = 'all'
         or exists (
           select 1 from public.orders o
           where o.user_id = u.id
             and o.status in ('paid', 'shipped', 'done')
             and (
               (p_target = 'mall' and o.live_id is null) or
               (p_target = 'live' and o.live_id is not null)
             )
         )
    ) as target_users
    returning user_coupons.user_id;
end;
$$;
revoke all on function public.admin_issue_coupon(text, text, int, uuid[]) from public;
grant execute on function public.admin_issue_coupon(text, text, int, uuid[]) to authenticated;

-- 3) 쿠폰 배너 이미지 업로드 — product-images 버킷(이미 공개 버킷, export/ 접두사와 같은 관례)의
--    coupons/ 접두사에 관리자만 업로드 가능. 웹푸시 payload 용량 제한(약 4KB) 때문에
--    이미지는 base64로 넣지 않고 여기 올린 뒤 공개 URL만 push payload에 담는다.
drop policy if exists "admin can upload coupon banners" on storage.objects;
create policy "admin can upload coupon banners"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = 'coupons'
    and public.is_admin()
  );

-- 4) 쿠폰함/체크아웃에 배너 이미지도 같이 보여주기 위해 get_my_valid_coupons()에 banner_image 추가.
--    반환 컬럼이 늘어나므로 drop 후 재생성(Postgres 제약, signup_bonus.sql 원본 버전을 대체).
drop function if exists public.get_my_valid_coupons();
create or replace function public.get_my_valid_coupons()
returns table (
  id uuid, template_id text, label text, discount_type text,
  discount_value numeric, max_discount numeric, min_order_amount numeric, expires_at timestamptz,
  banner_image text
)
language sql
security definer
set search_path = public
as $$
  select uc.id, uc.template_id, ct.label, ct.discount_type, ct.discount_value, ct.max_discount, ct.min_order_amount, uc.expires_at, ct.banner_image
  from user_coupons uc
  join coupon_templates ct on ct.id = uc.template_id
  where uc.user_id = auth.uid() and uc.used_at is null and uc.expires_at >= now()
  order by uc.expires_at asc;
$$;
grant execute on function public.get_my_valid_coupons() to authenticated;

notify pgrst, 'reload schema';
