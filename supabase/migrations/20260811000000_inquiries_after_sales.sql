-- 询盘管理 + 售后处理 表
-- 在 Supabase SQL Editor 中运行此脚本

-- ============== 询盘表 ==============
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  source text,
  currency text NOT NULL DEFAULT 'USD',
  expected_quantity numeric(12,2) DEFAULT 0,
  expected_amount numeric(14,2) DEFAULT 0,
  delivery_country text,
  delivery_terms text,
  payment_terms text,
  valid_until date,
  notes text,
  items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_inquiries" ON inquiries;
CREATE POLICY "anon_select_inquiries" ON inquiries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inquiries" ON inquiries;
CREATE POLICY "anon_insert_inquiries" ON inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inquiries" ON inquiries;
CREATE POLICY "anon_update_inquiries" ON inquiries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inquiries" ON inquiries;
CREATE POLICY "anon_delete_inquiries" ON inquiries FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer ON inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- ============== 售后处理表 ==============
CREATE TABLE IF NOT EXISTS after_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL,
  inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  subject text NOT NULL,
  description text,
  resolution text,
  handler text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE after_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_after_sales" ON after_sales;
CREATE POLICY "anon_select_after_sales" ON after_sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_after_sales" ON after_sales;
CREATE POLICY "anon_insert_after_sales" ON after_sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_after_sales" ON after_sales;
CREATE POLICY "anon_update_after_sales" ON after_sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_after_sales" ON after_sales;
CREATE POLICY "anon_delete_after_sales" ON after_sales FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_after_sales_inquiry ON after_sales(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_after_sales_customer ON after_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_after_sales_status ON after_sales(status);
