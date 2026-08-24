import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Truck, MapPin, Calendar, Ship, Plane,
  ClipboardList, CheckCircle2, Clock, ArrowRight, Sparkles, FileText,
  Package, AlertTriangle, AlertCircle, Circle, MoreHorizontal, Play,
  TrendingUp, DollarSign, Receipt, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames, formatDate, generateDocNumber, formatCurrency } from '@/lib/utils';
import { syncWonInquiriesToShipments } from '@/lib/sync';
import type { Shipment, ShipmentStatus, ShippingScenario, PaymentStatus, Inquiry, Customer } from '@/lib/supabase';

// ====== 状态流程（简化版：履约全流程）======
const statusFlow: { value: ShipmentStatus; label: string; color: string; icon: typeof Clock }[] = [
  { value: 'pending_booking', label: '待启动', color: 'bg-slate-100 text-slate-600', icon: Clock },
  { value: 'booked', label: '已发货/已下单', color: 'bg-blue-100 text-blue-700', icon: Package },
  { value: 'customs_cleared', label: '国内已发货', color: 'bg-amber-100 text-amber-700', icon: Truck },
  { value: 'in_transit', label: '运输中', color: 'bg-purple-100 text-purple-700', icon: Ship },
  { value: 'arrived', label: '已到港/交付', color: 'bg-cyan-100 text-cyan-700', icon: MapPin },
  { value: 'delivered', label: '已完成', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
];

function getStatusInfo(status: ShipmentStatus) {
  return statusFlow.find(s => s.value === status) || statusFlow[0];
}
function getStatusIndex(status: ShipmentStatus) {
  return statusFlow.findIndex(s => s.value === status);
}

// ====== 三色预警逻辑 ======
type AlertLevel = 'green' | 'yellow' | 'red';

function computeAlertLevel(s: Shipment): AlertLevel {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (s.factory_eta) {
    const factoryDate = new Date(s.factory_eta);
    factoryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((factoryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // 工厂交期晚于客户承诺交期 → 红色
    if (s.client_deadline) {
      const deadline = new Date(s.client_deadline);
      deadline.setHours(0, 0, 0, 0);
      if (factoryDate > deadline) return 'red';
    }
    // 距工厂交期不足5天且未收到出货通知 → 黄色
    if (diffDays >= 0 && diffDays <= 5 && !s.domestic_shipped_date) return 'yellow';
    if (diffDays < 0 && !s.domestic_shipped_date) return 'red';
  }
  return 'green';
}

function alertColor(level: AlertLevel): { bg: string; text: string; border: string; label: string } {
  switch (level) {
    case 'green': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '正常' };
    case 'yellow': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: '预警' };
    case 'red': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '严重' };
  }
}

// ====== 里程碑时间轴数据结构 ======
interface TimelineNode {
  key: string;
  label: string;
  date: string | null;
  type: 'plan' | 'actual';
  icon: typeof Calendar;
  group: 'procurement' | 'production' | 'shipping' | 'delivery' | 'payment';
}

