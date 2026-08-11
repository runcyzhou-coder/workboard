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
const hasValidSupabaseConfig = isValidUrl(rawUrl) && rawKey && !rawKey.startsWith('your_');

// 未配置真实 Supabase 时使用 localStorage 本地适配器，保证应用功能可用
export const supabase = hasValidSupabaseConfig
  ? createClient(rawUrl, rawKey)
  : localClient as any;

// Database types
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
  created_at: string;
  updated_at: string;
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
  status: 'new' | 'quoted' | 'in_progress' | 'closed' | 'lost';
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

// ============== 物流管理 ==============
export type ShipmentStatus =
  | 'pending_booking'
  | 'booked'
  | 'customs_cleared'
  | 'in_transit'
  | 'arrived'
  | 'delivered';

export interface Shipment {
  id: string;
  shipment_number: string;
  inquiry_id: string | null;
  customer_id: string | null;
  status: ShipmentStatus;
  // 货代信息
  forwarder_name: string | null;
  forwarder_contact: string | null;
  // 订舱号
  so_number: string | null;
  // 柜号
  container_number: string | null;
  // 提单号
  bl_number: string | null;
  // 船公司/航空公司
  carrier: string | null;
  // 船名航次
  vessel_voyage: string | null;
  // 时间节点
  cy_cutoff: string | null;       // 截关时间
  si_cutoff: string | null;       // 截单时间
  etd: string | null;             // 预计开船
  atd: string | null;             // 实际开船
  eta: string | null;             // 预计到港
  ata: string | null;             // 实际到港
  // 港口
  port_of_loading: string | null;
  port_of_discharge: string | null;
  // 运输方式
  shipping_method: string | null;
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
