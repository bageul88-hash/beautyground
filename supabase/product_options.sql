-- 상품 옵션(색상 등) 선택 기능. 옵션 없는 상품은 그대로(선택 없이 바로 구매), 옵션 있는
-- 상품만 선택 안 하면 구매/장바구니 버튼이 막힌다.
create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  in_stock boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_options_product_id on product_options(product_id);

alter table product_options enable row level security;
create policy "public read product_options" on product_options for select using (true);

alter table cart_items add column if not exists option_label text;
alter table orders add column if not exists option_label text;
