import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Headphones, Inbox, AlertCircle, CheckCircle,
  Clock, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames, formatDate, generateDocNumber, formatDateTime } from '@/lib/utils';
import type { AfterSale, Inquiry, Customer } from '@/lib/supabase';

const typeOptions: { value: AfterSale['type']; label: string; color: string }[] = [
  { value: 'complaint', label: '投诉', color: 'bg-[#3A1F1F]/80 text-[#F87171]' },
  { value: 'quality', label: '质量问题', color: 'bg-[#3A2D54]/60 text-[#F87171]' },
  { value: 'shipping', label: '物流问题', color: 'bg-[#3A2D54]/40 text-[#D8B4FE]' },
  { value: 'payment', label: '付款问题', color: 'bg-[#3A2D54]/60 text-[#D8B4FE]' },
  { value: 'technical', label: '技术支持', color: 'bg-[#161228]/70 text-[#06B6D4]' },
  { value: 'other', label: '其他', color: 'bg-[#161228]/70 text-[#8879A0]' },
];

const priorityOptions: { value: AfterSale['priority']; label: string; color: string }[] = [
  { value: 'urgent', label: '紧急', color: 'bg-red-600 text-white' },
  { value: 'high', label: '高', color: 'bg-[#3A2D54]/600 text-white' },
  { value: 'medium', label: '中', color: 'bg-amber-400 text-white' },
  { value: 'low', label: '低', color: 'bg-[#8879A0] text-white' },
];

const statusOptions: { value: AfterSale['status']; label: string; color: string }[] = [
  { value: 'open', label: '待处理', color: 'bg-[#161228]/70 text-[#06B6D4]' },
  { value: 'processing', label: '处理中', color: 'bg-[#3A2D54]/40 text-[#D8B4FE]' },
  { value: 'resolved', label: '已解决', color: 'bg-[#221A3A]/70 text-[#A855F7]' },
  { value: 'closed', label: '已关闭', color: 'bg-[#221A3A]/50 text-[#8879A0]' },
];

