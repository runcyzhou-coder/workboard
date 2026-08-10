/*
# Add document center tables and company settings

1. New Tables
   - commercial_invoices: 商业发票 headers
   - ci_items: line items for commercial invoices
   - contracts: 外贸合同 headers
   - contract_items: line items for contracts
   - customs_declarations: 报关信息
   - cd_items: line items for customs declarations
   - packing_lists: 装箱单 headers
   - pl_items: line items for packing lists
   - company_settings: company info + logo for document generation

2. Security
   - Single-tenant app (no auth). RLS enabled on all tables.
   - All policies TO anon, authenticated with USING (true).
*/

-- Company settings (single row, stores logo + company info for documents)
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'KIKI TECH',
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  tax_id text,
  bank_name text,
  bank_account text,
  swift_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_company" ON company_settings;
CREATE POLICY "anon_select_company" ON company_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_company" ON company_settings;
CREATE POLICY "anon_insert_company" ON company_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_company" ON company_settings;
CREATE POLICY "anon_update_company" ON company_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_company" ON company_settings;
CREATE POLICY "anon_delete_company" ON company_settings FOR DELETE TO anon, authenticated USING (true);

-- Commercial invoices
CREATE TABLE IF NOT EXISTS commercial_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(14,2) DEFAULT 0,
  freight numeric(14,2) DEFAULT 0,
  insurance numeric(14,2) DEFAULT 0,
  other_charges numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  payment_terms text,
  delivery_terms text,
  origin_country text,
  destination_country text,
  shipping_method text,
  vessel_name text,
  bl_number text,
  port_of_loading text,
  port_of_discharge text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE commercial_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_ci" ON commercial_invoices;
CREATE POLICY "anon_select_ci" ON commercial_invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ci" ON commercial_invoices;
CREATE POLICY "anon_insert_ci" ON commercial_invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ci" ON commercial_invoices;
CREATE POLICY "anon_update_ci" ON commercial_invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ci" ON commercial_invoices;
CREATE POLICY "anon_delete_ci" ON commercial_invoices FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS ci_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id uuid NOT NULL REFERENCES commercial_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ci_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_ci_items" ON ci_items;
CREATE POLICY "anon_select_ci_items" ON ci_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ci_items" ON ci_items;
CREATE POLICY "anon_insert_ci_items" ON ci_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ci_items" ON ci_items;
CREATE POLICY "anon_update_ci_items" ON ci_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ci_items" ON ci_items;
CREATE POLICY "anon_delete_ci_items" ON ci_items FOR DELETE TO anon, authenticated USING (true);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  payment_terms text,
  delivery_terms text,
  origin_country text,
  destination_country text,
  shipping_method text,
  port_of_loading text,
  port_of_discharge text,
  delivery_date text,
  inspection_clause text,
  warranty_clause text,
  force_majeure text,
  arbitration_clause text,
  notes text,
  signed_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contracts" ON contracts;
CREATE POLICY "anon_select_contracts" ON contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contracts" ON contracts;
CREATE POLICY "anon_insert_contracts" ON contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contracts" ON contracts;
CREATE POLICY "anon_update_contracts" ON contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contracts" ON contracts;
CREATE POLICY "anon_delete_contracts" ON contracts FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contract_items" ON contract_items;
CREATE POLICY "anon_select_contract_items" ON contract_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contract_items" ON contract_items;
CREATE POLICY "anon_insert_contract_items" ON contract_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contract_items" ON contract_items;
CREATE POLICY "anon_update_contract_items" ON contract_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contract_items" ON contract_items;
CREATE POLICY "anon_delete_contract_items" ON contract_items FOR DELETE TO anon, authenticated USING (true);

-- Customs declarations
CREATE TABLE IF NOT EXISTS customs_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric(14,2) DEFAULT 0,
  trade_mode text,
  declaration_type text,
  origin_country text,
  destination_country text,
  port_of_departure text,
  port_of_destination text,
  transport_method text,
  hs_code_summary text,
  gross_weight numeric(12,3),
  net_weight numeric(12,3),
  package_count integer,
  package_type text,
  container_number text,
  customs_broker text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customs_declarations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cd" ON customs_declarations;
CREATE POLICY "anon_select_cd" ON customs_declarations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cd" ON customs_declarations;
CREATE POLICY "anon_insert_cd" ON customs_declarations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cd" ON customs_declarations;
CREATE POLICY "anon_update_cd" ON customs_declarations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cd" ON customs_declarations;
CREATE POLICY "anon_delete_cd" ON customs_declarations FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS cd_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cd_id uuid NOT NULL REFERENCES customs_declarations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  hs_code text,
  quantity integer NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'piece',
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  gross_weight numeric(12,3) DEFAULT 0,
  net_weight numeric(12,3) DEFAULT 0,
  origin_country text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cd_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cd_items" ON cd_items;
CREATE POLICY "anon_select_cd_items" ON cd_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cd_items" ON cd_items;
CREATE POLICY "anon_insert_cd_items" ON cd_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cd_items" ON cd_items;
CREATE POLICY "anon_update_cd_items" ON cd_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cd_items" ON cd_items;
CREATE POLICY "anon_delete_cd_items" ON cd_items FOR DELETE TO anon, authenticated USING (true);

-- Packing lists
CREATE TABLE IF NOT EXISTS packing_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pl_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  total_gross_weight numeric(12,3) DEFAULT 0,
  total_net_weight numeric(12,3) DEFAULT 0,
  total_volume numeric(12,3) DEFAULT 0,
  total_packages integer DEFAULT 0,
  shipping_method text,
  vessel_name text,
  bl_number text,
  container_number text,
  port_of_loading text,
  port_of_discharge text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pl" ON packing_lists;
CREATE POLICY "anon_select_pl" ON packing_lists FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pl" ON packing_lists;
CREATE POLICY "anon_insert_pl" ON packing_lists FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pl" ON packing_lists;
CREATE POLICY "anon_update_pl" ON packing_lists FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pl" ON packing_lists;
CREATE POLICY "anon_delete_pl" ON packing_lists FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS pl_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pl_id uuid NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  package_count integer DEFAULT 1,
  package_type text DEFAULT 'carton',
  gross_weight numeric(12,3) DEFAULT 0,
  net_weight numeric(12,3) DEFAULT 0,
  length numeric(10,2),
  width numeric(10,2),
  height numeric(10,2),
  volume numeric(12,3) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pl_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pl_items" ON pl_items;
CREATE POLICY "anon_select_pl_items" ON pl_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pl_items" ON pl_items;
CREATE POLICY "anon_insert_pl_items" ON pl_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pl_items" ON pl_items;
CREATE POLICY "anon_update_pl_items" ON pl_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pl_items" ON pl_items;
CREATE POLICY "anon_delete_pl_items" ON pl_items FOR DELETE TO anon, authenticated USING (true);

-- Insert default company settings
INSERT INTO company_settings (company_name, address, phone, email, website)
SELECT 'KIKI TECH', '', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ci_customer ON commercial_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ci_items_ci ON ci_items(ci_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_contract ON contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_cd_customer ON customs_declarations(customer_id);
CREATE INDEX IF NOT EXISTS idx_cd_items_cd ON cd_items(cd_id);
CREATE INDEX IF NOT EXISTS idx_pl_customer ON packing_lists(customer_id);
CREATE INDEX IF NOT EXISTS idx_pl_items_pl ON pl_items(pl_id);
