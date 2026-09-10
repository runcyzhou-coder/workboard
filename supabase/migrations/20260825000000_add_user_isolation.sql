-- ============================================================
-- 多用户数据隔离：给所有业务表添加 user_id 字段
-- 并修改 RLS 策略为按用户隔离
-- ============================================================

-- 1. customers 表
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE customers ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE customers SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 2. dev_customers 表
ALTER TABLE dev_customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE dev_customers ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE dev_customers SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 3. inquiries 表
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE inquiries ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE inquiries SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 4. shipments 表
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE shipments ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE shipments SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 5. proforma_invoices 表
ALTER TABLE proforma_invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE proforma_invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE proforma_invoices SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 6. products 表
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE products ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE products SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 7. quotations 表
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE quotations ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE quotations SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 8. calendar_events 表
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE calendar_events SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 9. after_sales 表
ALTER TABLE after_sales ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE after_sales ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE after_sales SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 10. profit_calculations 表
ALTER TABLE profit_calculations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profit_calculations ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE profit_calculations SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 11. company_settings 表
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE company_settings ALTER COLUMN user_id SET DEFAULT auth.uid();
UPDATE company_settings SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- 12. 文档相关表
ALTER TABLE commercial_invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE customs_declarations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 删除旧的 anon 角色策略，替换为按用户隔离的 authenticated 策略
-- ============================================================

-- customers
DROP POLICY IF EXISTS anon_select_customers ON customers;
DROP POLICY IF EXISTS anon_insert_customers ON customers;
DROP POLICY IF EXISTS anon_update_customers ON customers;
DROP POLICY IF EXISTS anon_delete_customers ON customers;
CREATE POLICY users_customers_all ON customers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- dev_customers
DROP POLICY IF EXISTS anon_select_dev_customers ON dev_customers;
DROP POLICY IF EXISTS anon_insert_dev_customers ON dev_customers;
DROP POLICY IF EXISTS anon_update_dev_customers ON dev_customers;
DROP POLICY IF EXISTS anon_delete_dev_customers ON dev_customers;
CREATE POLICY users_dev_customers_all ON dev_customers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- inquiries
DROP POLICY IF EXISTS anon_select_inquiries ON inquiries;
DROP POLICY IF EXISTS anon_insert_inquiries ON inquiries;
DROP POLICY IF EXISTS anon_update_inquiries ON inquiries;
DROP POLICY IF EXISTS anon_delete_inquiries ON inquiries;
CREATE POLICY users_inquiries_all ON inquiries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- shipments
DROP POLICY IF EXISTS anon_select_shipments ON shipments;
DROP POLICY IF EXISTS anon_insert_shipments ON shipments;
DROP POLICY IF EXISTS anon_update_shipments ON shipments;
DROP POLICY IF EXISTS anon_delete_shipments ON shipments;
CREATE POLICY users_shipments_all ON shipments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- proforma_invoices
DROP POLICY IF EXISTS anon_select_pis ON proforma_invoices;
DROP POLICY IF EXISTS anon_insert_pis ON proforma_invoices;
DROP POLICY IF EXISTS anon_update_pis ON proforma_invoices;
DROP POLICY IF EXISTS anon_delete_pis ON proforma_invoices;
CREATE POLICY users_pis_all ON proforma_invoices FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- products
DROP POLICY IF EXISTS anon_select_products ON products;
DROP POLICY IF EXISTS anon_insert_products ON products;
DROP POLICY IF EXISTS anon_update_products ON products;
DROP POLICY IF EXISTS anon_delete_products ON products;
CREATE POLICY users_products_all ON products FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- quotations
DROP POLICY IF EXISTS anon_select_quotations ON quotations;
DROP POLICY IF EXISTS anon_insert_quotations ON quotations;
DROP POLICY IF EXISTS anon_update_quotations ON quotations;
DROP POLICY IF EXISTS anon_delete_quotations ON quotations;
CREATE POLICY users_quotations_all ON quotations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- calendar_events
DROP POLICY IF EXISTS anon_select_calendar_events ON calendar_events;
DROP POLICY IF EXISTS anon_insert_calendar_events ON calendar_events;
DROP POLICY IF EXISTS anon_update_calendar_events ON calendar_events;
DROP POLICY IF EXISTS anon_delete_calendar_events ON calendar_events;
CREATE POLICY users_calendar_events_all ON calendar_events FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- after_sales
DROP POLICY IF EXISTS anon_select_after_sales ON after_sales;
DROP POLICY IF EXISTS anon_insert_after_sales ON after_sales;
DROP POLICY IF EXISTS anon_update_after_sales ON after_sales;
DROP POLICY IF EXISTS anon_delete_after_sales ON after_sales;
CREATE POLICY users_after_sales_all ON after_sales FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- profit_calculations
CREATE POLICY users_profit_calculations_all ON profit_calculations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- company_settings
CREATE POLICY users_company_settings_all ON company_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 文档表
CREATE POLICY users_commercial_invoices_all ON commercial_invoices FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY users_packing_lists_all ON packing_lists FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY users_contracts_all ON contracts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY users_customs_declarations_all ON customs_declarations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- profiles 表也按用户隔离
DROP POLICY IF EXISTS anon_all_profiles ON profiles;
CREATE POLICY users_profiles_all ON profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL) WITH CHECK (true);

-- ============================================================
-- 创建自动填充 user_id 的触发器（INSERT 时自动写入当前用户ID）
-- ============================================================
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 给所有业务表添加触发器
DROP TRIGGER IF EXISTS trg_customers_user_id ON customers;
CREATE TRIGGER trg_customers_user_id BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_dev_customers_user_id ON dev_customers;
CREATE TRIGGER trg_dev_customers_user_id BEFORE INSERT ON dev_customers
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_inquiries_user_id ON inquiries;
CREATE TRIGGER trg_inquiries_user_id BEFORE INSERT ON inquiries
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_shipments_user_id ON shipments;
CREATE TRIGGER trg_shipments_user_id BEFORE INSERT ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_proforma_invoices_user_id ON proforma_invoices;
CREATE TRIGGER trg_proforma_invoices_user_id BEFORE INSERT ON proforma_invoices
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_products_user_id ON products;
CREATE TRIGGER trg_products_user_id BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_quotations_user_id ON quotations;
CREATE TRIGGER trg_quotations_user_id BEFORE INSERT ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_calendar_events_user_id ON calendar_events;
CREATE TRIGGER trg_calendar_events_user_id BEFORE INSERT ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_after_sales_user_id ON after_sales;
CREATE TRIGGER trg_after_sales_user_id BEFORE INSERT ON after_sales
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_profit_calculations_user_id ON profit_calculations;
CREATE TRIGGER trg_profit_calculations_user_id BEFORE INSERT ON profit_calculations
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS trg_company_settings_user_id ON company_settings;
CREATE TRIGGER trg_company_settings_user_id BEFORE INSERT ON company_settings
  FOR EACH ROW EXECUTE FUNCTION set_user_id();
