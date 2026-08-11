import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Truck, MapPin, Calendar, Ship, Plane,
  ClipboardList, CheckCircle2, Clock, ArrowRight, Sparkles, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames, formatDate, formatDateTime, generateDocNumber } from '@/lib/utils';
import type { Shipment, ShipmentStatus, Inquiry, Customer } from '@/lib/supabase';

const statusFlow: { value: ShipmentStatus; label: string; color: string; icon: typeof Clock }[] = [
  { value: 'pending_booking', label: '待订舱', color: 'bg-slate-100 text-slate-600', icon: Clock },
  { value: 'booked', label: '已订舱/提柜', color: 'bg-blue-100 text-blue-700', icon: ClipboardList },
  { value: 'customs_cleared', label: '已报关', color: 'bg-amber-100 text-amber-700', icon: FileText },
  { value: 'in_transit', label: '已开船(运输中)', color: 'bg-purple-100 text-purple-700', icon: Ship },
  { value: 'arrived', label: '已到港', color: 'bg-cyan-100 text-cyan-700', icon: MapPin },
  { value: 'delivered', label: '已签收/已提货', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
];

function getStatusInfo(status: ShipmentStatus) {
  return statusFlow.find(s => s.value === status) || statusFlow[0];
}

function getStatusIndex(status: ShipmentStatus) {
  return statusFlow.findIndex(s => s.value === status);
}

// 智能解析粘贴文本，自动识别物流关键字段
function parseShipmentText(text: string): Partial<Shipment> {
  const result: Partial<Shipment> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const patterns: Record<string, RegExp[]> = {
    so_number: [/SO\s*(?:No\.?|Number)?[:\s]*(.+?)(?:\n|$)/i, /订舱号[:\s]*(.+?)(?:\n|$)/],
    container_number: [/Container\s*(?:No\.?|Number)?[:\s]*(.+?)(?:\n|$)/i, /柜号[:\s]*(.+?)(?:\n|$)/],
    bl_number: [/B\/L\s*(?:No\.?|Number)?[:\s]*(.+?)(?:\n|$)/i, /提单号[:\s]*(.+?)(?:\n|$)/],
    carrier: [/(?:Carrier|船公司|航空公司)[:\s]*(.+?)(?:\n|$)/i],
    vessel_voyage: [/(?:Vessel|Voyage|船名|航次)[:\s]*(.+?)(?:\n|$)/i, /(Vessel\/Voyage)[:\s]*(.+?)(?:\n|$)/i],
    forwarder_name: [/(?:Forwarder|货代|物流公司|Freight)[:\s]*(.+?)(?:\n|$)/i],
    forwarder_contact: [/(?:Contact|联系人|货代联系人)[:\s]*(.+?)(?:\n|$)/i],
    port_of_loading: [/(?:Port of Loading|POL|装运港|起运港)[:\s]*(.+?)(?:\n|$)/i],
    port_of_discharge: [/(?:Port of Discharge|POD|卸货港|目的港|Destination Port)[:\s]*(.+?)(?:\n|$)/i],
    cy_cutoff: [/(?:CY Cutoff|截关|截关时间)[:\s]*(.+?)(?:\n|$)/i],
    si_cutoff: [/(?:SI Cutoff|截单|截单时间)[:\s]*(.+?)(?:\n|$)/i],
    etd: [/(?:ETD|预计开船|预计起飞)[:\s]*(.+?)(?:\n|$)/i],
    atd: [/(?:ATD|实际开船|实际起飞)[:\s]*(.+?)(?:\n|$)/i],
    eta: [/(?:ETA|预计到港|预计到达)[:\s]*(.+?)(?:\n|$)/i],
    ata: [/(?:ATA|实际到港|实际到达)[:\s]*(.+?)(?:\n|$)/i],
    shipping_method: [/(?:Shipping Method|运输方式|Transport)[:\s]*(.+?)(?:\n|$)/i],
  };

  for (const [field, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const value = match[1].trim().replace(/[,，]$/, '');
        (result as any)[field] = value;
        break;
      }
    }
  }

  // 尝试识别日期格式并标准化
  const dateFields: (keyof Shipment)[] = ['cy_cutoff', 'si_cutoff', 'etd', 'atd', 'eta', 'ata'];
  for (const field of dateFields) {
    const val = (result as any)[field];
    if (val && typeof val === 'string') {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        (result as any)[field] = parsed.toISOString();
      }
    }
  }

  return result;
}

