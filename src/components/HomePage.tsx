import { useState, useEffect, useCallback } from 'react';
import {
  Newspaper, CheckCircle2, Circle, Plus, Trash2,
  TrendingUp, Globe2, MapPin, Clock, Calendar,
  Briefcase, Zap, AlertCircle, ExternalLink,
  Sparkles, BarChart3, ChevronRight, Target,
  ListTodo, RefreshCw, AlertTriangle, X,
  ChevronLeft, Pencil, Tag, Flag,
  RefreshCw as RefreshIcon, Loader2,
} from 'lucide-react';
import { formatDate, classNames } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { CalendarEvent, CalendarEventType, CalendarEventPriority } from '@/lib/supabase';
import type { Page } from '@/components/Sidebar';

// Buffer polyfill for browser
const Buffer = {
  from(str: string): any {
    return { toString: (encoding: string) => btoa(unescape(encodeURIComponent(str))) };
  }
} as any;

interface HomeProps {
  onNavigate: (page: Page) => void;
}

// ============ 行业新闻 ============
interface IndustryNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: '政策' | '市场' | '技术' | '项目';
  date: string;
  hotLevel: 'hot' | 'warm' | 'normal';
  url?: string;
}

// ============ 热销产品 ============
interface HotProduct {
  id: string;
  name: string;
  model: string;
  category: string;
  revenue: string;
  growth: string;
  trend: 'up' | 'down';
}

// ============ 热销国家/地区 ============
interface HotMarket {
  id: string;
  country: string;
  flag: string;
  continent: string;
  demand: string;
  inquiries30d: number;
  avgMargin: string;
  risk: 'low' | 'medium' | 'high';
}

// ============ 行业选项 ============
const industryOptions = [
  { value: '风电设备', icon: '🌀' },
  { value: '光伏储能', icon: '☀️' },
  { value: '汽配零件', icon: '🚗' },
  { value: '3C电子', icon: '📱' },
  { value: '机械设备', icon: '⚙️' },
  { value: '医疗器械', icon: '🏥' },
  { value: '家居建材', icon: '🏠' },
  { value: '纺织服装', icon: '🧵' },
];

// ============ 每日 To-do ============
interface TodoItem {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  dueTime?: string;
  category?: '客户' | '报价' | '单据' | '市场' | '其他';
  date?: string;
}

const STORAGE_KEY = 'wb_home_todos_v2';

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const today = getTodayStr();
  const yesterday = getDateStr(-1);
  const tomorrow = getDateStr(1);
  return [
    { id: 't1', text: '给沙特ACWA发送16MW风机技术参数及报价', priority: 'high', done: false, dueTime: '10:30', category: '报价', date: today },
    { id: 't2', text: '跟进巴西客户询盘的塔筒反倾销税率计算', priority: 'high', done: false, dueTime: '14:00', category: '客户', date: today },
    { id: 't3', text: '更新越南Vinh Phuc项目的形式发票（PI）', priority: 'medium', done: false, dueTime: '16:00', category: '单据', date: today },
    { id: 't4', text: '查看德国DNV最新认证要求并核对产品文档', priority: 'medium', done: true, dueTime: '', category: '市场', date: today },
    { id: 't5', text: '整理本周风机出口数据并发送周报', priority: 'low', done: false, dueTime: '周五前', category: '其他', date: today },
    { id: 't6', text: '确认沙特项目SI截单资料是否齐全', priority: 'high', done: false, dueTime: '09:00', category: '单据', date: tomorrow },
    { id: 't7', text: '安排澳洲客户验货时间视频会议', priority: 'medium', done: false, dueTime: '15:00', category: '客户', date: tomorrow },
    { id: 't8', text: '归档昨天与越南客户的沟通记录', priority: 'low', done: true, dueTime: '', category: '其他', date: yesterday },
    { id: 't9', text: '准备德国CE认证申请材料', priority: 'medium', done: false, dueTime: '11:00', category: '市场', date: yesterday },
  ];
}

// ============ 收汇与物流风控预警（AI 动态生成） ============
interface RiskAlert {
  id: string;
  docNumber: string;
  customer: string;
  amount: string;
  status: string;
  action: string;
  level: 'critical' | 'warning' | 'info';
  reason: string;
}