function buildTimeline(s: Shipment): TimelineNode[] {
  const nodes: TimelineNode[] = [
    // 采购
    { key: 'po', label: 'PO 下单', date: s.po_date, type: 'actual', icon: Receipt, group: 'procurement' },
    // 生产
    { key: 'factory_eta', label: '工厂交期', date: s.factory_eta, type: 'plan', icon: Package, group: 'production' },
    { key: 'client_deadline', label: '客户承诺交期', date: s.client_deadline, type: 'plan', icon: Calendar, group: 'production' },
  ];

  if (s.shipping_scenario === 'client_forwarder') {
    // 客户自货代：国内发货→货代收到货 即结束
    nodes.push(
      { key: 'domestic_ship', label: '国内发货', date: s.domestic_shipped_date, type: 'actual', icon: Truck, group: 'shipping' },
      { key: 'forwarder_received', label: '货代收货', date: s.forwarder_received_date, type: 'actual', icon: CheckCircle2, group: 'delivery' },
    );
  } else {
    // 我方安排：国内发货→货代收货→订舱→开船→到港
    nodes.push(
      { key: 'domestic_ship', label: '国内发货', date: s.domestic_shipped_date, type: 'actual', icon: Truck, group: 'shipping' },
      { key: 'forwarder_received', label: '货代收货', date: s.forwarder_received_date, type: 'actual', icon: Package, group: 'shipping' },
      { key: 'booking', label: '订舱', date: s.booking_date, type: 'actual', icon: ClipboardList, group: 'shipping' },
      { key: 'etd', label: 'ETD 开船', date: s.etd, type: 'plan', icon: Ship, group: 'shipping' },
      { key: 'atd', label: 'ATD 实际开船', date: s.atd, type: 'actual', icon: Ship, group: 'shipping' },
      { key: 'eta', label: 'ETA 到港', date: s.eta, type: 'plan', icon: MapPin, group: 'delivery' },
      { key: 'ata', label: 'ATA 实际到港', date: s.ata, type: 'actual', icon: MapPin, group: 'delivery' },
    );
  }

  // 款项
  nodes.push(
    { key: 'balance', label: '尾款收到', date: s.balance_received_date, type: 'actual', icon: DollarSign, group: 'payment' },
    { key: 'bl_release', label: '提单放行', date: s.bl_released_date, type: 'actual', icon: FileText, group: 'payment' },
  );

  return nodes;
}