export function AfterSales() {
  const [tickets, setTickets] = useState<(AfterSale & { inquiry?: Inquiry; customer?: Customer })[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AfterSale | null>(null);
  const [form, setForm] = useState<Partial<AfterSale>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('after_sales')
      .select('*, inquiry:inquiries(*), customer:customers(*)')
      .order('created_at', { ascending: false });
    setTickets((data as (AfterSale & { inquiry?: Inquiry; customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('inquiries').select('*').order('created_at', { ascending: false }).then(({ data }) => setInquiries((data as Inquiry[]) || []));
    supabase.from('customers').select('*').order('created_at', { ascending: false }).then(({ data }) => setCustomers((data as Customer[]) || []));
  }, [load]);

  const filtered = useMemo(() => tickets.filter(t => {
    const matchSearch = !search ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.inquiry?.inquiry_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  }), [tickets, search, filterStatus, filterPriority]);

  function startAdd() {
    setEditing(null);
    setForm({
      ticket_number: generateDocNumber('AS'),
      type: 'complaint',
      priority: 'medium',
      status: 'open',
    });
    setShowForm(true);
  }

  function startEdit(t: AfterSale) {
    setEditing(t);
    setForm(t);
    setShowForm(true);
  }

  async function save() {
    if (!form.ticket_number?.trim() || !form.subject?.trim()) return;
    const payload: Partial<AfterSale> = { ...form };
    // 关联询盘时自动带出客户
    if (form.inquiry_id) {
      const inq = inquiries.find(i => i.id === form.inquiry_id);
      if (inq && !payload.customer_id) {
        payload.customer_id = inq.customer_id;
      }
    }
    if (editing) {
      const updatePayload = { ...payload, updated_at: new Date().toISOString() };
      if (payload.status === 'resolved' && !editing.resolved_at) {
        updatePayload.resolved_at = new Date().toISOString();
      }
      await supabase.from('after_sales').update(updatePayload).eq('id', editing.id);
    } else {
      await supabase.from('after_sales').insert(payload);
    }
    setShowForm(false); setEditing(null); setForm({});
    load();
  }

  async function remove(id: string) {
    if (!confirm('确定删除此售后工单？')) return;
    await supabase.from('after_sales').delete().eq('id', id);
    load();
  }

  async function quickStatusChange(t: AfterSale, newStatus: AfterSale['status']) {
    const payload: Partial<AfterSale> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'resolved' && !t.resolved_at) {
      payload.resolved_at = new Date().toISOString();
    }
    await supabase.from('after_sales').update(payload).eq('id', t.id);
    load();
  }

  // 统计卡片
  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    processing: tickets.filter(t => t.status === 'processing').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length,
  }), [tickets]);

  if (showForm) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#F3EFE6]">{editing ? '编辑售后工单' : '新建售后工单'}</h1>
          <button onClick={() => { setShowForm(false); setEditing(null); setForm({}); }} className="text-[#78716C] hover:text-[#B8AEC8]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="工单编号 *">
              <input value={form.ticket_number || ''} onChange={e => setForm({ ...form, ticket_number: e.target.value })}
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
            </Field>
            <Field label="主题 *">
              <input value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="如：客户反馈到货商品有破损"
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
            </Field>
            <Field label="关联询盘">
              <select value={form.inquiry_id || ''} onChange={e => setForm({ ...form, inquiry_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
                <option value="">— 不关联 —</option>
                {inquiries.map(i => <option key={i.id} value={i.id}>{i.inquiry_number} - {i.subject}</option>)}
              </select>
            </Field>
            <Field label="关联客户">
              <select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
                <option value="">— 不关联 —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}{c.contact_name ? ` (${c.contact_name})` : ''}</option>)}
              </select>
            </Field>
            <Field label="问题类型">
              <select value={form.type || 'complaint'} onChange={e => setForm({ ...form, type: e.target.value as AfterSale['type'] })}
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="优先级">
              <select value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value as AfterSale['priority'] })}
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
                {priorityOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="处理状态">
              <select value={form.status || 'open'} onChange={e => setForm({ ...form, status: e.target.value as AfterSale['status'] })}
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="处理人">
              <input value={form.handler || ''} onChange={e => setForm({ ...form, handler: e.target.value })}
                placeholder="负责人姓名"
                className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
            </Field>
          </div>

          <Field label="问题描述">
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4} placeholder="详细描述客户反馈的问题、发生时间、影响范围等"
              className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
          </Field>

          <Field label="处理方案">
            <textarea value={form.resolution || ''} onChange={e => setForm({ ...form, resolution: e.target.value })}
              rows={3} placeholder="采取的处理措施、补偿方案、客户反馈等"
              className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => { setShowForm(false); setEditing(null); setForm({}); }}
            className="px-4 py-2 text-[#B8AEC8] hover:text-[#F3EFE6] font-medium text-sm">取消</button>
          <button onClick={save} disabled={!form.ticket_number?.trim() || !form.subject?.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#6B21A8] to-[#4C1D95] text-[#F3EFE6] rounded-lg hover:bg-[#4C1D95] disabled:opacity-40 font-medium text-sm">
            {editing ? '保存修改' : '创建工单'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F3EFE6]">售后处理</h1>
          <p className="text-[#8879A0] mt-0.5 text-sm">处理客户售后问题、投诉和反馈</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#6B21A8] to-[#4C1D95] text-[#F3EFE6] rounded-lg hover:bg-[#4C1D95] transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" />新建工单
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="总工单" value={stats.total} color="bg-[#221A3A]/50 text-[#F3EFE6]" />
        <StatCard label="待处理" value={stats.open} color="bg-[#161228]/70 text-[#06B6D4]" />
        <StatCard label="处理中" value={stats.processing} color="bg-[#3A2D54]/40 text-[#D8B4FE]" />
        <StatCard label="已解决" value={stats.resolved} color="bg-[#221A3A]/70 text-[#A855F7]" />
        <StatCard label="紧急未结" value={stats.urgent} color="bg-[#3A1F1F]/80 text-[#F87171]" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索工单号、主题、客户、询盘..."
            className="w-full pl-10 pr-4 py-2 bg-[#1B142C]/90 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#1B142C]/90 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
          <option value="all">全部状态</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 bg-[#1B142C]/90 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]">
          <option value="all">全部优先级</option>
          {priorityOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#78716C]">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54]">
          <Headphones className="w-12 h-12 text-[#B8AEC8] mx-auto mb-3" />
          <p className="text-[#8879A0]">{tickets.length === 0 ? '还没有售后工单，点击右上角新建第一条' : '没有匹配的工单'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const typeInfo = typeOptions.find(o => o.value === t.type);
            const priorityInfo = priorityOptions.find(o => o.value === t.priority);
            const statusInfo = statusOptions.find(o => o.value === t.status);
            return (
              <div key={t.id} className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-4">
                <div className="flex items-start gap-4">
                  <div className="relative z-10 flex flex-col gap-1 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded text-[11px] font-medium', priorityInfo?.color)}>{priorityInfo?.label}</span>
                    <span className={classNames('px-2 py-0.5 rounded text-[11px] font-medium', typeInfo?.color)}>{typeInfo?.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-[#8879A0]">{t.ticket_number}</span>
                      <span className={classNames('px-2 py-0.5 rounded text-[11px] font-medium', statusInfo?.color)}>{statusInfo?.label}</span>
                    </div>
                    <h3 className="font-semibold text-[#F3EFE6] mt-1">{t.subject}</h3>
                    {t.description && <p className="text-sm text-[#8879A0] mt-1 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#8879A0] flex-wrap">
                      {t.customer && <span>客户: {t.customer.company_name}</span>}
                      {t.inquiry && <span className="flex items-center gap-1"><Inbox className="w-3 h-3" />{t.inquiry.inquiry_number}</span>}
                      {t.handler && <span>处理人: {t.handler}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(t.created_at)}</span>
                      {t.resolved_at && <span className="flex items-center gap-1 text-[#A855F7]"><CheckCircle className="w-3 h-3" />{formatDateTime(t.resolved_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.status !== 'resolved' && t.status !== 'closed' && (
                      <button onClick={() => quickStatusChange(t, 'resolved')}
                        className="px-2.5 py-1.5 text-xs text-[#A855F7] bg-[#221A3A]/60 hover:bg-[#221A3A]/70 rounded-lg font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />标记已解决
                      </button>
                    )}
                    <button onClick={() => startEdit(t)} className="p-2 text-[#78716C] hover:text-[#06B6D4] hover:bg-[#161228]/70 rounded-lg" title="编辑">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(t.id)} className="p-2 text-[#78716C] hover:text-[#F87171] hover:bg-[#3A1F1F]/80 rounded-lg" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {t.resolution && (
                  <div className="mt-3 pt-3 border-t border-[#3A2D54]/50 text-xs">
                    <span className="text-[#78716C]">处理方案：</span>
                    <span className="text-[#F3EFE6]">{t.resolution}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-3">
      <div className={classNames('inline-block px-2 py-0.5 rounded text-[11px] font-medium mb-1', color)}>{label}</div>
      <div className="text-2xl font-bold text-[#F3EFE6]">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-[#F3EFE6] mb-1.5">{label}</label>{children}</div>;
}