// 初始化本地演示数据（首次使用时自动填充）
async function ensureSeedData() {
  const seedKey = 'wb_seed_alerts_v1';
  try {
    if (localStorage.getItem(seedKey)) return;
    const piData = await supabase.from('proforma_invoices').select('id').limit(1);
    if (piData.data && piData.data.length > 0) {
      localStorage.setItem(seedKey, '1');
      return;
    }
    // 插入演示数据
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 1. 客户数据
    const customers = [
      { id: 'c-saudi', company_name: 'Saudi ACWA Power', country: 'Saudi Arabia' },
      { id: 'c-vietnam', company_name: 'Vietnam Vinh Phuc', country: 'Vietnam' },
      { id: 'c-australia', company_name: 'Australia QLD Energy', country: 'Australia' },
      { id: 'c-brazil', company_name: 'Brazil Wind Energy', country: 'Brazil' },
    ];
    for (const c of customers) {
      await supabase.from('customers').insert(c);
    }

    // 2. PI 数据
    const pis = [
      {
        id: 'pi-001', pi_number: 'PI-20260805-001', customer_id: 'c-saudi',
        status: 'confirmed', currency: 'USD', total_amount: 890000,
        payment_terms: '30% deposit T/T, 70% balance against B/L copy',
        created_at: thirtyDaysAgo.toISOString(), updated_at: now.toISOString(),
      },
      {
        id: 'pi-002', pi_number: 'PI-20260728-004', customer_id: 'c-vietnam',
        status: 'sent', currency: 'USD', total_amount: 320000,
        payment_terms: '30% deposit, 70% balance at sight',
        created_at: sixtyDaysAgo.toISOString(), updated_at: thirtyDaysAgo.toISOString(),
      },
      {
        id: 'pi-003', pi_number: 'PI-20260710-002', customer_id: 'c-australia',
        status: 'confirmed', currency: 'USD', total_amount: 1250000,
        payment_terms: 'T/T 30% deposit, 70% D/P',
        created_at: ninetyDaysAgo.toISOString(), updated_at: sixtyDaysAgo.toISOString(),
      },
      {
        id: 'pi-004', pi_number: 'PI-20260815-003', customer_id: 'c-brazil',
        status: 'sent', currency: 'USD', total_amount: 450000,
        payment_terms: 'L/C at sight',
        created_at: thirtyDaysAgo.toISOString(), updated_at: now.toISOString(),
      },
    ];
    for (const p of pis) {
      await supabase.from('proforma_invoices').insert(p);
    }

    // 3. 物流数据
    const shipments = [
      {
        id: 'sh-001', shipment_number: 'SHP-20260901-001', inquiry_id: null,
        customer_id: 'c-saudi', status: 'in_transit',
        forwarder_name: 'DHL Logistics', container_number: 'CBHU-1234567',
        bl_number: 'BL-SHP-001', vessel_voyage: 'COSCO PRIDE / 042E',
        etd: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        atd: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        eta: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ata: null,
        port_of_loading: 'Shanghai', port_of_discharge: 'Jeddah',
        shipping_method: 'sea',
        created_at: thirtyDaysAgo.toISOString(), updated_at: now.toISOString(),
      },
      {
        id: 'sh-002', shipment_number: 'SHP-20260810-002', inquiry_id: null,
        customer_id: 'c-vietnam', status: 'arrived',
        forwarder_name: 'Maersk', container_number: 'MAEU-7654321',
        bl_number: 'BL-SHP-002', vessel_voyage: 'MAERSK ESSEN / 038S',
        etd: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        atd: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        eta: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ata: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        port_of_loading: 'Ningbo', port_of_discharge: 'Ho Chi Minh',
        shipping_method: 'sea',
        created_at: sixtyDaysAgo.toISOString(), updated_at: now.toISOString(),
      },
      {
        id: 'sh-003', shipment_number: 'SHP-20260720-003', inquiry_id: null,
        customer_id: 'c-australia', status: 'delivered',
        forwarder_name: 'Expeditors', container_number: 'EXDU-9988776',
        bl_number: 'BL-SHP-003', vessel_voyage: 'TS TACOMA / 045W',
        etd: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        atd: new Date(now.getTime() - 34 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        eta: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ata: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        port_of_loading: 'Shanghai', port_of_discharge: 'Brisbane',
        shipping_method: 'sea',
        created_at: ninetyDaysAgo.toISOString(), updated_at: now.toISOString(),
      },
    ];
    for (const s of shipments) {
      await supabase.from('shipments').insert(s);
    }

    localStorage.setItem(seedKey, '1');
  } catch {}
}

// AI 风控规则引擎：根据订单+物流数据自动判断预警
function generateRiskAlerts(
  invoices: any[],
  shipments: any[],
  customers: any[],
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const today = new Date();

  // 辅助：计算两个日期之间的天数差
  function daysBetween(a: string, b: string): number {
    const dA = new Date(a);
    const dB = new Date(b);
    return Math.floor((dB.getTime() - dA.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 辅助：格式化金额
  function formatAmount(amount: number): string {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount}`;
  }

  // 辅助：获取客户名
  function getCustomerName(customerId: string | null): string {
    if (!customerId) return '未知客户';
    const c = customers.find(c => c.id === customerId);
    return c ? c.company_name : '未知客户';
  }

  for (const pi of invoices) {
    const piId = pi.id;
    const relatedShipments = shipments.filter(s => s.customer_id === pi.customer_id);
    const customerName = getCustomerName(pi.customer_id);
    const amount = formatAmount(pi.total_amount || 0);
    const paymentTerms = (pi.payment_terms || '').toLowerCase();

    // 规则1：未收齐尾款 + 已报关/已开船 → 严禁放单（严重）
    // 判断条件：付款条款包含 deposit/30% 等预付款，PI 已确认/发送，且关联物流已进入运输环节
    const hasDeposit = /deposit|预付款|30%\s*deposit|t\/t\s*30%/.test(paymentTerms);
    const hasBalance = /balance|尾款|70%|remaining/.test(paymentTerms);
    const isPiActive = pi.status === 'confirmed' || pi.status === 'sent';

    for (const shipment of relatedShipments) {
      const shipmentInTransit = ['customs_cleared', 'in_transit', 'arrived'].includes(shipment.status);
      if (hasDeposit && hasBalance && isPiActive && shipmentInTransit) {
        // 检查是否已收到尾款（简化判断：如果物流已到港但付款条款要求尾款到单付款，则视为风险）
        const balanceNotPaidYet = /balance.*(?:against|after|upon|copy|bl|提货)/.test(paymentTerms) ||
                                 /(?:against|after|upon).*(?:bl|copy|提单|提货)/.test(paymentTerms);
        if (balanceNotPaidYet) {
          alerts.push({
            id: `alert-1-${piId}`,
            docNumber: pi.pi_number,
            customer: customerName,
            amount,
            status: `物流状态：${shipment.status === 'customs_cleared' ? '已报关' : shipment.status === 'in_transit' ? '运输中' : '已到港'}`,
            action: '严禁放单',
            level: 'critical',
            reason: `付款条件「${pi.payment_terms}」中的尾款尚未收到，但货物已${shipment.status === 'arrived' ? '到港' : shipment.status === 'in_transit' ? '开船运输' : '报关'}。AI 判定：存在客户不提货/不付尾款风险。`,
          });
        }
      }
    }

    // 规则2：PI 超期未收汇（发送/确认超过 45 天仍在运输）
    if (isPiActive && pi.created_at) {
      const daysSinceCreation = daysBetween(pi.created_at, today.toISOString());
      if (daysSinceCreation > 45) {
        const hasRecentShipment = relatedShipments.some(s => {
          if (!s.eta) return false;
          return daysBetween(pi.created_at, s.eta) < 60;
        });
        if (!hasRecentShipment) {
          // 检查是否已有物流
          const anyShipment = relatedShipments.length > 0;
          if (!anyShipment && pi.status === 'sent') {
            alerts.push({
              id: `alert-2-${piId}`,
              docNumber: pi.pi_number,
              customer: customerName,
              amount,
              status: `PI 已发送 ${daysSinceCreation} 天`,
              action: '催促付款',
              level: 'warning',
              reason: `PI 自 ${pi.created_at?.split('T')[0] || '未知'} 发送至今已 ${daysSinceCreation} 天，无物流记录。AI 判定：客户可能暂缓订单或需要跟进。`,
            });
          }
        }
      }
    }
  }

  // 规则3：已到港未提货（物流已到港但未签收）
  for (const shipment of shipments) {
    if (shipment.ata && shipment.status === 'arrived') {
      const daysSinceArrival = daysBetween(shipment.ata, today.toISOString());
      if (daysSinceArrival > 3) {
        const customerName = getCustomerName(shipment.customer_id);
        alerts.push({
          id: `alert-3-${shipment.id}`,
          docNumber: shipment.shipment_number,
          customer: customerName,
          amount: '—',
          status: `到港 ${daysSinceArrival} 天未提货`,
          action: '催促提货',
          level: daysSinceArrival > 7 ? 'critical' : 'warning',
          reason: `货物于 ${shipment.ata} 抵达 ${shipment.port_of_discharge || '目的港'}，已 ${daysSinceArrival} 天未签收。AI 判定：可能滞港费产生风险。`,
        });
      }
    }

    // 规则4：物流延误（实际到港 - 预计开船 > 7天）
    if (shipment.etd && shipment.ata) {
      const transitDays = daysBetween(shipment.etd, shipment.ata);
      const expectedTransit = 7; // 假设正常海运约7天
      if (transitDays > expectedTransit + 7) {
        const customerName = getCustomerName(shipment.customer_id);
        alerts.push({
          id: `alert-4-${shipment.id}`,
          docNumber: shipment.shipment_number,
          customer: customerName,
          amount: '—',
          status: `运输耗时 ${transitDays} 天（预计 <${expectedTransit + 7} 天）`,
          action: '关注到港',
          level: 'info',
          reason: `ETD ${shipment.etd} → ATA ${shipment.ata}，运输耗时 ${transitDays} 天，超出常规 ${expectedTransit + 7} 天。AI 判定：可能存在天气/港口拥堵等异常。`,
        });
      }
    }
  }

  // 按优先级排序
  const levelOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return alerts;
}

// ============ 事项类型与颜色配置 ============
const eventTypeConfig: Record<CalendarEventType, { label: string; color: string; dot: string }> = {
  follow_up: { label: '跟进', color: 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]', dot: 'bg-blue-600' },
  quote:     { label: '报价', color: 'bg-[#F3EFF7] text-[#5B4A78] border border-[#D9CEE6]', dot: 'bg-violet-600' },
  sample:    { label: '寄样', color: 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]', dot: 'bg-emerald-600' },
  shipping:  { label: '发货', color: 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]', dot: 'bg-teal-600' },
  visit:     { label: '拜访', color: 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]', dot: 'bg-emerald-600' },
  other:     { label: '其他', color: 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]', dot: 'bg-[#78716C]' },
};

const priorityConfig: Record<CalendarEventPriority, { label: string; color: string; bar: string }> = {
  high:   { label: '高', color: 'text-[#9B2C2C]', bar: 'border-l-[#9B2C2C]' },
  medium: { label: '中', color: 'text-[#5F8A4D]', bar: 'border-l-[#A8C28E]' },
  low:    { label: '低', color: 'text-[#78716C]', bar: 'border-l-[#524E48]/40' },
};

// ============ 事项编辑弹窗 ============
function EventModal({
  mode,
  event,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: {
  mode: 'add' | 'edit';
  event?: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (data: Partial<CalendarEvent>) => void;
  onDelete?: (id: string) => void;
}) {
  const [title, setTitle] = useState(event?.title || '');
  const [eventDate, setEventDate] = useState(event?.event_date || defaultDate);
  const [type, setType] = useState<CalendarEventType>(event?.type || 'follow_up');
  const [priority, setPriority] = useState<CalendarEventPriority>(event?.priority || 'medium');
  const [done, setDone] = useState(event?.done || false);
  const [notes, setNotes] = useState(event?.notes || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: event?.id, title: title.trim(), event_date: eventDate, type, priority, done, notes: notes.trim() || null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-[#3D3A36]/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-xl shadow-[0_4px_16px_rgba(45,42,38,0.06)] w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-[#524E48]/25">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7BA369]" strokeWidth={1.75} />
            <h2 className="text-lg font-serif font-bold text-[#2D2A26]">
              {mode === 'add' ? '添加重要事项' : '修改事项'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#78716C] hover:text-[#2D2A26]"><X className="w-5 h-5" strokeWidth={1.75} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 事项标题 */}
          <div>
            <label className="text-xs font-medium text-[#78716C] mb-1 block">事项标题</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim()) handleSave(); }}
              placeholder="如：给沙特客户发送报价..."
              autoFocus
              className="w-full px-3 py-2.5 bg-[#F7F3EB] border border-[#524E48]/25 rounded-lg text-sm text-[#2D2A26] placeholder-[#78716C]/60 focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369]"
            />
          </div>

          {/* 日期 */}
          <div>
            <label className="text-xs font-medium text-[#78716C] mb-1 block">日期</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F7F3EB] border border-[#524E48]/25 rounded-lg text-sm text-[#2D2A26] focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369]"
            />
          </div>

          {/* 类型标签 */}
          <div>
            <label className="text-xs font-medium text-[#78716C] mb-1.5 block flex items-center gap-1">
              <Tag className="w-3 h-3" strokeWidth={1.75} /> 类型标签
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(eventTypeConfig) as CalendarEventType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    type === t
                      ? `${eventTypeConfig[t].color} ring-1 ring-offset-0 ring-[#3B5A7A]/30`
                      : 'bg-[#F7F3EB] text-[#78716C] border border-dashed border-[#524E48]/20 hover:bg-[#F2EBDC]'
                  )}
                >
                  {eventTypeConfig[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="text-xs font-medium text-[#78716C] mb-1.5 block flex items-center gap-1">
              <Flag className="w-3 h-3" strokeWidth={1.75} /> 优先级
            </label>
            <div className="flex gap-1.5">
              {(Object.keys(priorityConfig) as CalendarEventPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
                    priority === p
                      ? p === 'high' ? 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6] ring-1 ring-[#9B2C2C]/30'
                        : p === 'medium' ? 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8] ring-1 ring-[#A8C28E]/30'
                        : 'bg-[#F7F3EB] text-[#78716C] border border-[#E0D5C1] ring-1 ring-[#524E48]/20'
                      : 'bg-[#F7F3EB] text-[#78716C] border border-dashed border-[#524E48]/20 hover:bg-[#F2EBDC]'
                  )}
                >
                  {priorityConfig[p].label}优先
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="text-xs font-medium text-[#78716C] mb-1 block">备注（可选）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="补充说明..."
              rows={2}
              className="w-full px-3 py-2 bg-[#F7F3EB] border border-[#524E48]/25 rounded-lg text-sm text-[#2D2A26] placeholder-[#78716C]/60 focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369] resize-none"
            />
          </div>

          {/* 已完成（编辑模式） */}
          {mode === 'edit' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => setDone(!done)}
                className={classNames(
                  'w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all',
                  done ? 'bg-[#3D3A36] text-[#FAF7F2] border-[#3D3A36]' : 'border-[#3D3A36] hover:border-[#7BA369]'
                )}
              >
                {done && <span className="text-[10px] leading-none">✓</span>}
              </button>
              <span className="text-sm text-[#78716C]">标记为已完成</span>
            </label>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dashed border-[#524E48]/25">
          {mode === 'edit' && onDelete && event ? (
            <button
              onClick={() => onDelete(event.id)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-[#9B2C2C] hover:bg-[#FDF2F2] rounded-lg font-medium"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} /> 删除
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#78716C] hover:bg-[#F2EBDC] rounded-lg">取消</button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7BA369] text-[#FAF7F2] rounded-lg text-sm font-medium hover:bg-[#5F8A4D] shadow-[2px_2px_0px_0px_#2B2927] hover:shadow-[3px_3px_0px_0px_#2B2927] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.75} /> : <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />}
              {mode === 'add' ? '添加' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 月历组件（增强版） ============
function MiniCalendar({
  selectedDate,
  onDateSelect,
  doneCount,
  totalTodos,
}: {
  selectedDate: string;
  onDateSelect: (dateStr: string) => void;
  doneCount: number;
  totalTodos: number;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [modalDate, setModalDate] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const todayStr = getTodayStr();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  // 计算日历网格
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 周一开始

  // 构建网格单元格（含上月末尾和下月开头的补位格）
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  type Cell = { day: number; dateStr: string; isCurrentMonth: boolean };
  const cells: Cell[] = [];
  // 前置（上月末尾）
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false });
  }
  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: true });
  }
  // 后置（下月开头，补满 42 格 = 6 行）
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false });
  }

  // localStorage 回退存储
  const LOCAL_EVENTS_KEY = 'wb_calendar_events_local';

  function loadLocalEvents(monthStart: string, monthEnd: string): CalendarEvent[] {
    try {
      const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
      if (!raw) return [];
      const all: CalendarEvent[] = JSON.parse(raw);
      return all.filter(e => e.event_date >= monthStart && e.event_date <= monthEnd)
                .sort((a, b) => a.event_date < b.event_date ? -1 : 1);
    } catch {
      return [];
    }
  }

  function saveLocalEvent(event: CalendarEvent) {
    try {
      const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
      const all: CalendarEvent[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(e => e.id === event.id);
      if (idx >= 0) all[idx] = event;
      else all.push(event);
      localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(all));
    } catch {}
  }

  function deleteLocalEvent(id: string) {
    try {
      const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
      if (!raw) return;
      const all: CalendarEvent[] = JSON.parse(raw);
      const remaining = all.filter(e => e.id !== id);
      localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(remaining));
    } catch {}
  }

  // 加载事项
  const loadEvents = useCallback(async () => {
    setLoading(true);
    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    let loaded = false;
    try {
      const res = await supabase
        .from('calendar_events')
        .select('*')
        .gte('event_date', monthStart)
        .lte('event_date', monthEnd)
        .order('event_date', { ascending: true });
      if (!res.error) {
        setEvents(res.data || []);
        loaded = true;
      }
    } catch {}
    if (!loaded) {
      // Supabase 失败或表不存在，回退 localStorage
      setEvents(loadLocalEvents(monthStart, monthEnd));
    }
    setLoading(false);
  }, [viewYear, viewMonth, daysInMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 事项按日期分组
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach(e => {
    const arr = eventsByDate.get(e.event_date) || [];
    arr.push(e);
    eventsByDate.set(e.event_date, arr);
  });

  // 导航
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onDateSelect(todayStr);
  }

  // 点击日期格子 → 联动任务 + 打开新增弹窗
  function handleClickDay(dateStr: string, isCurrentMonth: boolean) {
    onDateSelect(dateStr);
    // 联动：切换视图月份到点击的非当月日期
    if (!isCurrentMonth) {
      const [y, m] = dateStr.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }

  // 新增事项
  function openAddModal(dateStr: string) {
    setModalDate(dateStr);
    setEditingEvent(null);
    setModalMode('add');
  }

  // 编辑事项
  function openEditModal(evt: CalendarEvent) {
    setEditingEvent(evt);
    setModalMode('edit');
  }

  // 保存事项（新增/更新）
  async function handleSave(data: Partial<CalendarEvent>) {
    const now = new Date().toISOString();
    let saved = false;
    try {
      if (data.id) {
        const res = await supabase.from('calendar_events').update({
          title: data.title,
          event_date: data.event_date,
          type: data.type,
          priority: data.priority,
          done: data.done,
          notes: data.notes,
          updated_at: now,
        }).eq('id', data.id).select('*');
        if (!res.error) saved = true;
      } else {
        const newId = crypto.randomUUID ? crypto.randomUUID() : 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        const res = await supabase.from('calendar_events').insert({
          id: newId,
          title: data.title,
          event_date: data.event_date,
          type: data.type,
          priority: data.priority,
          done: data.done || false,
          notes: data.notes,
          created_at: now,
          updated_at: now,
        }).select('*');
        if (!res.error) saved = true;
      }
    } catch {}

    // Supabase 失败或不可用，回退 localStorage
    if (!saved) {
      const evtId = data.id || (crypto.randomUUID ? crypto.randomUUID() : 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));
      saveLocalEvent({
        id: evtId,
        title: data.title!,
        event_date: data.event_date!,
        type: data.type!,
        priority: data.priority!,
        done: data.done || false,
        notes: data.notes || null,
        created_at: now,
        updated_at: now,
      });
    }
    setModalMode(null);
    setEditingEvent(null);
    await loadEvents();
  }

  // 删除事项
  async function handleDelete(id: string) {
    let deleted = false;
    try {
      const res = await supabase.from('calendar_events').delete().eq('id', id);
      if (!res.error) deleted = true;
    } catch {}
    if (!deleted) {
      deleteLocalEvent(id);
    }
    setModalMode(null);
    setEditingEvent(null);
    await loadEvents();
  }

  return (
    <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-[0_2px_8px_rgba(45,42,38,0.04)] p-5 transition-all duration-200 hover:border-[#524E48]/40 hover:shadow-[0_4px_16px_rgba(45,42,38,0.06)]">
      {/* Header：年月选择器 + 导航 */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={viewYear}
            onChange={e => setViewYear(Number(e.target.value))}
            className="px-2 py-1 text-sm font-semibold text-[#2D2A26] bg-[#F7F3EB] border border-[#524E48]/25 rounded-lg focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369] cursor-pointer"
          >
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={viewMonth}
            onChange={e => setViewMonth(Number(e.target.value))}
            className="px-2 py-1 text-sm font-semibold text-[#2D2A26] bg-[#F7F3EB] border border-[#524E48]/25 rounded-lg focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369] cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => i).map(m => (
              <option key={m} value={m}>{m + 1}月</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 text-[#78716C] hover:text-[#2D2A26] hover:bg-[#F2EBDC] rounded-lg transition-colors" title="上一月">
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button onClick={goToday} className="px-2.5 py-1 text-xs font-medium text-[#7BA369] hover:bg-[#FDF2F2] rounded-lg transition-colors" title="返回今天">
            今天
          </button>
          <button onClick={nextMonth} className="p-1.5 text-[#78716C] hover:text-[#2D2A26] hover:bg-[#F2EBDC] rounded-lg transition-colors" title="下一月">
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-[#78716C] py-1">{d}</div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const cellEvents = eventsByDate.get(cell.dateStr) || [];
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDate;
          const visibleEvents = cellEvents.slice(0, 3);
          const hiddenCount = cellEvents.length - visibleEvents.length;
          return (
            <div
              key={i}
              onClick={() => handleClickDay(cell.dateStr, cell.isCurrentMonth)}
              className={classNames(
                'min-h-[56px] p-1 rounded-lg border cursor-pointer transition-all group relative',
                isSelected
                  ? 'border-[#7BA369] bg-[#7BA369]/10 ring-1 ring-[#7BA369]/30'
                  : isToday
                    ? 'border-[#7BA369] bg-[#FDF2F2]'
                    : 'border-transparent hover:border-dashed hover:border-[#524E48]/30 hover:bg-[#F2EBDC]',
                !cell.isCurrentMonth && 'opacity-40'
              )}
            >
              {/* 日期数字 + 新增按钮 */}
              <div className="flex items-center justify-between mb-0.5">
                <span className={classNames(
                  'text-xs font-medium leading-none',
                  isSelected
                    ? 'text-[#2D2A26] font-bold'
                    : isToday
                      ? 'text-[#2D2A26] font-bold'
                      : 'text-[#5C5246]'
                )}>
                  {cell.day}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); openAddModal(cell.dateStr); }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-[#78716C] hover:text-[#7BA369] hover:bg-[#FDF2F2] rounded transition-all"
                  title="添加事项"
                >
                  <Plus className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </div>
              {/* 事项标签 */}
              <div className="space-y-0.5">
                {visibleEvents.map(evt => {
                  const tc = eventTypeConfig[evt.type];
                  const pc = priorityConfig[evt.priority];
                  return (
                    <div
                      key={evt.id}
                      onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                      className={classNames(
                        'text-[10px] px-1 py-0.5 rounded truncate border-l-2 cursor-pointer hover:opacity-80 transition-opacity',
                        tc.color, pc.bar,
                        evt.done && 'line-through opacity-50'
                      )}
                      title={evt.title}
                    >
                      {evt.title}
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <div className="text-[9px] text-[#78716C] px-1 font-medium">
                    +{hiddenCount} 项
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部统计 */}
      <div className="mt-3 pt-3 border-t border-dashed border-[#524E48]/25">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#78716C]">
            {selectedDate === todayStr ? '今日任务' : `${selectedDate} 任务`}
          </span>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="w-3 h-3 text-[#78716C] animate-spin" strokeWidth={1.75} />}
            <span className="font-semibold text-[#7BA369]">{doneCount}/{totalTodos}</span>
          </div>
        </div>
        {/* 图例 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {(Object.keys(eventTypeConfig) as CalendarEventType[]).slice(0, 5).map(t => (
            <span key={t} className="flex items-center gap-1 text-[9px] text-[#78716C]">
              <span className={classNames('w-1.5 h-1.5 rounded-full', eventTypeConfig[t].dot)} />
              {eventTypeConfig[t].label}
            </span>
          ))}
        </div>
      </div>

      {/* 事项编辑弹窗 */}
      {modalMode && (
        <EventModal
          mode={modalMode}
          event={editingEvent}
          defaultDate={modalDate || selectedDate}
          onClose={() => { setModalMode(null); setEditingEvent(null); }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ============ AI 写信 Modal ============
function AILetterModal({ news, onClose }: { news: IndustryNews; onClose: () => void }) {
  const [letter, setLetter] = useState('');
  const [generating, setGenerating] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function generateLetter() {
      setGenerating(true);
      setError(false);
      try {
        const newsData = {
          title: news.title,
          summary: news.summary,
          source: news.source,
          category: news.category,
        };
        const newsBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(newsData))));
        const res = await fetch(`/api/dashboard?action=ai-letter&news=${encodeURIComponent(newsBase64)}`);
        const json = await res.json();
        if (json.letter) {
          setLetter(json.letter);
        } else {
          setError(true);
          setLetter(getFallbackLetter(news));
        }
      } catch {
        setError(true);
        setLetter(getFallbackLetter(news));
      }
      setGenerating(false);
    }
    generateLetter();
  }, [news]);

  function getFallbackLetter(n: IndustryNews): string {
    return `Subject: Opportunity for Cooperation — ${n.title}

Dear Valued Partner,

I hope this message finds you well.

I'm Runcy from KIKI TECH, a leading manufacturer of industrial equipment. We noticed the recent development regarding "${n.title}" (reported by ${n.source}), and we believe this may create interesting opportunities for collaboration.

At KIKI TECH, we specialize in high-quality industrial equipment with competitive pricing and reliable after-sales service. Our team is ready to provide detailed technical specifications and customized quotations upon your request.

Would you be open to discussing how KIKI TECH can support your projects?

Looking forward to your reply.

Best regards,
Runcy
KIKI TECH
Email: sales@kiki-tech.com
www.kiki-tech.com`;
  }

  function copyLetter() {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-[#3D3A36]/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-xl shadow-paper-md w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-[#524E48]/25">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#7BA369]" strokeWidth={1.75} />
            <h2 className="text-lg font-serif font-bold text-[#2D2A26]">AI 提取商机写信</h2>
            {!generating && !error && <span className="text-[10px] bg-[#EDF3E4] text-[#5F8A4D] px-2 py-0.5 rounded-full">AI生成</span>}
            {error && <span className="text-[10px] bg-[#F2EBDC] text-[#5C5246] px-2 py-0.5 rounded-full">模板</span>}
          </div>
          <button onClick={onClose} className="text-[#78716C] hover:bg-[#F2EBDC] rounded-lg"><X className="w-5 h-5" strokeWidth={1.75} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-[#EDF3E4] border border-[#C9D9B8] text-[#5F8A4D] rounded-lg p-3 mb-4 text-sm">
            📰 基于新闻：{news.title}
          </div>
          {generating ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#78716C]">
              <Loader2 className="w-8 h-8 text-[#7BA369] animate-spin mb-3" strokeWidth={1.75} />
              <p className="text-sm">AI 正在为您撰写开发信...</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-[#3D3A36] leading-relaxed font-sans">{letter}</pre>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dashed border-[#524E48]/25">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#78716C] hover:bg-[#F2EBDC] rounded-lg">关闭</button>
          <button onClick={copyLetter} disabled={generating} className="flex items-center gap-1.5 px-4 py-2 bg-[#7BA369] text-[#FAF7F2] rounded-lg text-sm font-medium hover:bg-[#5F8A4D] shadow-[2px_2px_0px_0px_#2B2927] hover:shadow-[3px_3px_0px_0px_#2B2927] disabled:opacity-50">
            {copied ? <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} /> : <Sparkles className="w-4 h-4" strokeWidth={1.75} />}
            {copied ? '已复制' : '复制全文'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 行业选择 Modal ============
function IndustrySelectModal({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (industry: string) => void;
  onClose: () => void;
}) {
  const [customIndustry, setCustomIndustry] = useState('');
  const hasIndustry = !!current;

  function handleConfirm() {
    const trimmed = customIndustry.trim();
    if (trimmed) onSelect(trimmed);
  }

  return (
    <div className="fixed inset-0 bg-[#3D3A36]/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-paper-md w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[#FFFDF9] px-6 py-5 border-b border-dashed border-[#524E48]/25">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#2D2A26]">
                {hasIndustry ? '切换主营行业' : '欢迎！请选择您的主营行业'}
              </h2>
              <p className="text-sm text-[#78716C] mt-1">
                {hasIndustry ? '切换后首页数据将自动刷新' : 'AI 将根据您的行业定制首页内容'}
              </p>
            </div>
            {hasIndustry && (
              <button onClick={onClose} className="text-[#78716C] hover:text-[#2D2A26]">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {industryOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={classNames(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                  current === opt.value
                    ? 'border-[#7BA369] bg-[#FDF2F2] ring-1 ring-[#7BA369]/30 text-[#2D2A26]'
                    : 'border-[#E8E2D5] bg-[#F7F3EB] hover:border-[#7BA369] hover:bg-[#F2EBDC] text-[#5C5246]'
                )}
              >
                <span className="text-2xl">{opt.icon}</span>
                <div>
                  <p className="text-sm font-semibold">
                    {opt.value}
                  </p>
                  {current === opt.value && (
                    <p className="text-[10px] text-[#7BA369] font-handwriting">当前选择</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* 自定义输入 */}
          <div className="border-t border-dashed border-[#524E48]/25 pt-4">
            <label className="text-xs font-medium text-[#78716C] mb-2 block">
              没有找到？输入您的行业名称：
            </label>
            <div className="flex gap-2">
              <input
                value={customIndustry}
                onChange={e => setCustomIndustry(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customIndustry.trim()) handleConfirm(); }}
                placeholder="如：五金工具、食品机械..."
                className="flex-1 px-3 py-2.5 bg-[#F7F3EB] border border-[#524E48]/25 rounded-lg text-sm text-[#2D2A26] placeholder-[#78716C]/60 focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369]"
              />
              <button
                onClick={handleConfirm}
                disabled={!customIndustry.trim()}
                className="px-4 py-2.5 bg-[#7BA369] text-[#FAF7F2] rounded-lg text-sm font-medium hover:bg-[#5F8A4D] shadow-[2px_2px_0px_0px_#2B2927] hover:shadow-[3px_3px_0px_0px_#2B2927] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                确认
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        {!hasIndustry && (
          <div className="px-6 py-3 bg-[#F7F3EB] border-t border-[#E8E2D5] text-center text-xs text-[#78716C] font-handwriting">
            选择行业后将自动保存，随时可切换
          </div>
        )}
      </div>
    </div>
  );
}

export function HomePage({ onNavigate }: HomeProps) {
  // To-do state
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos());
  const [todoInput, setTodoInput] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'pending' | 'done'>('all');
  const [aiLetterNews, setAiLetterNews] = useState<IndustryNews | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  // 销售励志词条（动态）
  const [greeting, setGreeting] = useState<string>('');
  const [greetingLoading, setGreetingLoading] = useState(true);

  // AI写信状态
  const [aiLetterGenerating, setAiLetterGenerating] = useState(false);

  // 风控预警状态
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // 仪表盘统计数据
  const [stats, setStats] = useState({ customerCount: 0, newInquiryCount: 0, pendingPayment: 0 });

  // 行业动态数据状态
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [industryData, setIndustryData] = useState<{ news: IndustryNews[]; hot_markets: HotMarket[]; hot_products: HotProduct[] } | null>(null);
  const [industryLoading, setIndustryLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // 获取 AI 每日励志词条
  useEffect(() => {
    async function loadGreeting() {
      setGreetingLoading(true);
      try {
        const res = await fetch('/api/dashboard?action=greeting&t=' + Date.now());
        const json = await res.json();
        if (json.greeting) {
          setGreeting(json.greeting);
        }
      } catch {
        // 降级：本地随机
        const localGreetings = [
          '只有个人进步，才是解决所有问题的最优解。',
          '真正的成长，始于对自己的不满足。',
          '认知的边界，就是人生的天花板。',
          '向内求，向外修。',
          '你的时间有限，不要为别人而活。',
          '种一棵树最好的时间是十年前，其次是现在。',
          '不要等风来，要做自己的风。',
          '人生没有白走的路，每一步都算数。',
          '格局决定结局，态度决定高度。',
          '自律即自由。',
          '所有的优秀，都源于不将就。',
          '真正的高手，都是长期主义者。',
          '慢慢来，比较快。',
          '日拱一卒，功不唐捐。',
        ];
        setGreeting(localGreetings[Math.floor(Math.random() * localGreetings.length)]);
      }
      setGreetingLoading(false);
    }
    loadGreeting();
  }, []);

  // 初始化演示数据 + 获取风控预警（升级为AI分析）
  useEffect(() => {
    let cancelled = false;
    async function loadAlerts() {
      setAlertsLoading(true);
      try {
        await ensureSeedData();
        const [piRes, shipmentRes, customerRes, inquiryRes, devCustomerRes] = await Promise.all([
          supabase.from('proforma_invoices').select('*'),
          supabase.from('shipments').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('inquiries').select('*'),
          supabase.from('dev_customers').select('*'),
        ]);
        if (cancelled) return;
        const invoices = piRes.data || [];
        const shipments = shipmentRes.data || [];
        const customers = customerRes.data || [];
        const inquiryList = inquiryRes.data || [];
        // 合并客户管理 + 客户开发两个表的客户数量
        let devCustomers = devCustomerRes.data || [];
        // 降级：如果Supabase查询失败，从localStorage读取dev_customers
        if (devCustomerRes.error || devCustomers.length === 0) {
          try {
            const localDev = localStorage.getItem('wb_dev_customers');
            if (localDev) devCustomers = JSON.parse(localDev);
          } catch {}
        }
        const allCustomers = [...customers, ...devCustomers];

        // 尝试AI风控分析
        try {
          const aiRes = await fetch('/api/dashboard?action=risk-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoices, shipments, customers: allCustomers }),
          });
          if (aiRes.ok) {
            const json = await aiRes.json();
            if (json.alerts && Array.isArray(json.alerts)) {
              setRiskAlerts(json.alerts);
            } else {
              setRiskAlerts(generateRiskAlerts(invoices, shipments, allCustomers));
            }
          } else {
            setRiskAlerts(generateRiskAlerts(invoices, shipments, allCustomers));
          }
        } catch {
          // 降级到本地规则
          setRiskAlerts(generateRiskAlerts(invoices, shipments, allCustomers));
        }

        // 统计仪表盘数据（询盘数量从 inquiries 表获取，与询盘管理同步）
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const newInquiryCount = inquiryList.filter((inq: any) => {
          const d = inq.created_at ? new Date(inq.created_at) : null;
          return d && d >= monthStart;
        }).length;
        const pendingPayment = invoices
          .filter(pi => {
            const terms = (pi.payment_terms || '').toLowerCase();
            return terms.includes('balance') || terms.includes('70%');
          })
          .reduce((sum, pi) => {
            const total = Number(pi.total_amount) || 0;
            return sum + total * 0.7;
          }, 0);
        setStats({
          customerCount: allCustomers.length,
          newInquiryCount,
          pendingPayment: Math.round(pendingPayment),
        });
      } catch {}
      if (!cancelled) setAlertsLoading(false);
    }
    loadAlerts();
    return () => { cancelled = true; };
  }, []);

  // ===== 行业偏好加载与数据获取（升级为AI动态数据）=====
  const loadIndustryData = useCallback(async (industry: string) => {
    if (!industry) return;
    setIndustryLoading(true);
    try {
      const res = await fetch(`/api/dashboard?action=industry-news&industry=${encodeURIComponent(industry)}&t=${Date.now()}`);
      const json = await res.json();
      if (json.data) {
        setIndustryData({
          news: json.data.news || [],
          hot_markets: json.data.hot_markets || [],
          hot_products: json.data.hot_products || [],
        });
      } else {
        setIndustryData(null);
      }
    } catch {
      setIndustryData(null);
    }
    setIndustryLoading(false);
  }, []);

  // 页面加载时读取用户行业偏好
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await supabase.from('profiles').select('*').limit(1);
        if (cancelled) return;
        const profile = res.data?.[0];
        if (profile?.selected_industry) {
          setSelectedIndustry(profile.selected_industry);
          loadIndustryData(profile.selected_industry);
        }
        // 未设置行业时不主动弹窗，用户点击「选择行业」按钮时再弹出
      } catch {
        // profiles 表不存在，回退到 localStorage
        const local = localStorage.getItem('wb_selected_industry');
        if (local) {
          setSelectedIndustry(local);
          loadIndustryData(local);
        }
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [loadIndustryData]);

  // 选择/切换行业
  async function handleSelectIndustry(industry: string) {
    setSelectedIndustry(industry);
    setShowIndustryModal(false);
    // 保存到 Supabase + localStorage
    try {
      const checkRes = await supabase.from('profiles').select('id').limit(1);
      if (checkRes.data && checkRes.data.length > 0) {
        await supabase.from('profiles').update({ selected_industry: industry, updated_at: new Date().toISOString() }).eq('id', checkRes.data[0].id);
      } else {
        await supabase.from('profiles').insert({ selected_industry: industry });
      }
    } catch {}
    localStorage.setItem('wb_selected_industry', industry);
    loadIndustryData(industry);
  }

  function addTodo() {
    const text = todoInput.trim();
    if (!text) return;
    const newItem: TodoItem = {
      id: 'todo-' + Date.now(),
      text,
      priority: 'medium',
      done: false,
      category: '其他',
      date: selectedDate,
    };
    setTodos([newItem, ...todos]);
    setTodoInput('');
  }

  function toggleTodo(id: string) {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function removeTodo(id: string) {
    setTodos(todos.filter(t => t.id !== id));
  }

  function cyclePriority(id: string) {
    const order: TodoItem['priority'][] = ['high', 'medium', 'low'];
    setTodos(todos.map(t => t.id === id ? { ...t, priority: order[(order.indexOf(t.priority) + 1) % order.length] } : t));
  }

  // 按选中日期筛选任务
  const dateFilteredTodos = todos.filter(t => (t.date || getTodayStr()) === selectedDate);

  const filteredTodos = dateFilteredTodos.filter(t => {
    if (filterPriority === 'pending') return !t.done;
    if (filterPriority === 'done') return t.done;
    return true;
  });

  const doneCount = dateFilteredTodos.filter(t => t.done).length;
  const pendingCount = dateFilteredTodos.length - doneCount;
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // AI 快捷工具栏配置
  const quickTools: { icon: string; label: string; page: Page; kbd: string }[] = [
    { icon: '✉️', label: 'AI 写信', page: 'tools', kbd: '⌘1' },
    { icon: '📄', label: '新建 PI/报价单', page: 'document-center', kbd: '⌘2' },
    { icon: '🔍', label: '客户背调', page: 'customers', kbd: '⌘3' },
    { icon: '🚚', label: '物流/风控查询', page: 'shipments', kbd: '⌘4' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. 顶部 Banner（问候 + 业务指标卡片） */}
      <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-paper p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#A8C28E]/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#7BA369]/[0.05] blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-serif font-bold text-[#2D2A26]">
                {greetingLoading ? '加载中...' : greeting || '向内求，向外修。'}
              </h1>
              <button
                onClick={() => setShowIndustryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2EBDC] border border-[#E0D5C1] text-[#5C5246] hover:border-[#7BA369] hover:text-[#2D2A26] transition-all text-sm font-semibold"
                title="点击切换行业"
              >
                {selectedIndustry ? (
                  <>
                    <span className="opacity-80 text-xs">当前行业</span>
                    <span>{selectedIndustry}</span>
                    <RefreshIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5" strokeWidth={1.75} />
                    选择行业
                    <RefreshIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </>
                )}
              </button>
            </div>
            <p className="text-[#78716C] text-sm">{dateStr} · 今天也是开拓全球市场的一天 💪</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-[#F7F3EB] border border-[#E8E2D5] rounded-xl px-4 py-3 min-w-[130px]">
              <p className="text-[10px] text-[#78716C] font-medium">客户总数</p>
              <p className="text-2xl font-serif font-bold text-[#2D2A26]"><span className="underline decoration-wavy decoration-[#7BA369]/60 decoration-2 underline-offset-4">{stats.customerCount}</span> <span className="text-sm font-normal text-[#78716C]">个</span></p>
            </div>
            <div className="bg-[#F7F3EB] border border-[#E8E2D5] rounded-xl px-4 py-3 min-w-[130px]">
              <p className="text-[10px] text-[#78716C] font-medium">本月新增询盘</p>
              <p className="text-2xl font-serif font-bold text-[#2D2A26]"><span className="underline decoration-wavy decoration-[#7BA369]/60 decoration-2 underline-offset-4">{stats.newInquiryCount}</span> <span className="text-sm font-normal text-[#78716C]">个</span></p>
            </div>
            <div className="bg-[#F7F3EB] border border-[#E8E2D5] rounded-xl px-4 py-3 min-w-[130px]">
              <p className="text-[10px] text-[#78716C] font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-[#9B2C2C]" strokeWidth={1.75} />待收尾款预警
              </p>
              <p className="text-2xl font-serif font-bold text-[#9B2C2C]"><span className="underline decoration-wavy decoration-[#9B2C2C]/60 decoration-2 underline-offset-4">${(stats.pendingPayment / 10000).toFixed(1)}M</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI 快捷工具栏 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickTools.map((btn) => (
          <button
            key={btn.label}
            onClick={() => onNavigate(btn.page)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#E8E2D5] bg-[#FFFDF9] shadow-paper transition-all duration-200 hover:border-[#524E48]/40 hover:shadow-paper-md hover:-translate-y-0.5"
          >
            <span className="text-2xl shrink-0">{btn.icon}</span>
            <span className="text-sm font-semibold text-[#2D2A26] flex-1 text-left">{btn.label}</span>
            <kbd className="bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1] rounded px-1.5 py-0.5 text-[10px] font-mono">{btn.kbd}</kbd>
          </button>
        ))}
      </div>

      {/* 3. 月历 + 每日任务（并排） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：月历 */}
        <div className="lg:col-span-1">
          <MiniCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            doneCount={doneCount}
            totalTodos={dateFilteredTodos.length}
          />
        </div>

        {/* 右：每日任务 */}
        <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-paper p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#FDF2F2] flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-[#7BA369]" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#2D2A26]">每日任务</h2>
                <p className="text-xs text-[#78716C]">
                  {selectedDate === getTodayStr()
                    ? '今日待办一目了然，点击圆圈勾选完成'
                    : `${selectedDate} 的任务记录`}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setTodos(loadTodos()); }}
              className="p-2 text-[#78716C] hover:text-[#2D2A26] hover:bg-[#F2EBDC] rounded-lg transition-colors"
              title="重置为示例"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* 输入框 */}
          <div className="flex gap-2 mb-4">
            <input
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
              placeholder={`添加 ${selectedDate} 的任务，如：给沙特客户发送报价...`}
              className="flex-1 px-3 py-2.5 bg-[#F7F3EB] border border-dashed border-[#524E48]/25 rounded-lg text-sm text-[#2D2A26] placeholder-[#78716C]/60 focus:outline-none focus:border-[#7BA369] focus:ring-1 focus:ring-[#7BA369]"
            />
            <button
              onClick={addTodo}
              className="px-3 py-2.5 bg-[#7BA369] text-[#FAF7F2] rounded-lg hover:bg-[#5F8A4D] shadow-[2px_2px_0px_0px_#2B2927] hover:shadow-[3px_3px_0px_0px_#2B2927] transition-shadow"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* 筛选 */}
          <div className="flex gap-1 mb-3 text-xs">
            {[
              { key: 'all', label: '全部', count: dateFilteredTodos.length },
              { key: 'pending', label: '待完成', count: pendingCount },
              { key: 'done', label: '已完成', count: doneCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterPriority(f.key as 'all' | 'pending' | 'done')}
                className={classNames(
                  'px-2.5 py-1.5 rounded-md font-medium transition-colors',
                  filterPriority === f.key
                    ? 'bg-[#7BA369] text-[#FAF7F2] shadow-[2px_2px_0px_0px_#2B2927]'
                    : 'bg-[#F2EBDC] text-[#5C5246] hover:bg-[#E8DDD0] border border-[#E0D5C1]'
                )}
              >
                {f.label}
                <span className={classNames(
                  'ml-1 px-1.5 rounded-full text-[10px]',
                  filterPriority === f.key ? 'bg-[#FAF7F2]/25' : 'bg-[#FAF7F2] text-[#78716C]'
                )}>{f.count}</span>
              </button>
            ))}
          </div>

          {/* 待办列表 */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-10 text-[#78716C]">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-[#E0D5C1]" strokeWidth={1.75} />
                <p className="text-sm">
                  {selectedDate === getTodayStr() ? '今日暂无任务' : `${selectedDate} 暂无任务`}
                </p>
                <p className="text-xs mt-1 font-handwriting">点击日历其他日期查看历史任务</p>
              </div>
            ) : (
              filteredTodos.map((todo) => {
                const priorityColors = {
                  high: { chip: 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6]', label: '高' },
                  medium: { chip: 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]', label: '中' },
                  low: { chip: 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]', label: '低' },
                };
                const catColors: Record<string, string> = {
                  '客户': 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]',
                  '报价': 'bg-[#F3EFF7] text-[#5B4A78] border border-[#D9CEE6]',
                  '单据': 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
                  '市场': 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]',
                  '其他': 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]',
                };
                return (
                  <div
                    key={todo.id}
                    className={classNames(
                      'group flex items-start gap-3 p-3 rounded-xl border transition-all',
                      todo.done
                        ? 'bg-[#F7F3EB] border-[#E8E2D5] opacity-60'
                        : 'bg-[#F7F3EB] border-[#E8E2D5] hover:border-[#524E48]/40 hover:shadow-paper'
                    )}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={classNames(
                        'mt-0.5 shrink-0 w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all',
                        todo.done
                          ? 'bg-[#3D3A36] text-[#FAF7F2] border-[#3D3A36]'
                          : 'border-[#3D3A36] hover:border-[#7BA369]'
                      )}
                    >
                      {todo.done && <span className="text-[10px] leading-none font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={classNames(
                        'text-sm font-medium leading-snug',
                        todo.done ? 'text-[#78716C] line-through' : 'text-[#2D2A26]'
                      )}>
                        {todo.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {todo.category && (
                          <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium', catColors[todo.category])}>
                            {todo.category}
                          </span>
                        )}
                        <button
                          onClick={() => cyclePriority(todo.id)}
                          className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium border', priorityColors[todo.priority].chip)}
                          title="点击切换优先级：高→中→低"
                        >
                          {priorityColors[todo.priority].label}优先
                        </button>
                        {todo.dueTime && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]">
                            <Clock className="w-3 h-3" strokeWidth={1.75} />{todo.dueTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[#78716C] hover:text-[#9B2C2C] hover:bg-[#FDF2F2] rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {pendingCount > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-[#524E48]/25 text-xs text-[#78716C] font-handwriting flex items-center justify-between">
              <span>💡 提示：点击日历日期可跳转查看历史任务</span>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-[#7BA369] font-medium hover:text-[#5F8A4D] flex items-center gap-1"
              >
                查看业务数据 <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. 行业快讯 + 热销产品 + 热门目标市场（三列并排） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 列1：行业快讯 */}
        <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-paper p-5 transition-all duration-200 hover:border-[#524E48]/40 hover:shadow-paper-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#EDF3E4] flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-[#A8C28E]" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#2D2A26]">{selectedIndustry || '行业'}快讯</h2>
                <p className="text-xs text-[#78716C]">全球动态实时更新</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{formatDate(today.toISOString()).slice(5)}</span>
            </div>
          </div>

          {industryLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#A8C28E] animate-spin" strokeWidth={1.75} />
                <p className="text-xs text-[#78716C]">AI 正在获取{selectedIndustry}行业快讯...</p>
              </div>
            </div>
          ) : industryData?.news?.length ? (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {industryData.news.map((n, idx) => {
                const hotColors: Record<string, string> = {
                  hot: 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6]',
                  warm: 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]',
                  normal: 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]',
                };
                const catColors: Record<string, string> = {
                  '政策': 'bg-[#F3EFF7] text-[#5B4A78] border border-[#D9CEE6]',
                  '市场': 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]',
                  '技术': 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
                  '项目': 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
                };
                const hotLabel: Record<string, string> = { hot: '🔥 热门', warm: '✨ 关注', normal: '📰 动态' };
                const isPrimary = idx < 2;
                return (
                  <div
                    key={n.id}
                    className={classNames(
                      'group p-3 rounded-xl border transition-all',
                      isPrimary
                        ? 'border-[#7BA369]/30 bg-[#FDF2F2] hover:border-[#524E48]/40 hover:shadow-paper'
                        : 'border-[#E8E2D5] bg-[#F7F3EB] hover:border-[#524E48]/40 hover:shadow-paper'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={classNames('px-2 py-0.5 rounded text-[10px] font-semibold', catColors[n.category])}>
                          {n.category}
                        </span>
                        <span className={classNames('px-2 py-0.5 rounded text-[10px] font-semibold border', hotColors[n.hotLevel])}>
                          {hotLabel[n.hotLevel]}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#78716C] shrink-0">{n.date.slice(5)}</span>
                    </div>
                    <h3 className={classNames(
                      'font-serif font-semibold text-[#2D2A26] leading-snug mb-1.5 group-hover:text-[#7BA369] transition-colors',
                      isPrimary ? 'text-sm' : 'text-xs'
                    )}>
                      {n.title}
                    </h3>
                    <p className={classNames(
                      'text-[#5C5246] leading-relaxed mb-2.5',
                      isPrimary ? 'text-xs' : 'text-[11px] line-clamp-2'
                    )}>
                      {n.summary}
                    </p>
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-[#78716C] font-handwriting truncate">
                        <Globe2 className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{n.source}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(n.title + ' ' + n.source)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#A8C28E] font-medium hover:text-[#5F8A4D] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          原文 <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                        </a>
                        <button
                          onClick={() => setAiLetterNews(n)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#7BA369]/10 text-[#7BA369] font-medium hover:bg-[#7BA369]/20 border border-[#7BA369]/30"
                          title="AI 提取商机写信"
                        >
                          <Sparkles className="w-3 h-3" strokeWidth={1.75} />AI 写信
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-[#78716C]">
              暂无快讯数据
            </div>
          )}
          {industryData?.news && industryData.news.length > 2 && (
            <div className="mt-2 text-center text-[10px] text-[#78716C] font-handwriting">
              ↕ 滚动查看更多快讯
            </div>
          )}
        </div>

        {/* 列2：热销产品排行 */}
        <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-paper p-5 transition-all duration-200 hover:border-[#524E48]/40 hover:shadow-paper-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#F0F5F2] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#2F5D50]" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#2D2A26]">热销产品排行</h2>
                <p className="text-xs text-[#78716C]">本季度{selectedIndustry || '行业'}出口热销品类</p>
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-[#2F5D50]" strokeWidth={1.75} />
          </div>
          {industryLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#2F5D50] animate-spin" strokeWidth={1.75} />
                <p className="text-xs text-[#78716C]">加载热销产品数据...</p>
              </div>
            </div>
          ) : industryData?.hot_products?.length ? (
            <div className="space-y-2">
              {industryData.hot_products.map((p, idx) => {
                const catColor: Record<string, string> = {
                  '整机': 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]',
                  '塔筒': 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]',
                  '叶片': 'bg-[#F3EFF7] text-[#5B4A78] border border-[#D9CEE6]',
                  '电控': 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
                  '配件': 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]',
                  '高端系列': 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]',
                  '标准系列': 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]',
                  '定制系列': 'bg-[#F3EFF7] text-[#5B4A78] border border-[#D9CEE6]',
                  '入门系列': 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]',
                  '组件': 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]',
                  '储能': 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]',
                  '逆变器': 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
                  '支架': 'bg-[#F3EFF7] text-[#5B4A78] border border-[#D9CEE6]',
                  '耗材': 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]',
                };
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F2EBDC] transition-colors group cursor-pointer" onClick={() => onNavigate('products')}>
                    <div className={classNames(
                      'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                      idx < 3 ? 'bg-[#7BA369] text-[#FAF7F2] shadow-[1px_1px_0px_0px_#2B2927]' : 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-serif font-semibold text-[#2D2A26] truncate">{p.name}</p>
                        <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', catColor[p.category] || 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]')}>
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C]">{p.model}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#2D2A26]">{p.revenue}</p>
                      <p className={classNames(
                        'text-[10px] font-medium flex items-center justify-end gap-0.5',
                        p.trend === 'up' ? 'text-[#2F5D50]' : 'text-[#9B2C2C]'
                      )}>
                        <Zap className="w-3 h-3" strokeWidth={1.75} />{p.growth}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-[#78716C]">
              暂无热销产品数据
            </div>
          )}
          <button
            onClick={() => onNavigate('products')}
            className="mt-4 w-full text-sm text-[#2F5D50] font-medium py-2 rounded-lg border border-[#C2D6C8] bg-[#F0F5F2] hover:bg-[#E0EBE5] transition-colors flex items-center justify-center gap-1"
          >
            进入产品库 <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* 列3：热门目标市场 */}
        <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-2xl shadow-paper p-5 transition-all duration-200 hover:border-[#524E48]/40 hover:shadow-paper-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#EEF2F7] flex items-center justify-center">
                <Target className="w-5 h-5 text-[#3B5A7A]" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-lg font-serif font-semibold text-[#2D2A26]">热门目标市场</h2>
                <p className="text-xs text-[#78716C]">近30天询盘热度与利润率</p>
              </div>
            </div>
            <MapPin className="w-4 h-4 text-[#3B5A7A]" strokeWidth={1.75} />
          </div>
          {industryLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#3B5A7A] animate-spin" strokeWidth={1.75} />
                <p className="text-xs text-[#78716C]">加载热门市场数据...</p>
              </div>
            </div>
          ) : industryData?.hot_markets?.length ? (
            <div className="space-y-2">
              {industryData.hot_markets.map((m) => {
                const riskColors: Record<string, string> = {
                  low: 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
                  medium: 'bg-[#EDF3E4] text-[#5F8A4D] border border-[#C9D9B8]',
                  high: 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6]',
                };
                const riskLabels: Record<string, string> = {
                  low: '风险低',
                  medium: '风险中',
                  high: '风险高',
                };
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F2EBDC] transition-colors group cursor-pointer" onClick={() => onNavigate('customers')}>
                    <div className="text-2xl shrink-0 w-9 text-center">{m.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-serif font-semibold text-[#2D2A26] truncate">{m.country}</p>
                        <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', riskColors[m.risk])}>
                          {riskLabels[m.risk]}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] flex items-center gap-1 truncate">
                        <Briefcase className="w-3 h-3 shrink-0" strokeWidth={1.75} /><span className="truncate">{m.demand}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <div className="flex items-center justify-end gap-1 text-[11px] text-[#78716C]">
                        <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                        询盘 <span className="font-semibold text-[#2D2A26]">{m.inquiries30d}</span>
                      </div>
                      <p className="text-xs font-bold text-[#2F5D50]">利润 {m.avgMargin}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-[#78716C]">
              暂无市场数据
            </div>
          )}
          <button
            onClick={() => onNavigate('customers')}
            className="mt-4 w-full text-sm text-[#3B5A7A] font-medium py-2 rounded-lg border border-[#C7D5E6] bg-[#EEF2F7] hover:bg-[#DDE5F0] transition-colors flex items-center justify-center gap-1"
          >
            进入客户管理 <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 5. 收汇与物流风控预警卡片（AI 动态生成） */}
      <div className="bg-[#FFFDF9] border-2 border-[#F5C6C6] rounded-2xl shadow-paper p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#FDF2F2] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#9B2C2C]" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#2D2A26] flex items-center gap-2">
                收汇与物流风控预警
                <span className="text-xs font-normal bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6] px-2 py-0.5 rounded-full">
                  {alertsLoading ? 'AI 分析中...' : `AI 分析 · ${riskAlerts.length} 条预警`}
                </span>
              </h2>
              <p className="text-xs text-[#78716C] font-handwriting">AI 自动扫描订单+物流数据，智能识别风控异常</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('shipments')}
            className="text-sm text-[#9B2C2C] font-medium hover:text-[#7A2222] flex items-center gap-1"
          >
            查看详情 <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {alertsLoading ? (
          <div className="flex items-center justify-center py-8 text-[#9B2C2C] text-sm">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.75} />
            <span className="font-handwriting">AI 正在扫描订单与物流数据...</span>
          </div>
        ) : riskAlerts.length === 0 ? (
          <div className="text-center py-6 bg-[#F0F5F2] border border-[#C2D6C8] rounded-xl">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#2F5D50]" strokeWidth={1.75} />
            <p className="text-sm text-[#5C5246] font-medium">暂无风控预警</p>
            <p className="text-xs text-[#78716C] mt-1">AI 判定当前所有订单收汇与物流状态正常</p>
          </div>
        ) : (
          <div className="space-y-2">
            {riskAlerts.map((r) => {
              const isExpanded = expandedAlert === r.id;
              const levelStyles: Record<string, string> = {
                critical: 'bg-[#FDF2F2] border-[#F5C6C6] text-[#9B2C2C]',
                warning: 'bg-[#EDF3E4] border-[#C9D9B8] text-[#5F8A4D]',
                info: 'bg-[#F0F5F2] border-[#C2D6C8] text-[#2F5D50]',
              };
              const levelBar: Record<string, string> = {
                critical: 'bg-[#9B2C2C]',
                warning: 'bg-[#A8C28E]',
                info: 'bg-[#2F5D50]',
              };
              const levelLabel: Record<string, string> = {
                critical: '严重',
                warning: '警告',
                info: '关注',
              };
              const wavy = r.level === 'critical' ? 'underline decoration-wavy decoration-[#9B2C2C]/50 decoration-2 underline-offset-2' : '';
              return (
                <div
                  key={r.id}
                  className={classNames(
                    'rounded-xl border overflow-hidden transition-all',
                    levelStyles[r.level]
                  )}
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#FAF7F2]"
                    onClick={() => setExpandedAlert(isExpanded ? null : r.id)}
                  >
                    <div className={classNames('w-1 h-10 rounded-full shrink-0', levelBar[r.level])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={classNames('text-xs font-bold', wavy)}>{r.docNumber}</span>
                        <span className="text-xs">|</span>
                        <span className="text-xs font-medium">{r.customer}</span>
                        <span className={classNames('text-xs font-bold', wavy)}>{r.amount !== '—' ? r.amount : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px]">
                        <span>{r.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={classNames(
                        'px-2 py-1 rounded-md text-xs font-bold border',
                        levelStyles[r.level]
                      )}>
                        {levelLabel[r.level]}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 rounded bg-[#FFFDF9] text-[#2D2A26] border border-[#E8E2D5]">
                        {r.action}
                      </span>
                      <ChevronRight className={classNames(
                        'w-4 h-4 transition-transform',
                        isExpanded ? 'rotate-90' : ''
                      )} strokeWidth={1.75} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="bg-[#F7F3EB] rounded-lg p-3 border border-dashed border-[#524E48]/25">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] mb-1">
                          <Sparkles className="w-3 h-3 text-[#7BA369]" strokeWidth={1.75} />
                          <span className="font-semibold text-[#7BA369] font-handwriting">AI 分析原因</span>
                        </div>
                        <p className="text-xs text-[#3D3A36] leading-relaxed">{r.reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI 写信 Modal */}
      {aiLetterNews && (
        <AILetterModal news={aiLetterNews} onClose={() => setAiLetterNews(null)} />
      )}

      {/* 行业选择 Modal */}
      {showIndustryModal && (
        <IndustrySelectModal
          current={selectedIndustry}
          onSelect={handleSelectIndustry}
          onClose={() => { if (selectedIndustry) setShowIndustryModal(false); }}
        />
      )}
    </div>
  );
}
