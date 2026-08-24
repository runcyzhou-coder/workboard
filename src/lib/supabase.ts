import { createClient } from '@supabase/supabase-js';
import { localClient } from './localClient';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isValidUrl = (url: string) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// 判断是否配置了有效的 Supabase 凭据
export const hasValidSupabaseConfig = isValidUrl(rawUrl) && rawKey && !rawKey.startsWith('your_');

// 未配置真实 Supabase 时使用 localStorage 本地适配器，保证应用功能可用
export const supabase = hasValidSupabaseConfig
  ? createClient(rawUrl, rawKey)
  : localClient as any;

// Database types
export interface BackgroundReport {
  company_type: string;
  scale: string;
  industry: string;
  main_business: string;
  key_match_products: string[];
  risk_assessment: string;
  ai_pitch_strategy: string;
  tags: string[];
  match_level: 'high' | 'medium' | 'low';
  risk_level: 'low' | 'medium' | 'high';
  decision_makers: { title: string; department: string }[];
  pitch_hook: string;
  matching_point: string;
  generated_at: string;
  // 新增字段
  match_score?: number;
  confidence?: 'high' | 'medium' | 'low';
  strengths?: string[];
  risk_factors?: string[];
  estimated_budget?: string;
  timeline?: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  website: string | null;
  status: 'prospect' | 'negotiating' | 'active' | 'inactive';
  notes: string | null;
  tags: string[] | null;
  background_report?: BackgroundReport | null;
  created_at: string;
  updated_at: string;
}

// ====== 外贸客户开发模块 ======
export type DevSource = 
  | 'google' | 'linkedin' | 'alibaba' | 'mic' | 'globalsources'
  | 'exhibition' | 'whatsapp' | 'referral' | 'email' | 'website' | 'other';
export type CustomerType = 'trader' | 'wholesaler' | 'retailer' | 'factory' | 'brand';
export type DevStage = 
  | 'new_not_contacted' | 'first_email_sent' | 'quoted' | 'sample_pending'
  | 'sample_confirmed' | 'pi_pending' | 'balance_pending' | 'won' | 'lost' | 'dormant';
export type CooperationGrade = 'A' | 'B' | 'C' | 'D';
export type FollowupType = 'email' | 'whatsapp' | 'quote' | 'sample' | 'call' | 'visit' | 'other';

export interface DevCustomer {
  id: string;
  // 基础信息
  company_name_en: string;
  company_name: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  customer_type: CustomerType | null;
  main_market: string | null;
  main_products: string | null;

  // 开发来源
  dev_source: DevSource;
  dev_source_detail: string | null;

  // 联系人信息
  contact_name: string | null;
  contact_title: string | null;
  whatsapp: string | null;
  email: string | null;
  phone: string | null;
  skype: string | null;
  linkedin_url: string | null;
  timezone: string | null;

  // 背调信息
  company_size: string | null;
  founded_year: number | null;
  main_sales_region: string | null;
  current_suppliers: string | null;
  purchase_frequency: string | null;
  purchase_volume: string | null;
  target_price_range: string | null;
  credit_status: string | null;
  has_brand: boolean | null;
  has_distribution: boolean | null;
  pain_points: string | null;
  cooperation_grade: CooperationGrade | null;
  backgound_notes: string | null;

  // 产品业务记录
  inquiry_products: string | null;
  inquiry_specs: string | null;
  target_price: string | null;
  moq_requirement: string | null;
  certification_needs: string | null;

  // 跟进状态
  dev_stage: DevStage;
  last_contact_date: string | null;
  next_followup_date: string | null;
  followup_count: number;

  // 流失信息
  loss_reason: string | null;
  lost_at: string | null;

