-- 계절/명절 맞춤 상품 추천 + 홈 공지 마퀴(home_settings 테이블이 아직 없어 함께 생성) — Supabase SQL Editor에서 실행

alter table products add column if not exists season_tags text[] not null default '{}';

create table if not exists home_settings (
  id int primary key default 1,
  marquee_items text[] not null default array[
    '🎁 회원가입하면 다양한 혜택이 준비되어 있어요',
    '💛 뷰티그라운드 셀렉트 신상품을 만나보세요'
  ],
  active_season text,
  updated_at timestamptz not null default now()
);

insert into home_settings (id) values (1) on conflict (id) do nothing;

alter table home_settings enable row level security;

drop policy if exists "home_settings_public_read" on home_settings;
create policy "home_settings_public_read" on home_settings
  for select using (true);

drop policy if exists "home_settings_admin_write" on home_settings;
create policy "home_settings_admin_write" on home_settings
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
