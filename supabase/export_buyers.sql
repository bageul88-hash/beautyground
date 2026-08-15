-- 해외 바이어 타겟 관리(아웃바운드 CRM, /admin/export-buyers) — 관리자 전용.
-- 브랜드사는 이 테이블에 어떤 형태로도 접근하지 않는다(바이어 정보를 브랜드에 공개하지 않기 위함).
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

CREATE TABLE IF NOT EXISTS export_buyers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  country text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  proposed_partner_ids uuid[] DEFAULT '{}', -- 제안한 브랜드(partners.id) 목록
  status text NOT NULL DEFAULT 'target', -- target(발굴)|contacted(컨택함)|responded(회신옴)|declined(거절)|won(성사)
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE export_buyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "export_buyers_admin_all" ON export_buyers;
CREATE POLICY "export_buyers_admin_all"
  ON export_buyers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
