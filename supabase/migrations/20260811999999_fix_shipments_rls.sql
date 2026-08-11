-- Fix: Shipments table RLS policies are too restrictive (authenticated only)
-- Allow anon role to perform all CRUD, consistent with other tables like inquiries, after_sales

DROP POLICY IF EXISTS "Authenticated can read shipments" ON shipments;
CREATE POLICY "anon_select_shipments" ON shipments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert shipments" ON shipments;
CREATE POLICY "anon_insert_shipments" ON shipments FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update shipments" ON shipments;
CREATE POLICY "anon_update_shipments" ON shipments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete shipments" ON shipments;
CREATE POLICY "anon_delete_shipments" ON shipments FOR DELETE TO anon, authenticated USING (true);
