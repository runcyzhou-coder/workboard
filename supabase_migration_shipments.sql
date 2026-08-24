-- 订单履约模块数据库迁移脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 添加订单履约所需的新字段到 shipments 表
alter table "shipments" add column if not exists "po_date" date;
alter table "shipments" add column if not exists "factory_eta" date;
alter table "shipments" add column if not exists "client_deadline" date;
alter table "shipments" add column if not exists "shipping_scenario" text default 'our_forwarder';
alter table "shipments" add column if not exists "domestic_shipped_date" date;
alter table "shipments" add column if not exists "forwarder_received_date" date;
alter table "shipments" add column if not exists "booking_date" date;
alter table "shipments" add column if not exists "container_number" text;
alter table "shipments" add column if not exists "bl_number" text;
alter table "shipments" add column if not exists "carrier" text;
alter table "shipments" add column if not exists "vessel_voyage" text;
alter table "shipments" add column if not exists "etd" date;
alter table "shipments" add column if not exists "atd" date;
alter table "shipments" add column if not exists "eta" date;
alter table "shipments" add column if not exists "ata" date;
alter table "shipments" add column if not exists "port_of_loading" text;
alter table "shipments" add column if not exists "port_of_discharge" text;
alter table "shipments" add column if not exists "forwarder_name" text;
alter table "shipments" add column if not exists "forwarder_contact" text;
alter table "shipments" add column if not exists "payment_type" text;
alter table "shipments" add column if not exists "total_amount" numeric(12,2) default 0;
alter table "shipments" add column if not exists "paid_amount" numeric(12,2) default 0;
alter table "shipments" add column if not exists "balance_amount" numeric(12,2) default 0;
alter table "shipments" add column if not exists "balance_received_date" date;
alter table "shipments" add column if not exists "bl_released_date" date;
alter table "shipments" add column if not exists "payment_status" text default 'unpaid';

-- 更新状态类型枚举以支持订单履约的新状态
-- 注意: 如果已有 status 列，需要手动添加新的枚举值
-- 先检查 status 列是否存在，如果不存在则添加
alter table "shipments" add column if not exists "status" text default 'pending_booking';

-- 确保 inquiry_id 和 customer_id 列存在
alter table "shipments" add column if not exists "inquiry_id" uuid references inquiries(id);
alter table "shipments" add column if not exists "customer_id" uuid references customers(id);
