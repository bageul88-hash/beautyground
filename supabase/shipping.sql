-- 쇼핑몰 물류(배송) 1단계 — 배송지 컬럼 + 배송 상태 + 추적 이벤트 테이블 (2026-08-27)
-- 실행: Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) → SQL Editor → Run
-- 배경: 일반 결제 주문은 지금까지 배송지 주소가 주문 행에 저장되지 않았음(직원구매만 delivery_memo에 "배송지:" 텍스트).
--       송장 발급·CJ 접수 엑셀에 수령인/주소가 필요하므로 정식 컬럼을 두고, 체크아웃/직원주문이 여기에 쓴다.

-- 1) 배송지·배송 상태 컬럼
alter table public.orders add column if not exists recipient_name text;
alter table public.orders add column if not exists recipient_phone text;
alter table public.orders add column if not exists ship_address text;
alter table public.orders add column if not exists ship_zip text;
alter table public.orders add column if not exists ship_from text;              -- '광명' | '수원' (출고 매장)
alter table public.orders add column if not exists shipping_status text;        -- ready/label_issued/shipped/in_transit/out_for_delivery/delivered/return_requested/returned
alter table public.orders add column if not exists label_issued_at timestamptz;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;

create index if not exists orders_tracking_number_idx on public.orders(tracking_number);
create index if not exists orders_shipping_status_idx on public.orders(shipping_status);

-- 2) 배송 추적 이벤트 (택배사 조회 결과 이력 — 2단계 자동 동기화가 여기에 적재)
create table if not exists public.shipment_events (
  id bigserial primary key,
  payment_id text,                       -- 주문 묶음 키(orders.payment_id)
  tracking_number text not null,
  carrier text not null default 'cj',
  status_code text,                      -- 집화/간선상차/배달출발/배달완료 등 택배사 코드
  status_text text,
  location text,
  event_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (tracking_number, event_at, status_text)
);
create index if not exists shipment_events_tracking_idx on public.shipment_events(tracking_number);
create index if not exists shipment_events_payment_idx on public.shipment_events(payment_id);

alter table public.shipment_events enable row level security;

-- 관리자 전체 읽기/쓰기 (is_admin()은 admin_lockdown.sql)
drop policy if exists "shipment_events_admin_all" on public.shipment_events;
create policy "shipment_events_admin_all" on public.shipment_events
  for all using (public.is_admin()) with check (public.is_admin());

-- 주문자 본인 읽기 (내 주문의 송장 이벤트만)
drop policy if exists "shipment_events_select_own" on public.shipment_events;
create policy "shipment_events_select_own" on public.shipment_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.payment_id = shipment_events.payment_id and o.user_id = auth.uid()
    )
  );

-- 3) 기존 주문 보정: 직원구매 등 delivery_memo에 "배송지: ..." 로 들어간 주소를 컬럼으로 옮김 (1회)
update public.orders
set ship_address = trim(regexp_replace(split_part(delivery_memo, E'\n', 1), '^배송지:\s*', ''))
where ship_address is null and delivery_memo like '배송지:%';

update public.orders
set recipient_name = coalesce(recipient_name, buyer_name),
    recipient_phone = coalesce(recipient_phone, buyer_phone)
where recipient_name is null or recipient_phone is null;

notify pgrst, 'reload schema';
