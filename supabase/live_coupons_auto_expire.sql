-- 라이브 방송이 끝나면(status → 'ended') 그 방송의 라이브 한정 쿠폰을 자동으로 비활성화한다.
-- "라이브 방송이 핵심 — 다시보기(재방송)에서는 라이브 특가를 주지 않는다"는 원칙(2026-08-27)을
-- 어느 화면(호스트/관리자)에서 방송을 종료 처리하든 놓치지 않게 DB 트리거로 강제한다.
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

create or replace function public.deactivate_live_coupon_on_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'ended' and old.status is distinct from 'ended' then
    update public.live_coupons
    set active = false
    where live_id = new.id and active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deactivate_live_coupon_on_end on public.lives;
create trigger trg_deactivate_live_coupon_on_end
  after update on public.lives
  for each row
  execute function public.deactivate_live_coupon_on_end();

notify pgrst, 'reload schema';
