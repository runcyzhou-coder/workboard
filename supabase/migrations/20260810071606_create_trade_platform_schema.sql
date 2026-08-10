/*
# Create Maoshang Box - Foreign Trade Platform Schema

1. Overview
   A foreign trade productivity platform with CRM, product management,
   proforma invoice generation, profit/loss calculation, quotations,
   English learning courses, and trade tools. Single-tenant app (no auth).

2. New Tables
   - customers: buyer/customer records
   - products: product catalog with cost, packaging info
   - quotations: quotation headers linked to customers
   - quotation_items: line items for each quotation
   - proforma_invoices: PI headers
   - pi_items: line items for each PI
   - profit_calculations: saved profit/loss calculation records
   - courses: English learning courses
   - lessons: individual lessons within courses
   - lesson_progress: track which lessons are completed

3. Security
   - Single-tenant app (no sign-in). RLS enabled on all tables.
   - All policies TO anon, authenticated with USING (true) since data is intentionally shared.
*/

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  country text,
  address text,
  website text,
  status text NOT NULL DEFAULT 'prospect',
  notes text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text,
  category text,
  description text,
  unit text NOT NULL DEFAULT 'piece',
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  moq integer DEFAULT 1,
  weight numeric(10,3),
  weight_unit text DEFAULT 'kg',
  length numeric(10,2),
  width numeric(10,2),
  height numeric(10,2),
  packing text,
  hs_code text,
  origin_country text,
  image_url text,
  stock integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric(14,2) DEFAULT 0,
  notes text,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quotations" ON quotations;
CREATE POLICY "anon_select_quotations" ON quotations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_quotations" ON quotations;
CREATE POLICY "anon_insert_quotations" ON quotations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_quotations" ON quotations;
CREATE POLICY "anon_update_quotations" ON quotations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_quotations" ON quotations;
CREATE POLICY "anon_delete_quotations" ON quotations FOR DELETE TO anon, authenticated USING (true);

-- Quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quotation_items" ON quotation_items;
CREATE POLICY "anon_select_quotation_items" ON quotation_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_quotation_items" ON quotation_items;
CREATE POLICY "anon_insert_quotation_items" ON quotation_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_quotation_items" ON quotation_items;
CREATE POLICY "anon_update_quotation_items" ON quotation_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_quotation_items" ON quotation_items;
CREATE POLICY "anon_delete_quotation_items" ON quotation_items FOR DELETE TO anon, authenticated USING (true);

-- Proforma invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(14,2) DEFAULT 0,
  discount numeric(14,2) DEFAULT 0,
  freight numeric(14,2) DEFAULT 0,
  insurance numeric(14,2) DEFAULT 0,
  other_charges numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  payment_terms text,
  delivery_terms text,
  origin_country text,
  destination_country text,
  shipping_method text,
  notes text,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pis" ON proforma_invoices;
CREATE POLICY "anon_select_pis" ON proforma_invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pis" ON proforma_invoices;
CREATE POLICY "anon_insert_pis" ON proforma_invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pis" ON proforma_invoices;
CREATE POLICY "anon_update_pis" ON proforma_invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pis" ON proforma_invoices;
CREATE POLICY "anon_delete_pis" ON proforma_invoices FOR DELETE TO anon, authenticated USING (true);

-- PI items table
CREATE TABLE IF NOT EXISTS pi_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pi_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pi_items" ON pi_items;
CREATE POLICY "anon_select_pi_items" ON pi_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pi_items" ON pi_items;
CREATE POLICY "anon_insert_pi_items" ON pi_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pi_items" ON pi_items;
CREATE POLICY "anon_update_pi_items" ON pi_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pi_items" ON pi_items;
CREATE POLICY "anon_delete_pi_items" ON pi_items FOR DELETE TO anon, authenticated USING (true);

-- Profit calculations table
CREATE TABLE IF NOT EXISTS profit_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(10,4) NOT NULL DEFAULT 1,
  freight_cost numeric(12,2) DEFAULT 0,
  platform_fee_pct numeric(5,2) DEFAULT 0,
  platform_fee_fixed numeric(12,2) DEFAULT 0,
  tariff_pct numeric(5,2) DEFAULT 0,
  tariff_amount numeric(12,2) DEFAULT 0,
  other_costs numeric(12,2) DEFAULT 0,
  total_cost numeric(14,2) DEFAULT 0,
  total_revenue numeric(14,2) DEFAULT 0,
  profit numeric(14,2) DEFAULT 0,
  profit_margin numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profit_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profit_calcs" ON profit_calculations;
CREATE POLICY "anon_select_profit_calcs" ON profit_calculations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profit_calcs" ON profit_calculations;
CREATE POLICY "anon_insert_profit_calcs" ON profit_calculations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profit_calcs" ON profit_calculations;
CREATE POLICY "anon_update_profit_calcs" ON profit_calculations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profit_calcs" ON profit_calculations;
CREATE POLICY "anon_delete_profit_calcs" ON profit_calculations FOR DELETE TO anon, authenticated USING (true);

-- Courses table (English learning)
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text,
  level text DEFAULT 'beginner',
  total_lessons integer DEFAULT 0,
  cover_color text DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_courses" ON courses;
CREATE POLICY "anon_select_courses" ON courses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_courses" ON courses;
CREATE POLICY "anon_insert_courses" ON courses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_courses" ON courses;
CREATE POLICY "anon_update_courses" ON courses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_courses" ON courses;
CREATE POLICY "anon_delete_courses" ON courses FOR DELETE TO anon, authenticated USING (true);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  lesson_order integer NOT NULL DEFAULT 0,
  content text,
  key_phrases text[],
  vocabulary jsonb DEFAULT '[]',
  scenario text,
  duration_minutes integer DEFAULT 15,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lessons" ON lessons;
CREATE POLICY "anon_select_lessons" ON lessons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lessons" ON lessons;
CREATE POLICY "anon_insert_lessons" ON lessons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lessons" ON lessons;
CREATE POLICY "anon_update_lessons" ON lessons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lessons" ON lessons;
CREATE POLICY "anon_delete_lessons" ON lessons FOR DELETE TO anon, authenticated USING (true);

-- Lesson progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id)
);
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_select_lesson_progress" ON lesson_progress FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_insert_lesson_progress" ON lesson_progress FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_update_lesson_progress" ON lesson_progress FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_delete_lesson_progress" ON lesson_progress FOR DELETE TO anon, authenticated USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_pis_customer ON proforma_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_pi ON pi_items(pi_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
