-- 상품 상세페이지 구매 문의(Q&A) — Supabase SQL Editor에서 실행

create table if not exists product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  question text not null,
  is_secret boolean not null default false,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists product_questions_product_id_idx on product_questions(product_id);

alter table product_questions enable row level security;

-- 공개글은 전체 공개, 비밀글은 작성자 본인 또는 관리자만
drop policy if exists "product_questions_select" on product_questions;
create policy "product_questions_select" on product_questions
  for select using (is_secret = false or auth.uid() = user_id or public.is_admin());

drop policy if exists "product_questions_insert" on product_questions;
create policy "product_questions_insert" on product_questions
  for insert with check (auth.uid() = user_id);

-- 답변 등록은 관리자만
drop policy if exists "product_questions_update_admin" on product_questions;
create policy "product_questions_update_admin" on product_questions
  for update using (public.is_admin()) with check (public.is_admin());

-- 작성자 본인 또는 관리자 삭제 허용
drop policy if exists "product_questions_delete" on product_questions;
create policy "product_questions_delete" on product_questions
  for delete using (auth.uid() = user_id or public.is_admin());

notify pgrst, 'reload schema';
