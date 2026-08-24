-- 外贸客户开发模块数据库迁移脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 创建外贸客户开发表
create table if not exists "dev_customers" (
  "id" uuid default uuid_generate_v4() primary key,
  -- 基础信息
  "company_name_en" text not null,
  "company_name" text,
  "country" text,
  "city" text,
  "website" text,
  "customer_type" text,
  "main_market" text,
  "main_products" text,
  -- 开发来源
  "dev_source" text default 'google',
  "dev_source_detail" text,
  -- 联系人信息
  "contact_name" text,
  "contact_title" text,
  "whatsapp" text,
  "email" text,
  "phone" text,
  "skype" text,
  "linkedin_url" text,
  "timezone" text,
  -- 背调信息
  "company_size" text,
  "founded_year" integer,
  "main_sales_region" text,
  "current_suppliers" text,
  "purchase_frequency" text,
  "purchase_volume" text,
  "target_price_range" text,
  "credit_status" text,
  "has_brand" boolean,
  "has_distribution" boolean,
  "pain_points" text,
  "cooperation_grade" text,
  "backgound_notes" text,
  -- 产品业务记录
  "inquiry_products" text,
  "inquiry_specs" text,
  "target_price" text,
  "moq_requirement" text,
  "certification_needs" text,
  -- 跟进状态
  "dev_stage" text default 'new_not_contacted',
  "last_contact_date" date,
  "next_followup_date" date,
  "followup_count" integer default 0,
  -- 流失信息
  "loss_reason" text,
  "lost_at" date,
  -- 每日记录
  "daily_dev_date" date,
  "daily_summary" text,
  -- 其他
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

-- 2. 创建跟进记录表
create table if not exists "followup_records" (
  "id" uuid default uuid_generate_v4() primary key,
  "customer_id" uuid references dev_customers(id) on delete cascade,
  "type" text default 'email',
  "content" text,
  "followup_date" date not null,
  "next_followup_date" date,
  "created_at" timestamp with time zone default now()
);

-- 3. 创建每日开发日志表
create table if not exists "daily_dev_logs" (
  "id" uuid default uuid_generate_v4() primary key,
  "log_date" date not null,
  "new_customers_count" integer default 0,
  "emails_sent" integer default 0,
  "replies_received" integer default 0,
  "quotes_sent" integer default 0,
  "samples_sent" integer default 0,
  "orders_won" integer default 0,
  "summary" text,
  "created_at" timestamp with time zone default now()
);

-- 4. 创建索引
create index if not exists "idx_dev_customers_country" on "dev_customers" ("country");
create index if not exists "idx_dev_customers_source" on "dev_customers" ("dev_source");
create index if not exists "idx_dev_customers_stage" on "dev_customers" ("dev_stage");
create index if not exists "idx_dev_customers_grade" on "dev_customers" ("cooperation_grade");
create index if not exists "idx_dev_customers_daily_date" on "dev_customers" ("daily_dev_date");
create index if not exists "idx_followup_records_customer" on "followup_records" ("customer_id");
create index if not exists "idx_daily_dev_logs_date" on "daily_dev_logs" ("log_date");

-- 5. 启用行级安全（RLS）
alter table "dev_customers" enable row level security;
alter table "followup_records" enable row level security;
alter table "daily_dev_logs" enable row level security;

-- 6. 创建策略（允许所有操作 - 开发环境）
create policy "dev_customers_all" on "dev_customers" for all using (true) with check (true);
create policy "followup_records_all" on "followup_records" for all using (true) with check (true);
create policy "daily_dev_logs_all" on "daily_dev_logs" for all using (true) with check (true);