  // 每日记录
  daily_dev_date: string | null;
  daily_summary: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupRecord {
  id: string;
  customer_id: string;
  type: FollowupType;
  content: string;
  followup_date: string;
  next_followup_date: string | null;
  created_at: string;
}

export interface DailyDevLog {
  id: string;
  log_date: string;
  new_customers_count: number;
  emails_sent: number;
  replies_received: number;
  quotes_sent: number;
  samples_sent: number;
  orders_won: number;
  summary: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  moq: number;
  weight: number | null;
  weight_unit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  packing: string | null;
  hs_code: string | null;
  origin_country: string | null;
  image_url: string | null;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  currency: string;
  total_amount: number;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface ProformaInvoice {
  id: string;
  pi_number: string;
  customer_id: string | null;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  currency: string;
  subtotal: number;
  discount: number;
  freight: number;
  insurance: number;
  other_charges: number;
  total_amount: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  origin_country: string | null;
  destination_country: string | null;
  shipping_method: string | null;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface PiItem {
  id: string;
  pi_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface ProfitCalculation {
  id: string;
  title: string;
  product_name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  currency: string;
  exchange_rate: number;
  freight_cost: number;
  platform_fee_pct: number;
  platform_fee_fixed: number;
  tariff_pct: number;
  tariff_amount: number;
  other_costs: number;
  total_cost: number;
  total_revenue: number;
  profit: number;
  profit_margin: number;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  level: string;
  total_lessons: number;
  cover_color: string;
  created_at: string;
}

export interface VocabItem {
  term: string;
  meaning: string;
  example: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  lesson_order: number;
  content: string | null;
  key_phrases: string[] | null;
  vocabulary: VocabItem[];
  scenario: string | null;
  duration_minutes: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  lesson_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  swift_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommercialInvoice {
  id: string;
  ci_number: string;
  customer_id: string | null;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  currency: string;
  subtotal: number;
  freight: number;
  insurance: number;
  other_charges: number;
  total_amount: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  origin_country: string | null;
  destination_country: string | null;
  shipping_method: string | null;
  vessel_name: string | null;
  bl_number: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CiItem {
  id: string;
  ci_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  customer_id: string | null;
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  currency: string;
  subtotal: number;
  total_amount: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  origin_country: string | null;
  destination_country: string | null;
  shipping_method: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  delivery_date: string | null;
  inspection_clause: string | null;
  warranty_clause: string | null;
  force_majeure: string | null;
  arbitration_clause: string | null;
  notes: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractItem {
  id: string;
  contract_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface CustomsDeclaration {
  id: string;
  declaration_number: string;
  customer_id: string | null;
  status: 'draft' | 'filed' | 'cleared' | 'cancelled';
  currency: string;
  total_amount: number;
  trade_mode: string | null;
  declaration_type: string | null;
  origin_country: string | null;
  destination_country: string | null;
  port_of_departure: string | null;
  port_of_destination: string | null;
  transport_method: string | null;
  hs_code_summary: string | null;
  gross_weight: number | null;
  net_weight: number | null;
  package_count: number | null;
  package_type: string | null;
  container_number: string | null;
  customs_broker: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CdItem {
  id: string;
  cd_id: string;
  product_id: string | null;
  description: string;
  hs_code: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  gross_weight: number;
  net_weight: number;
  origin_country: string | null;
  created_at: string;
}

export interface PackingList {
  id: string;
  pl_number: string;
  customer_id: string | null;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  total_gross_weight: number;
  total_net_weight: number;
  total_volume: number;
  total_packages: number;
  shipping_method: string | null;
  vessel_name: string | null;
  bl_number: string | null;
  container_number: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlItem {
  id: string;
  pl_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  package_count: number;
  package_type: string;
  gross_weight: number;
  net_weight: number;
  length: number | null;
  width: number | null;
  height: number | null;
  volume: number;
  created_at: string;
}

// ============== 询盘 ==============
export interface InquiryItem {
  product_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface Inquiry {
  id: string;
  inquiry_number: string;
  customer_id: string | null;
  subject: string;
  status: 'new' | 'quoted' | 'in_progress' | 'won' | 'lost';
  source: string | null;
  currency: string;
  expected_quantity: number;
  expected_amount: number;
  delivery_country: string | null;
  delivery_terms: string | null;
  payment_terms: string | null;
  valid_until: string | null;
  notes: string | null;
  items: InquiryItem[];
  created_at: string;
  updated_at: string;
}

// ============== 订单履约 ==============
export type ShipmentStatus =
  | 'pending_booking'
  | 'booked'
  | 'customs_cleared'
  | 'in_transit'
  | 'arrived'
  | 'delivered';

export type ShippingScenario = 'our_forwarder' | 'client_forwarder';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'balance_pending' | 'bl_released';

export interface Shipment {
  id: string;
  shipment_number: string;
  inquiry_id: string | null;
  customer_id: string | null;
  status: ShipmentStatus;

  // ======= 订单履约核心节点 =======
  // 供应商采购下单日
  po_date: string | null;
  // 供应商承诺交期（工厂预计出货时间）
  factory_eta: string | null;
  // 我方承诺交货期（给客户的最终交付日）
  client_deadline: string | null;

  // ======= 物流场景 =======
  shipping_scenario: ShippingScenario;  // 我方安排 or 客户自货代
  // 国内物流节点
  domestic_shipped_date: string | null;     // 国内发货日期
  forwarder_received_date: string | null;   // 货代收到货日期
  // 我方安排的运输节点
  so_number: string | null;
  booking_date: string | null;              // 订舱日期
  container_number: string | null;
  bl_number: string | null;
  carrier: string | null;
  vessel_voyage: string | null;
  etd: string | null;
  atd: string | null;
  eta: string | null;
  ata: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  shipping_method: string | null;

  // ======= 货代信息 =======
  forwarder_name: string | null;
  forwarder_contact: string | null;

  // ======= 款项节点 =======
  payment_type: string | null;              // 全款 or 分期
  total_amount: number;                     // 订单总金额
  paid_amount: number;                      // 已收到金额
  balance_amount: number;                   // 尾款金额
  balance_received_date: string | null;      // 尾款收到日期
  bl_released_date: string | null;          // 提单放行日期
  payment_status: PaymentStatus;           // 当前款项状态

  // ======= 备注 =======
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============== 日历事项 ==============
export type CalendarEventType = 'follow_up' | 'quote' | 'sample' | 'shipping' | 'visit' | 'other';
export type CalendarEventPriority = 'high' | 'medium' | 'low';

export interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;         // YYYY-MM-DD
  type: CalendarEventType;
  priority: CalendarEventPriority;
  done: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============== 售后处理 ==============
export interface AfterSale {
  id: string;
  ticket_number: string;
  inquiry_id: string | null;
  customer_id: string | null;
  type: 'complaint' | 'quality' | 'shipping' | 'payment' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'processing' | 'resolved' | 'closed';
  subject: string;
  description: string;
  resolution: string | null;
  handler: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
