-- 日历事项表
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',        -- follow_up / quote / sample / shipping / visit / other
  priority TEXT NOT NULL DEFAULT 'medium',   -- high / medium / low
  done BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);

-- updated_at 触发器
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_calendar_events_updated_at();

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_calendar_events" ON calendar_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_calendar_events" ON calendar_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_calendar_events" ON calendar_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_calendar_events" ON calendar_events FOR DELETE TO anon, authenticated USING (true);
