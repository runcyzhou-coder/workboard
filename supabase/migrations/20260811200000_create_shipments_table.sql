-- 物流管理表
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_booking',

  -- 货代信息
  forwarder_name TEXT,
  forwarder_contact TEXT,

  -- 单号
  so_number TEXT,
  container_number TEXT,
  bl_number TEXT,

  -- 运输
  carrier TEXT,
  vessel_voyage TEXT,
  shipping_method TEXT,
  port_of_loading TEXT,
  port_of_discharge TEXT,

  -- 时间节点
  cy_cutoff TIMESTAMPTZ,
  si_cutoff TIMESTAMPTZ,
  etd DATE,
  atd DATE,
  eta DATE,
  ata DATE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_shipments_inquiry_id ON shipments(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);

-- updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read shipments" ON shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert shipments" ON shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update shipments" ON shipments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete shipments" ON shipments FOR DELETE TO authenticated USING (true);