export function Shipments() {
  const [shipments, setShipments] = useState<(Shipment & { inquiry?: Inquiry; customer?: Customer })[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [form, setForm] = useState<Partial<Shipment>>({});
  const [viewing, setViewing] = useState<Shipment & { inquiry?: Inquiry; customer?: Customer } | null>(null);
  // 智能录入
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Shipment> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('shipments').select('*, inquiry:inquiries(*), customer:customers(*)').order('created_at', { ascending: false });
    setShipments((data as (Shipment & { inquiry?: Inquiry; customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('inquiries').select('*').then(({ data }) => setInquiries((data as Inquiry[]) || []));
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
  }, [load]);

  const filtered = useMemo(() => shipments.filter(s => {
    const matchSearch = !search ||
      s.shipment_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.so_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.bl_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.container_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.customer?.company_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  }), [shipments, search, filterStatus]);

  function startAdd() {
    setEditing(null);
    setForm({
      shipment_number: generateDocNumber('SHP'),
      status: 'pending_booking',
      shipping_method: 'Sea Freight',
    });
    setRawText('');
    setParsedPreview(null);
    setShowForm(true);
  }

  function startEdit(s: Shipment & { inquiry?: Inquiry; customer?: Customer }) {
    setEditing(s);
    const { inquiry, customer, id, created_at, updated_at, ...rest } = s;
    setForm(rest);
    setRawText('');
    setParsedPreview(null);
    setShowForm(true);
  }

  function handleParse() {
    if (!rawText.trim()) return;
    const parsed = parseShipmentText(rawText);
    setParsedPreview(parsed);
    setForm(prev => ({ ...prev, ...parsed }));
  }

  async function save() {
    if (!form.shipment_number?.trim()) return;
    const { id, created_at, updated_at, inquiry, customer, ...rest } = form as any;
    if (editing) {
      await supabase.from('shipments').update(rest).eq('id', editing.id);
    } else {
      await supabase.from('shipments').insert(rest);
    }
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from('shipments').delete().eq('id', id);
    load();
  }

  async function updateStatus(id: string, status: ShipmentStatus) {
    await supabase.from('shipments').update({ status }).eq('id', id);
    load();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">物流管理</h1>
          <p className="text-sm text-slate-500 mt-1">Shipment Management & Milestone Tracking</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> 新建物流
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索运单号 / SO / B/L / 柜号 / 客户..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">全部状态</option>
          {statusFlow.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">暂无物流记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const statusInfo = getStatusInfo(s.status);
            const StatusIcon = statusInfo.icon;
            const statusIdx = getStatusIndex(s.status);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-slate-900">{s.shipment_number}</span>
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
                        <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                      <div className="text-slate-500">客户: <span className="text-slate-700">{s.customer?.company_name || '—'}</span></div>
                      <div className="text-slate-500">SO No.: <span className="text-slate-700">{s.so_number || '—'}</span></div>
                      <div className="text-slate-500">B/L No.: <span className="text-slate-700">{s.bl_number || '—'}</span></div>
                      <div className="text-slate-500">Container: <span className="text-slate-700">{s.container_number || '—'}</span></div>
                      <div className="text-slate-500">Carrier: <span className="text-slate-700">{s.carrier || '—'}</span></div>
                      <div className="text-slate-500">Vessel: <span className="text-slate-700">{s.vessel_voyage || '—'}</span></div>
                      <div className="text-slate-500">ETD: <span className="text-slate-700">{formatDate(s.etd)}</span></div>
                      <div className="text-slate-500">ETA: <span className="text-slate-700">{formatDate(s.eta)}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewing(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看轨迹">
                      <MapPin className="w-4 h-4" />
                    </button>
                    <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="编辑">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mini status flow */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-50">
                  {statusFlow.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isDone = idx <= statusIdx;
                    const isCurrent = idx === statusIdx;
                    return (
                      <div key={step.value} className="flex items-center">
                        {idx > 0 && <div className={classNames('w-6 h-0.5', idx <= statusIdx ? 'bg-blue-400' : 'bg-slate-200')} />}
                        <button
                          onClick={() => updateStatus(s.id, step.value)}
                          className={classNames(
                            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                            isCurrent ? step.color + ' ring-1 ring-blue-300' : isDone ? 'text-slate-400' : 'text-slate-300 hover:text-slate-400'
                          )}
                          title={`点击设为: ${step.label}`}
                        >
                          <StepIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">{step.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editing ? '编辑物流' : '新建物流'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
              {/* Smart Input */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-blue-700">智能录入 — 粘贴物流信息，自动识别字段</span>
                </div>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={`粘贴货代邮件或物流信息，例如:\nSO No.: COSU1234567890\nB/L No.: SH-2024-001\nContainer No.: MEDU1234567\nCarrier: COSCO\nVessel/Voyage: MSC GULSUN 042E\nPort of Loading: Shanghai\nPort of Discharge: Rotterdam\nETD: 2024-08-15\nETA: 2024-09-20\nCY Cutoff: 2024-08-13 18:00\nForwarder: ABC Logistics\nContact: John +86-138-xxxx-xxxx`}
                  rows={6}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-y"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleParse}
                    disabled={!rawText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> 识别并填入
                  </button>
                  {parsedPreview && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 已识别 {Object.keys(parsedPreview).length} 个字段
                    </span>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="运单号 *">
                  <input value={form.shipment_number || ''} onChange={e => setForm({ ...form, shipment_number: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="状态">
                  <select value={form.status || 'pending_booking'} onChange={e => setForm({ ...form, status: e.target.value as ShipmentStatus })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    {statusFlow.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="关联询盘">
                  <select value={form.inquiry_id || ''} onChange={e => {
                    const inqId = e.target.value || null;
                    const inq = inquiries.find(i => i.id === inqId);
                    setForm({ ...form, inquiry_id: inqId, customer_id: inq?.customer_id || form.customer_id });
                  }} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="">— 不关联 —</option>
                    {inquiries.map(i => <option key={i.id} value={i.id}>{i.inquiry_number} — {i.subject}</option>)}
                  </select>
                </Field>
                <Field label="客户">
                  <select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="">— 选择客户 —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </Field>
              </div>

              {/* Forwarder Info */}
              <SectionTitle icon={Truck} text="货代信息 Forwarder" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="物流公司">
                  <input value={form.forwarder_name || ''} onChange={e => setForm({ ...form, forwarder_name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="联系人">
                  <input value={form.forwarder_contact || ''} onChange={e => setForm({ ...form, forwarder_contact: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
              </div>

              {/* Shipping Info */}
              <SectionTitle icon={Ship} text="运输信息 Shipping" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="订舱号 SO No.">
                  <input value={form.so_number || ''} onChange={e => setForm({ ...form, so_number: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="柜号 Container No.">
                  <input value={form.container_number || ''} onChange={e => setForm({ ...form, container_number: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="提单号 B/L No.">
                  <input value={form.bl_number || ''} onChange={e => setForm({ ...form, bl_number: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="运输方式">
                  <select value={form.shipping_method || ''} onChange={e => setForm({ ...form, shipping_method: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    <option value="Sea Freight">Sea Freight 海运</option>
                    <option value="Air Freight">Air Freight 空运</option>
                    <option value="Rail">Rail 铁路</option>
                    <option value="Road">Road 陆运</option>
                    <option value="Multimodal">Multimodal 多式联运</option>
                  </select>
                </Field>
                <Field label="船公司/航空公司 Carrier">
                  <input value={form.carrier || ''} onChange={e => setForm({ ...form, carrier: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="船名航次 Vessel/Voyage">
                  <input value={form.vessel_voyage || ''} onChange={e => setForm({ ...form, vessel_voyage: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="装运港 Port of Loading">
                  <input value={form.port_of_loading || ''} onChange={e => setForm({ ...form, port_of_loading: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="卸货港 Port of Discharge">
                  <input value={form.port_of_discharge || ''} onChange={e => setForm({ ...form, port_of_discharge: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
              </div>

              {/* Time Tracking */}
              <SectionTitle icon={Calendar} text="时间节点追踪 Milestone Tracking" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="截关时间 CY Cutoff">
                  <input type="datetime-local" value={toDateTimeLocal(form.cy_cutoff)} onChange={e => setForm({ ...form, cy_cutoff: fromDateTimeLocal(e.target.value) })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="截单时间 SI Cutoff">
                  <input type="datetime-local" value={toDateTimeLocal(form.si_cutoff)} onChange={e => setForm({ ...form, si_cutoff: fromDateTimeLocal(e.target.value) })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="预计开船 ETD">
                  <input type="date" value={toDateInput(form.etd)} onChange={e => setForm({ ...form, etd: e.target.value || null })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="实际开船 ATD">
                  <input type="date" value={toDateInput(form.atd)} onChange={e => setForm({ ...form, atd: e.target.value || null })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="预计到港 ETA">
                  <input type="date" value={toDateInput(form.eta)} onChange={e => setForm({ ...form, eta: e.target.value || null })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
                <Field label="实际到港 ATA">
                  <input type="date" value={toDateInput(form.ata)} onChange={e => setForm({ ...form, ata: e.target.value || null })} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </Field>
              </div>

              {/* Notes */}
              <Field label="备注 Notes">
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking View Modal */}
      {viewing && (
        <TrackingView shipment={viewing} onClose={() => setViewing(null)} onStatusChange={updateStatus} />
      )}
    </div>
  );
}

// ====== Tracking View (Milestone Tracking Board) ======
function TrackingView({ shipment, onClose, onStatusChange }: {
  shipment: Shipment & { inquiry?: Inquiry; customer?: Customer };
  onClose: () => void;
  onStatusChange: (id: string, status: ShipmentStatus) => void;
}) {
  const statusIdx = getStatusIndex(shipment.status);

  const milestones: { label: string; planned: string | null; actual: string | null; icon: typeof Calendar }[] = [
    { label: 'CY Cutoff 截关', planned: formatDateTime(shipment.cy_cutoff), actual: null, icon: Calendar },
    { label: 'SI Cutoff 截单', planned: formatDateTime(shipment.si_cutoff), actual: null, icon: Calendar },
    { label: 'Departure 开船', planned: formatDate(shipment.etd), actual: formatDate(shipment.atd), icon: Ship },
    { label: 'Arrival 到港', planned: formatDate(shipment.eta), actual: formatDate(shipment.ata), icon: MapPin },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{shipment.shipment_number}</h2>
            <p className="text-sm text-slate-500">物流轨迹看板 Milestone Tracking</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Status Flow Kanban */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">状态流转 Status Flow</h3>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {statusFlow.map((step, idx) => {
                const StepIcon = step.icon;
                const isDone = idx < statusIdx;
                const isCurrent = idx === statusIdx;
                return (
                  <div key={step.value} className="flex items-center shrink-0">
                    {idx > 0 && (
                      <div className={classNames('w-8 h-0.5 mx-1', idx <= statusIdx ? 'bg-blue-400' : 'bg-slate-200')} />
                    )}
                    <button
                      onClick={() => onStatusChange(shipment.id, step.value)}
                      className={classNames(
                        'flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[90px]',
                        isCurrent ? 'bg-blue-50 ring-2 ring-blue-300' : isDone ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'
                      )}
                    >
                      <div className={classNames(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isCurrent ? step.color + ' ring-2 ring-blue-300' : isDone ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <span className={classNames('text-xs font-medium text-center', isCurrent ? 'text-blue-700' : isDone ? 'text-slate-600' : 'text-slate-400')}>
                        {step.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestone Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">时间节点 Timeline</h3>
            <div className="space-y-2">
              {milestones.map(m => {
                const MilestoneIcon = m.icon;
                return (
                  <div key={m.label} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <MilestoneIcon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{m.label}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5">
                        <span>Planned: {m.planned}</span>
                        {m.actual && <span className="text-emerald-600">Actual: {m.actual}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipment Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">运输信息 Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-slate-50 rounded-lg p-4">
              <DetailRow label="Customer" value={shipment.customer?.company_name} />
              <DetailRow label="Shipping Method" value={shipment.shipping_method} />
              <DetailRow label="SO No." value={shipment.so_number} />
              <DetailRow label="B/L No." value={shipment.bl_number} />
              <DetailRow label="Container No." value={shipment.container_number} />
              <DetailRow label="Carrier" value={shipment.carrier} />
              <DetailRow label="Vessel/Voyage" value={shipment.vessel_voyage} />
              <DetailRow label="Forwarder" value={shipment.forwarder_name} />
              <DetailRow label="Port of Loading" value={shipment.port_of_loading} />
              <DetailRow label="Port of Discharge" value={shipment.port_of_discharge} />
              <DetailRow label="Contact" value={shipment.forwarder_contact} />
              <DetailRow label="Inquiry" value={shipment.inquiry?.inquiry_number} />
            </div>
          </div>

          {shipment.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">备注 Notes</h3>
              <p className="text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg p-3">{shipment.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== Helpers ======
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}

function SectionTitle({ icon: Icon, text }: { icon: typeof Truck; text: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-sm font-semibold text-slate-600">{text}</span>
      <div className="flex-1 border-t border-slate-100 ml-2" />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}:</span>
      <span className="text-slate-700">{value || '—'}</span>
    </div>
  );
}

function toDateInput(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function toDateTimeLocal(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
