-- 为 customers 表添加背调报告字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS background_report JSONB;