// ====== 计算进度百分比 ======
function computeTimelineProgress(nodes: TimelineNode[]): number {
  const total = nodes.length;
  const done = nodes.filter(n => n.date).length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

// ====== 主组件 ======
export function Shipments() {
  const [shipments, setShipments] = useState<(Shipment & { inquiry?: Inquiry; customer?: Customer })[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<string>('all'); // all/green/yellow/red
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [form, setForm] = useState<Partial<Shipment>>({});
  const [viewing, setViewing] = useState<Shipment & { inquiry?: Inquiry; customer?: Customer } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 迁移：为所有已成交但尚无履约记录的询盘自动创建订单履约
  const migrateWonInquiries = useCallback(async (showToastMsg = false): Promise<number> => {
    let createdCount = 0;
    try {
      // 获取所有已成交的询盘
      const { data: wonInquiries } = await supabase.from('inquiries').select('*').eq('status', 'won');
      if (!wonInquiries || (wonInquiries as any[]).length === 0) {
        console.log('没有已成交的询盘需要同步');
        if (showToastMsg) showToast('info', '没有已成交的询盘');
        return 0;
      }

      // 获取已有履约记录关联的 inquiry_id
      const { data: existingShipments } = await supabase.from('shipments').select('inquiry_id');
      const existingIds = new Set(((existingShipments as any[]) || []).map((s: any) => s.inquiry_id).filter(Boolean));

      // 为没有履约记录的已成交询盘创建履约单
      const toCreate = (wonInquiries as any[]).filter(inq => !existingIds.has(inq.id));
      if (toCreate.length === 0) {
        console.log('所有已成交询盘都已同步到订单履约');
        if (showToastMsg) showToast('success', '所有已成交询盘都已同步');
        return 0;
      }

      console.log(`需要同步 ${toCreate.length} 条询盘到订单履约`);

      // 批量插入
      for (const inq of toCreate) {
        const itemTotal = (inq.items || []).reduce((s: any, i: any) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0);
        const record: any = {
          shipment_number: `SHP-${Date.now().toString().slice(-6)}-${inq.inquiry_number}`,
          inquiry_id: inq.id,
          customer_id: inq.customer_id,
          status: 'pending_booking',
          shipping_scenario: 'our_forwarder',
          shipping_method: 'Sea Freight',
          payment_type: (inq.payment_terms || '').includes('L/C') ? 'L/C' : 'T/T',
          payment_status: 'unpaid',
          total_amount: itemTotal || 0,
          paid_amount: 0,
          balance_amount: itemTotal || 0,
          notes: `自动同步于询盘成交\n询盘编号: ${inq.inquiry_number}\n询盘主题: ${inq.subject}`,
          // 兼容新字段
          po_date: null,
          factory_eta: null,
          client_deadline: null,
          domestic_shipped_date: null,
          forwarder_received_date: null,
          booking_date: null,
          container_number: null,
          bl_number: null,
          carrier: null,
          vessel_voyage: null,
          etd: null,
          atd: null,
          eta: null,
          ata: null,
          port_of_loading: null,
          port_of_discharge: null,
          forwarder_name: null,
          forwarder_contact: null,
          balance_received_date: null,
          bl_released_date: null,
        };
        try {
          const { error } = await supabase.from('shipments').insert(record);
          if (error) {
            console.error('插入履约记录失败:', error);
          } else {
            createdCount++;
          }
        } catch (e) {
          console.error('插入履约记录出错:', e);
        }
      }

      if (showToastMsg && createdCount > 0) {
        showToast('success', `成功同步 ${createdCount} 条询盘到订单履约`);
      }
    } catch (e) {
      console.error('迁移已成交询盘失败:', e);
      if (showToastMsg) showToast('error', '同步询盘失败，请重试');
    }
    return createdCount;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    // 先执行迁移，再加载数据
    await migrateWonInquiries();
    const { data } = await supabase.from('shipments').select('*, inquiry:inquiries(*), customer:customers(*)').order('created_at', { ascending: false });
    setShipments((data as (Shipment & { inquiry?: Inquiry; customer?: Customer })[]) || []);
    setLoading(false);
  }, [migrateWonInquiries]);

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
      (s.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.inquiry?.inquiry_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const alertLevel = computeAlertLevel(s);
    const matchAlert = alertFilter === 'all' || alertFilter === alertLevel;
    return matchSearch && matchStatus && matchAlert;
  }), [shipments, search, filterStatus, alertFilter]);

  // 统计
  const stats = useMemo(() => {
    const total = shipments.length;
    const green = shipments.filter(s => computeAlertLevel(s) === 'green').length;
    const yellow = shipments.filter(s => computeAlertLevel(s) === 'yellow').length;
    const red = shipments.filter(s => computeAlertLevel(s) === 'red').length;
    return { total, green, yellow, red };
  }, [shipments]);

  function startAdd() {
    setEditing(null);
    setForm({
      shipment_number: generateDocNumber('SHP'),
      status: 'pending_booking',
      shipping_scenario: 'our_forwarder',
      shipping_method: 'Sea Freight',
      payment_type: 'T/T',
      payment_status: 'unpaid',
      total_amount: 0,
      paid_amount: 0,
      balance_amount: 0,
    });
    setShowForm(true);
  }

  function startEdit(s: Shipment & { inquiry?: Inquiry; customer?: Customer }) {
    setEditing(s);
    const { inquiry, customer, id, created_at, updated_at, ...rest } = s;
    setForm(rest);
    setShowForm(true);
  }

  async function save() {
    if (!form.shipment_number?.trim()) {
      alert('请填写订单编号');
      return;
    }
    try {
      const payload: any = { ...form };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (editing) {
        const { error } = await supabase.from('shipments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) { alert('更新失败: ' + error.message); return; }
      } else {
        const { error } = await supabase.from('shipments').insert(payload);
        if (error) { alert('保存失败: ' + error.message); return; }
      }
      setShowForm(false); setForm({});
      load();
    } catch (err: any) {
      alert('保存出错: ' + (err?.message || '未知错误'));
    }
  }

  async function remove(id: string) {
    if (!confirm('确定要删除这条订单履约记录吗？')) return;
    try {
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) { alert('删除失败: ' + error.message); return; }
      load();
    } catch (err: any) { alert('删除出错: ' + (err?.message || '未知错误')); }
  }

  async function updateStatus(id: string, status: ShipmentStatus) {
    try {
      const { error } = await supabase.from('shipments').update({ status }).eq('id', id);
      if (error) { alert('状态更新失败'); return; }
      load();
    } catch (err: any) { alert('状态更新出错'); }
  }

  // 更新履约节点（单字段更新）
  async function updateField(id: string, field: string, value: any) {
    try {
      await supabase.from('shipments').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
      load();
    } catch {}
  }

  // ====== 渲染时间轴（甘特图风格）======
  function TimelineBar({ shipment, onUpdateField }: { shipment: Shipment; onUpdateField: (id: string, field: string, value: any) => void }) {
    const nodes = buildTimeline(shipment);
    const progress = computeTimelineProgress(nodes);
    const alertLevel = computeAlertLevel(shipment);
    const colors = alertColor(alertLevel);

    return (
      <div className={classNames('rounded-xl border p-4', colors.bg, colors.border)}>
        {/* 进度条 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={classNames('px-2 py-0.5 rounded-full text-xs font-semibold', `bg-${alertLevel === 'green' ? 'emerald' : alertLevel === 'yellow' ? 'amber' : 'red'}-100 text-${alertLevel === 'green' ? 'emerald' : alertLevel === 'yellow' ? 'amber' : 'red'}-700`)}>
              {colors.label}
            </span>
            <span className="text-xs text-slate-600">进度 {progress}%</span>
          </div>
          <div className="flex-1 mx-3 h-1.5 bg-white/80 rounded-full overflow-hidden">
            <div className={classNames('h-full rounded-full transition-all',
              alertLevel === 'red' ? 'bg-red-500 animate-pulse' :
              alertLevel === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
            )} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 时间轴节点 - 甘特图横向布局 */}
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {nodes.map((node, idx) => {
            const done = !!node.date;
            const NodeIcon = node.icon;
            const getNodeColor = () => {
              if (!node.date) return 'bg-slate-200 text-slate-400 border-slate-300';
              if (node.type === 'plan') return colors.text.replace('text-', 'bg-') + '/10 border-current';
              return 'bg-emerald-100 text-emerald-700 border-emerald-300';
            };
            return (
              <div key={node.key} className="flex items-center shrink-0">
                {idx > 0 && <div className={classNames('w-4 h-0.5 mx-0.5', done ? 'bg-emerald-400' : 'bg-slate-200')} />}
                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className={classNames(
                    'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all',
                    done ? 'bg-white border-emerald-400 text-emerald-600' : 'bg-white border-slate-300 text-slate-400'
                  )}
                  title={`${node.label}: ${formatDate(node.date)}`}
                  onClick={() => {
                    const val = prompt(`设置${node.label} (YYYY-MM-DD)`, node.date ? formatDate(node.date) : '');
                    if (val !== null) onUpdateField(shipment.id, node.key === 'etd' ? 'etd' : node.key === 'eta' ? 'eta' : node.key === 'atd' ? 'atd' : node.key === 'ata' ? 'ata' : node.key, val || null);
                  }}
                  >
                    <NodeIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <span className="text-[10px] text-center leading-tight max-w-[70px] truncate text-slate-600">{node.label}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{formatDate(node.date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">订单履约</h1>
          <p className="text-sm text-slate-500 mt-1">PO · 交期 · 物流 · 款项全流程追踪</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const result = await syncWonInquiriesToShipments();
              if (result.created > 0) {
                showToast('success', result.message);
              } else if (result.message.includes('失败')) {
                showToast('error', result.message);
              } else {
                showToast('info', result.message);
              }
              load();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            title="同步询盘管理中已成交的订单"
          >
            <RefreshCw className="w-4 h-4" /> 同步询盘
          </button>
          <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 新建履约
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">总履约单</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600">正常</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.green}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4">
          <p className="text-xs text-amber-600">预警（5天内到期）</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.yellow}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-xs text-red-600">严重（交期延误）</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.red}</p>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索订单号 / SO / B/L / 柜号 / 客户 / 询盘..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm">
          <option value="all">全部状态</option>
          {statusFlow.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={alertFilter} onChange={e => setAlertFilter(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm">
          <option value="all">全部预警</option>
          <option value="green">正常</option>
          <option value="yellow">预警</option>
          <option value="red">严重</option>
        </select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">暂无订单履约记录</p>
          <p className="text-xs text-slate-400 mt-1">当询盘标记为"已成交"时，将自动创建履约记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(s => {
            const statusInfo = getStatusInfo(s.status);
            const StatusIcon = statusInfo.icon;
            const statusIdx = getStatusIndex(s.status);
            const alertLevel = computeAlertLevel(s);
            const alertC = alertColor(alertLevel);

            return (
              <div key={s.id} className={classNames(
                'bg-white rounded-xl border p-4 transition-shadow hover:shadow-md',
                alertLevel === 'red' ? 'border-red-200' : alertLevel === 'yellow' ? 'border-amber-200' : 'border-slate-100'
              )}>
                {/* 头部 */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-slate-900">{s.shipment_number}</span>
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
                        <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                      </span>
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', alertC.bg, alertC.text)}>
                        {alertLevel === 'red' && <AlertCircle className="w-3 h-3" />}
                        {alertLevel === 'yellow' && <AlertTriangle className="w-3 h-3" />}
                        {alertLevel === 'green' && <CheckCircle2 className="w-3 h-3" />}
                        {alertC.label}
                      </span>
                      {s.shipping_scenario === 'client_forwarder' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          客户自货代
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                      <InfoLine label="客户" value={s.customer?.company_name} />
                      <InfoLine label="关联询盘" value={s.inquiry?.inquiry_number} />
                      <InfoLine label="工厂交期" value={formatDate(s.factory_eta)} highlight={alertLevel === 'red'} />
                      <InfoLine label="客户交期" value={formatDate(s.client_deadline)} />
                      <InfoLine label="订单金额" value={s.total_amount ? formatCurrency(s.total_amount, s.inquiry?.currency || 'USD') : undefined} />
                      <InfoLine label="已收金额" value={s.paid_amount ? formatCurrency(s.paid_amount, s.inquiry?.currency || 'USD') : undefined} />
                      <InfoLine label="尾款" value={s.balance_amount ? formatCurrency(s.balance_amount, s.inquiry?.currency || 'USD') : undefined} />
                      <InfoLine label="付款方式" value={s.payment_type} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewing(s)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看详情">
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

                {/* 状态流 */}
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

                {/* 时间轴 */}
                <div className="mt-3">
                  <TimelineBar shipment={s} onUpdateField={updateField} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 表单弹窗 */}
      {showForm && (
        <FormModal
          form={form}
          setForm={setForm}
          inquiries={inquiries}
          customers={customers}
          editing={editing}
          onClose={() => { setShowForm(false); setForm({}); }}
          onSave={save}
        />
      )}

      {/* 详情弹窗 */}
      {viewing && (
        <DetailModal
          shipment={viewing}
          onClose={() => setViewing(null)}
          onStatusChange={updateStatus}
          onUpdateField={updateField}
        />
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className={classNames(
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
          toast.type === 'success' && 'bg-emerald-600 text-white',
          toast.type === 'error' && 'bg-red-600 text-white',
          toast.type === 'info' && 'bg-blue-600 text-white',
        )}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ====== 信息行 ======
function InfoLine({ label, value, highlight }: { label: string; value?: string | number | null; highlight?: boolean }) {
  return (
    <div className="flex gap-1">
      <span className="text-slate-500 shrink-0">{label}:</span>
      <span className={classNames('font-medium truncate', highlight ? 'text-red-600' : 'text-slate-700')}>
        {value || '—'}
      </span>
    </div>
  );
}

// ====== 表单弹窗 ======
function FormModal({ form, setForm, inquiries, customers, editing, onClose, onSave }: {
  form: Partial<Shipment>;
  setForm: (f: Partial<Shipment>) => void;
  inquiries: Inquiry[];
  customers: Customer[];
  editing: Shipment | null;
  onClose: () => void;
  onSave: () => void;
}) {
  function setField(key: string, value: any) {
    setForm({ ...form, [key]: value });
  }

  function handleInquiryChange(inqId: string) {
    const inq = inquiries.find(i => i.id === inqId);
    if (inq) {
      const itemTotal = (inq.items || []).reduce((s, i) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0);
      setForm({
        ...form,
        inquiry_id: inqId,
        customer_id: inq.customer_id || null,
        total_amount: itemTotal || form.total_amount || 0,
        paid_amount: form.paid_amount || 0,
        balance_amount: Math.max(0, (itemTotal || 0) - (form.paid_amount || 0)),
        client_deadline: inq.delivery_country ? form.client_deadline : form.client_deadline,
      });
    } else {
      setForm({ ...form, inquiry_id: inqId || null });
    }
  }

  function handlePaidChange(val: number) {
    const total = Number(form.total_amount) || 0;
    const paid = Number(val) || 0;
    setForm({ ...form, paid_amount: paid, balance_amount: Math.max(0, total - paid) });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{editing ? '编辑订单履约' : '新建订单履约'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-180px)] overflow-y-auto">
          {/* 基本信息 */}
          <SectionTitle text="基本信息" icon={Package} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="订单编号 *">
              <input value={form.shipment_number || ''} onChange={e => setField('shipment_number', e.target.value)} className={inputCls} />
            </Field>
            <Field label="关联询盘">
              <select value={form.inquiry_id || ''} onChange={e => handleInquiryChange(e.target.value)} className={inputCls}>
                <option value="">— 不关联 —</option>
                {inquiries.filter(i => i.status === 'won' || i.status === 'in_progress').map(i => (
                  <option key={i.id} value={i.id}>{i.inquiry_number} — {i.subject}</option>
                ))}
              </select>
            </Field>
            <Field label="客户">
              <select value={form.customer_id || ''} onChange={e => setField('customer_id', e.target.value || null)} className={inputCls}>
                <option value="">— 选择客户 —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </Field>
            <Field label="当前状态">
              <select value={form.status || 'pending_booking'} onChange={e => setField('status', e.target.value)} className={inputCls}>
                {statusFlow.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {/* 核心节点 */}
          <SectionTitle text="核心节点" icon={Calendar} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="PO 下单日期">
              <input type="date" value={toDateInput(form.po_date)} onChange={e => setField('po_date', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
            <Field label="工厂承诺交期">
              <input type="date" value={toDateInput(form.factory_eta)} onChange={e => setField('factory_eta', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
            <Field label="客户承诺交期">
              <input type="date" value={toDateInput(form.client_deadline)} onChange={e => setField('client_deadline', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
          </div>

          {/* 物流场景 */}
          <SectionTitle text="物流与装船" icon={Ship} />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="物流场景">
              <select value={form.shipping_scenario || 'our_forwarder'} onChange={e => setField('shipping_scenario', e.target.value)} className={inputCls}>
                <option value="our_forwarder">我方安排发货</option>
                <option value="client_forwarder">客户自货代</option>
              </select>
            </Field>
            <Field label="运输方式">
              <select value={form.shipping_method || ''} onChange={e => setField('shipping_method', e.target.value)} className={inputCls}>
                <option value="Sea Freight">Sea Freight 海运</option>
                <option value="Air Freight">Air Freight 空运</option>
                <option value="Rail">Rail 铁路</option>
                <option value="Road">Road 陆运</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="国内发货">
              <input type="date" value={toDateInput(form.domestic_shipped_date)} onChange={e => setField('domestic_shipped_date', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
            <Field label="货代收货">
              <input type="date" value={toDateInput(form.forwarder_received_date)} onChange={e => setField('forwarder_received_date', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
            {form.shipping_scenario === 'our_forwarder' && (
              <>
                <Field label="订舱日期">
                  <input type="date" value={toDateInput(form.booking_date)} onChange={e => setField('booking_date', fromDateInput(e.target.value))} className={inputCls} />
                </Field>
                <Field label="SO 号">
                  <input value={form.so_number || ''} onChange={e => setField('so_number', e.target.value)} className={inputCls} />
                </Field>
                <Field label="柜号">
                  <input value={form.container_number || ''} onChange={e => setField('container_number', e.target.value)} className={inputCls} />
                </Field>
                <Field label="提单号">
                  <input value={form.bl_number || ''} onChange={e => setField('bl_number', e.target.value)} className={inputCls} />
                </Field>
                <Field label="ETD 开船">
                  <input type="date" value={toDateInput(form.etd)} onChange={e => setField('etd', fromDateInput(e.target.value))} className={inputCls} />
                </Field>
                <Field label="ATD 实际开船">
                  <input type="date" value={toDateInput(form.atd)} onChange={e => setField('atd', fromDateInput(e.target.value))} className={inputCls} />
                </Field>
                <Field label="ETA 到港">
                  <input type="date" value={toDateInput(form.eta)} onChange={e => setField('eta', fromDateInput(e.target.value))} className={inputCls} />
                </Field>
                <Field label="ATA 实际到港">
                  <input type="date" value={toDateInput(form.ata)} onChange={e => setField('ata', fromDateInput(e.target.value))} className={inputCls} />
                </Field>
                <Field label="船公司">
                  <input value={form.carrier || ''} onChange={e => setField('carrier', e.target.value)} className={inputCls} />
                </Field>
                <Field label="船名航次">
                  <input value={form.vessel_voyage || ''} onChange={e => setField('vessel_voyage', e.target.value)} className={inputCls} />
                </Field>
                <Field label="装运港">
                  <input value={form.port_of_loading || ''} onChange={e => setField('port_of_loading', e.target.value)} className={inputCls} />
                </Field>
                <Field label="卸货港">
                  <input value={form.port_of_discharge || ''} onChange={e => setField('port_of_discharge', e.target.value)} className={inputCls} />
                </Field>
              </>
            )}
            {form.shipping_scenario === 'client_forwarder' && (
              <>
                <Field label="货代公司">
                  <input value={form.forwarder_name || ''} onChange={e => setField('forwarder_name', e.target.value)} className={inputCls} />
                </Field>
                <Field label="货代联系人">
                  <input value={form.forwarder_contact || ''} onChange={e => setField('forwarder_contact', e.target.value)} className={inputCls} />
                </Field>
              </>
            )}
          </div>

          {/* 款项节点 */}
          <SectionTitle text="款项节点" icon={DollarSign} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="付款方式">
              <select value={form.payment_type || ''} onChange={e => setField('payment_type', e.target.value)} className={inputCls}>
                <option value="T/T">T/T 电汇</option>
                <option value="L/C">L/C 信用证</option>
                <option value="Western Union">Western Union</option>
                <option value="PayPal">PayPal</option>
                <option value="全款">全款</option>
                <option value="分期">分期</option>
              </select>
            </Field>
            <Field label="订单总金额">
              <input type="number" min="0" step="0.01" value={form.total_amount ?? ''} onChange={e => setField('total_amount', Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="已收到金额">
              <input type="number" min="0" step="0.01" value={form.paid_amount ?? ''} onChange={e => handlePaidChange(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="尾款金额">
              <input type="number" value={form.balance_amount ?? ''} readOnly className={inputCls + ' bg-slate-50'} />
            </Field>
            <Field label="尾款收到日期">
              <input type="date" value={toDateInput(form.balance_received_date)} onChange={e => setField('balance_received_date', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
            <Field label="提单放行日期">
              <input type="date" value={toDateInput(form.bl_released_date)} onChange={e => setField('bl_released_date', fromDateInput(e.target.value))} className={inputCls} />
            </Field>
            <Field label="款项状态">
              <select value={form.payment_status || 'unpaid'} onChange={e => setField('payment_status', e.target.value as PaymentStatus)} className={inputCls}>
                <option value="unpaid">未收款</option>
                <option value="partial">部分收款</option>
                <option value="balance_pending">待收尾款</option>
                <option value="paid">全款已收</option>
                <option value="bl_released">提单已放</option>
              </select>
            </Field>
          </div>

          <Field label="备注">
            <textarea value={form.notes || ''} onChange={e => setField('notes', e.target.value)} rows={2} className={inputCls} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">保存</button>
        </div>
      </div>
    </div>
  );
}

// ====== 详情弹窗 ======
function DetailModal({ shipment, onClose, onStatusChange, onUpdateField }: {
  shipment: Shipment & { inquiry?: Inquiry; customer?: Customer };
  onClose: () => void;
  onStatusChange: (id: string, status: ShipmentStatus) => void;
  onUpdateField: (id: string, field: string, value: any) => void;
}) {
  const nodes = buildTimeline(shipment);
  const progress = computeTimelineProgress(nodes);
  const alertLevel = computeAlertLevel(shipment);
  const alertC = alertColor(alertLevel);
  const statusIdx = getStatusIndex(shipment.status);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{shipment.shipment_number}</h2>
            <p className="text-sm text-slate-500">订单履约详情 · {alertC.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 进度总览 */}
          <div className={classNames('rounded-xl p-4', alertC.bg)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">整体进度</span>
              <span className="text-sm font-bold text-slate-900">{progress}%</span>
            </div>
            <div className="h-2 bg-white/70 rounded-full overflow-hidden">
              <div className={classNames('h-full rounded-full transition-all',
                alertLevel === 'red' ? 'bg-red-500 animate-pulse' :
                alertLevel === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
              )} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* 状态流转 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">履约状态</h3>
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

          {/* 可视化甘特图时间轴 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">里程碑时间轴</h3>
            <div className="space-y-2">
              {nodes.map(node => {
                const NodeIcon = node.icon;
                const done = !!node.date;
                return (
                  <div key={node.key} className={classNames(
                    'flex items-center gap-3 rounded-lg p-3 border transition-colors',
                    done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  )}>
                    <div className={classNames(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      done ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-400'
                    )}>
                      <NodeIcon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{node.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={classNames('text-sm font-mono', done ? 'text-emerald-700' : 'text-slate-400')}>
                            {formatDate(node.date) || '待设置'}
                          </span>
                          {!done && (
                            <button
                              onClick={() => {
                                const val = prompt(`设置${node.label}`, '');
                                if (val !== null) onUpdateField(shipment.id, node.key === 'etd' ? 'etd' : node.key === 'eta' ? 'eta' : node.key === 'atd' ? 'atd' : node.key === 'ata' ? 'ata' : node.key, val || null);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded"
                            >
                              设置日期
                            </button>
                          )}
                        </div>
                      </div>
                      {node.type === 'plan' && (
                        <span className="text-[10px] text-slate-400">计划日期</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 详情信息 */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">详细信息</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-slate-50 rounded-lg p-4">
              <DetailRow label="客户" value={shipment.customer?.company_name} />
              <DetailRow label="关联询盘" value={shipment.inquiry?.inquiry_number} />
              <DetailRow label="物流场景" value={shipment.shipping_scenario === 'client_forwarder' ? '客户自货代' : '我方安排发货'} />
              <DetailRow label="运输方式" value={shipment.shipping_method} />
              {shipment.shipping_scenario === 'our_forwarder' && (
                <>
                  <DetailRow label="SO No." value={shipment.so_number} />
                  <DetailRow label="B/L No." value={shipment.bl_number} />
                  <DetailRow label="柜号" value={shipment.container_number} />
                  <DetailRow label="Carrier" value={shipment.carrier} />
                  <DetailRow label="Vessel/Voyage" value={shipment.vessel_voyage} />
                  <DetailRow label="装运港" value={shipment.port_of_loading} />
                  <DetailRow label="卸货港" value={shipment.port_of_discharge} />
                </>
              )}
              <DetailRow label="付款方式" value={shipment.payment_type} />
              <DetailRow label="订单金额" value={shipment.total_amount ? formatCurrency(shipment.total_amount, shipment.inquiry?.currency || 'USD') : undefined} />
              <DetailRow label="已收金额" value={shipment.paid_amount ? formatCurrency(shipment.paid_amount, shipment.inquiry?.currency || 'USD') : undefined} />
              <DetailRow label="尾款" value={shipment.balance_amount ? formatCurrency(shipment.balance_amount, shipment.inquiry?.currency || 'USD') : undefined} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== 工具函数 ======
const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}

function SectionTitle({ text, icon: Icon }: { text: string; icon: typeof Truck }) {
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

function fromDateInput(val: string | null): string | null {
  if (!val) return null;
  return new Date(val + 'T00:00:00').toISOString();
}
