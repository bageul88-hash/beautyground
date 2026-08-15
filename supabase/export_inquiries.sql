-- 해외 바이어 문의(수출 카탈로그 페이지 /export) 테이블
-- Supabase 대시보드(beautyground-main, bjqtuklkskrqzbuxdwxm) > SQL Editor 에 붙여넣어 실행하세요.

CREATE TABLE IF NOT EXISTS export_inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text NOT NULL,
  interested_categories text[],
  message text,
  status text NOT NULL DEFAULT 'new', -- 'new'(신규) | 'contacted'(연락완료) | 'closed'(종료)
  created_at timestamptz DEFAULT now()
);

-- RLS: 공개 문의폼이라 anon insert만 허용. select/update는 관리자만(is_admin()은 admin_lockdown.sql에서 생성됨).
ALTER TABLE export_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can insert export inquiries" ON export_inquiries;
CREATE POLICY "anon can insert export inquiries"
  ON export_inquiries
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "export_inquiries_admin_select" ON export_inquiries;
CREATE POLICY "export_inquiries_admin_select"
  ON export_inquiries
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "export_inquiries_admin_update" ON export_inquiries;
CREATE POLICY "export_inquiries_admin_update"
  ON export_inquiries
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
