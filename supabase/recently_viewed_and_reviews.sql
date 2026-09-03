-- 최근 본 상품 + 구매후기(리뷰) 작성 + 리뷰 적립금(1,000원) — 2026-09-03 대표님 지시
-- 마이페이지의 "최근 본 상품"·"리뷰 관리" 메뉴가 그동안 연결된 기능 없이 자리만 차지하고
-- 있던 것을 실제로 구현한다. Vercel 함수가 12/12로 꽉 차 있어(project_beautyground_mall_vercel_function_limit)
-- 새 API 라우트 대신 기존 패턴대로 supabase.rpc()로 처리한다.
-- 실행: Supabase 대시보드(beautyground-mall) → SQL Editor 에 붙여넣고 Run

-- ────────────────────────────────────────────────────────────────
-- 1) 최근 본 상품 — 조회할 때마다 upsert로 viewed_at만 갱신(같은 상품 중복 없음)
-- ────────────────────────────────────────────────────────────────
create table if not exists recently_viewed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists recently_viewed_items_user_id_idx on recently_viewed_items(user_id, viewed_at desc);

alter table recently_viewed_items enable row level security;

drop policy if exists "recently_viewed_select_own" on recently_viewed_items;
create policy "recently_viewed_select_own" on recently_viewed_items
  for select using (auth.uid() = user_id);

drop policy if exists "recently_viewed_insert_own" on recently_viewed_items;
create policy "recently_viewed_insert_own" on recently_viewed_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "recently_viewed_update_own" on recently_viewed_items;
create policy "recently_viewed_update_own" on recently_viewed_items
  for update using (auth.uid() = user_id);

drop policy if exists "recently_viewed_delete_own" on recently_viewed_items;
create policy "recently_viewed_delete_own" on recently_viewed_items
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 2) 구매후기(리뷰) — 배송완료(status='done') 주문 1건당 상품 1개에 리뷰 1개만
-- ────────────────────────────────────────────────────────────────
create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_reviews_product_id_idx on product_reviews(product_id);
create index if not exists product_reviews_user_id_idx on product_reviews(user_id);

alter table product_reviews enable row level security;

-- product_questions과 동일하게 공개 조회(추후 상품상세에 노출할 수 있도록), 작성은 RPC로만
drop policy if exists "product_reviews_select" on product_reviews;
create policy "product_reviews_select" on product_reviews
  for select using (true);

drop policy if exists "product_reviews_delete_own" on product_reviews;
create policy "product_reviews_delete_own" on product_reviews
  for delete using (auth.uid() = user_id or public.is_admin());

-- insert 정책은 없음 — submit_product_review() RPC(security definer)로만 생성,
-- 배송완료 주문 검증 + 적립금 지급을 한 트랜잭션으로 묶기 위함(직접 insert는 RLS가 항상 막음)

-- ────────────────────────────────────────────────────────────────
-- 3) 리뷰 작성 + 적립금 1,000원 지급 RPC
--    이미 이 상품에 리뷰를 쓴 적 있으면(unique 제약) 에러로 막는다.
-- ────────────────────────────────────────────────────────────────
create or replace function public.submit_product_review(
  p_order_id uuid,
  p_rating integer,
  p_text text,
  p_author_name text
)
returns product_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_order  orders%rowtype;
  v_review product_reviews%rowtype;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;
  if p_rating < 1 or p_rating > 5 then
    raise exception '별점은 1~5 사이여야 합니다';
  end if;
  if length(trim(coalesce(p_text, ''))) < 5 then
    raise exception '리뷰 내용을 5자 이상 입력해 주세요';
  end if;

  select * into v_order from orders
   where id = p_order_id and user_id = v_uid and status = 'done';
  if not found then
    raise exception '리뷰를 작성할 수 없는 주문입니다';
  end if;
  if v_order.product_id is null then
    raise exception '상품 정보를 찾을 수 없습니다';
  end if;

  if exists (select 1 from product_reviews where user_id = v_uid and product_id = v_order.product_id) then
    raise exception '이미 이 상품에 리뷰를 작성했습니다';
  end if;

  insert into product_reviews (product_id, user_id, order_id, author_name, rating, review_text)
  values (v_order.product_id, v_uid, p_order_id, coalesce(nullif(trim(p_author_name), ''), '구매자'), p_rating, trim(p_text))
  returning * into v_review;

  insert into point_transactions (user_id, amount, reason, expires_at)
  values (v_uid, 1000, 'review_bonus', now() + interval '30 days');

  return v_review;
end;
$$;

revoke all on function public.submit_product_review(uuid, integer, text, text) from public;
grant execute on function public.submit_product_review(uuid, integer, text, text) to authenticated;

notify pgrst, 'reload schema';
