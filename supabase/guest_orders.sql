-- 비회원 주문 (2026-08-18) — 로그인 없이 주문 접수 + 주문번호·연락처로 조회
-- 실행: Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) → SQL Editor 에 붙여넣고 Run

-- 1) 비회원(anon) 주문 접수 허용 — user_id 없는 pending 행만 만들 수 있다 (금액 검증은 payment-complete 서버가 수행)
drop policy if exists "비회원 주문 접수" on orders;
create policy "비회원 주문 접수" on orders
  for insert to anon
  with check (user_id is null and status = 'pending');

-- 결제창이 그 자리에서 닫힌 경우(동기 실패) 클라이언트가 status='failed'로 되돌릴 수 있게 — pending 행만
drop policy if exists "비회원 주문 실패 처리" on orders;
create policy "비회원 주문 실패 처리" on orders
  for update to anon
  using (user_id is null and status = 'pending')
  with check (user_id is null and status in ('pending', 'failed'));

-- 2) 비회원 주문 조회 — 주문번호(payment_id) + 주문 시 연락처가 모두 일치할 때만 반환
create or replace function public.guest_order_lookup(p_payment_id text, p_phone text)
returns table (
  order_name text, quantity integer, amount numeric, status text, created_at timestamptz, delivery_memo text
)
language sql
security definer
set search_path = public
as $$
  select o.order_name, o.quantity, o.amount, o.status, o.created_at, o.delivery_memo
  from orders o
  where o.payment_id = trim(p_payment_id)
    and regexp_replace(coalesce(o.buyer_phone, ''), '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
    and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 10
  order by o.amount desc;
$$;
revoke all on function public.guest_order_lookup(text, text) from public;
grant execute on function public.guest_order_lookup(text, text) to anon, authenticated;

NOTIFY pgrst, 'reload schema';
