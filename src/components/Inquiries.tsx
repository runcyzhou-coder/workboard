import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Inbox, FileText, Receipt, Handshake,
  ClipboardCheck, Package2, Quote, ChevronDown, ChevronUp, ArrowRight,
  Mail, Phone, MapPin, Calendar, DollarSign, Tag,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames, formatDate, generateDocNumber, formatCurrency, CURRENCIES, TRADE_TERMS, PAYMENT_TERMS } from '@/lib/utils';
import type { Inquiry, InquiryItem, Customer } from '@/lib/supabase';

const statusOptions: { value: Inquiry['status']; label: string; color: string }[] = [
  { value: 'new', label: '新询盘', color: 'bg-blue-100 text-blue-700' },
  { value: 'quoted', label: '已报价', color: 'bg-amber-100 text-amber-700' },
  { value: 'in_progress', label: '进行中', color: 'bg-purple-100 text-purple-700' },
  { value: 'closed', label: '已成交', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost', label: '已丢失', color: 'bg-slate-100 text-slate-500' },
];

const sourceOptions = ['官网询盘', '阿里巴巴', '展会', '老客户', '主动开发', '邮件', '电话', '其他'];

interface GenerateResult {
  type: string;
  number: string;
  success: boolean;
  message: string;
}

export function Inquiries({ onNavigateDoc }: { onNavigateDoc?: (docType: string) => void } = {}) {
  const [inquiries, setInquiries] = useState<(Inquiry & { customer?: Customer })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Inquiry | null>(null);
  const [form, setForm] = useState<Partial<Inquiry>>({});
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [genModal, setGenModal] = useState<{ inquiry: Inquiry; customer?: Customer } | null>(null);
  const [genResults, setGenResults] = useState<GenerateResult[]>([]);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('inquiries').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setInquiries((data as (Inquiry & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
  }, [load]);

  const filtered = useMemo(() => inquiries.filter(q => {
    const matchSearch = !search ||
      q.inquiry_number.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      (q.customer?.company_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchSearch && matchStatus;
  }), [inquiries, search, filterStatus]);

  function startAdd() {
    setEditing(null);
    setForm({
      inquiry_number: generateDocNumber('INQ'),
      status: 'new',
      currency: 'USD',
      source: '官网询盘',
      expected_quantity: 0,
      expected_amount: 0,
      items: [],
    });
    setItems([{ product_name: '', description: '', quantity: 1, unit: 'piece', unit_price: 0, total: 0 }]);
    setShowForm(true);
  }

  function startEdit(q: Inquiry & { customer?: Customer }) {
    setEditing(q);
    setForm({
      inquiry_number: q.inquiry_number,
      customer_id: q.customer_id,
      subject: q.subject,
      status: q.status,
      source: q.source,
      currency: q.currency,
      delivery_country: q.delivery_country,
      delivery_terms: q.delivery_terms,
      payment_terms: q.payment_terms,
      valid_until: q.valid_until,
      notes: q.notes,
    });
    const loadedItems = (q.items && q.items.length > 0) ? q.items : [{ product_name: '', description: '', quantity: 1, unit: 'piece', unit_price: 0, total: 0 }];
    // 确保每条明细的 total 按数量*单价重新计算，不依赖历史数据
    setItems(loadedItems.map(i => ({
      product_name: i.product_name || '',
      description: i.description || '',
      quantity: Number(i.quantity) || 0,
      unit: i.unit || 'piece',
      unit_price: Number(i.unit_price) || 0,
      total: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    })));
    setShowForm(true);
  }

  async function save() {
    if (!form.inquiry_number?.trim() || !form.subject?.trim()) return;
    // 过滤空行，并强制按 quantity*unit_price 重算 total，避免前端未同步导致的旧 total 被保存
    const validItems = items
      .filter(i => (i.product_name || '').trim() || (i.description || '').trim())
      .map(i => ({
        product_name: i.product_name || '',
        description: i.description || '',
        quantity: Number(i.quantity) || 0,
        unit: i.unit || 'piece',
        unit_price: Number(i.unit_price) || 0,
        total: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
      }));
    const computedQty = validItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const computedAmount = validItems.reduce((s, i) => s + (i.total || 0), 0);

    // 只提交需要的字段，不把历史 DB 字段（如 id、created_at 等）带进去
    const payload: Partial<Inquiry> = {
      inquiry_number: form.inquiry_number,
      customer_id: form.customer_id ?? null,
      subject: form.subject,
      status: form.status || 'new',
      source: form.source ?? null,
      currency: form.currency || 'USD',
      delivery_country: form.delivery_country ?? null,
      delivery_terms: form.delivery_terms ?? null,
      payment_terms: form.payment_terms ?? null,
      valid_until: form.valid_until ?? null,
      notes: form.notes ?? null,
      items: validItems,
      expected_quantity: computedQty,
      expected_amount: computedAmount,
    };

    if (editing) {
      await supabase.from('inquiries').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('inquiries').insert(payload);
    }
    setShowForm(false); setEditing(null); setForm({}); setItems([]);
    load();
  }

  async function remove(id: string) {
    if (!confirm('确定删除此询盘？关联的售后单不会被删除。')) return;
    await supabase.from('inquiries').delete().eq('id', id);
    load();
  }

  // ============== 一键生成单据 ==============
  async function generateDocuments(inquiry: Inquiry, customer?: Customer, types: string[] = ['quotation']) {
    setGenerating(true);
    setGenResults([]);
    const results: GenerateResult[] = [];
    const itemsData = (inquiry.items || []).map(i => ({
      description: i.product_name + (i.description ? ' - ' + i.description : ''),
      quantity: i.quantity || 1,
      unit_price: i.unit_price || 0,
      total: (i.quantity || 0) * (i.unit_price || 0),
    }));
    const subtotal = itemsData.reduce((s, i) => s + i.total, 0);
    const customerId = inquiry.customer_id;

    for (const type of types) {
      try {
        let tableName = '', itemsTable = '', itemsFk = '', numberField = '', prefix = '';
        if (type === 'quotation') { tableName = 'quotations'; itemsTable = 'quotation_items'; itemsFk = 'quotation_id'; numberField = 'quote_number'; prefix = 'QT'; }
        else if (type === 'pi') { tableName = 'proforma_invoices'; itemsTable = 'pi_items'; itemsFk = 'pi_id'; numberField = 'pi_number'; prefix = 'PI'; }
        else if (type === 'ci') { tableName = 'commercial_invoices'; itemsTable = 'ci_items'; itemsFk = 'ci_id'; numberField = 'ci_number'; prefix = 'CI'; }
        else if (type === 'contract') { tableName = 'contracts'; itemsTable = 'contract_items'; itemsFk = 'contract_id'; numberField = 'contract_number'; prefix = 'SC'; }

        const docNumber = generateDocNumber(prefix);

        const basePayload: any = {
          [numberField]: docNumber,
          customer_id: customerId,
          status: type === 'contract' ? 'draft' : (type === 'quotation' ? 'draft' : 'draft'),
          currency: inquiry.currency || 'USD',
          notes: `由询盘 ${inquiry.inquiry_number} 自动生成`,
        };

        // 报价单字段
        if (type === 'quotation') {
          basePayload.total_amount = subtotal;
          basePayload.valid_until = inquiry.valid_until;
        }
        // PI / CI
        if (type === 'pi' || type === 'ci') {
          basePayload.subtotal = subtotal;
          basePayload.freight = 0;
          basePayload.insurance = 0;
          basePayload.other_charges = 0;
          basePayload.total_amount = subtotal;
          basePayload.payment_terms = inquiry.payment_terms;
          basePayload.delivery_terms = inquiry.delivery_terms;
          basePayload.destination_country = inquiry.delivery_country;
          basePayload.valid_until = inquiry.valid_until;
        }
        // 合同
        if (type === 'contract') {
          basePayload.subtotal = subtotal;
          basePayload.total_amount = subtotal;
          basePayload.payment_terms = inquiry.payment_terms;
          basePayload.delivery_terms = inquiry.delivery_terms;
          basePayload.destination_country = inquiry.delivery_country;
        }

        const { data, error } = await supabase.from(tableName).insert(basePayload).select('*').single();
        if (error) throw error;
        const docId = (data as any)?.id;
        if (docId && itemsData.length > 0) {
          await supabase.from(itemsTable).insert(itemsData.map(i => ({ ...i, [itemsFk]: docId })));
        }
        const label = type === 'quotation' ? '报价单' : type === 'pi' ? '形式发票' : type === 'ci' ? '商业发票' : '合同';
        results.push({ type, number: docNumber, success: true, message: `${label} ${docNumber} 已生成` });
      } catch (err: any) {
        const label = type === 'quotation' ? '报价单' : type === 'pi' ? '形式发票' : type === 'ci' ? '商业发票' : '合同';
        results.push({ type, number: '', success: false, message: `${label}生成失败：${err?.message || '未知错误'}` });
      }
    }

    // 更新询盘状态为已报价
    if (results.some(r => r.success) && inquiry.status === 'new') {
      await supabase.from('inquiries').update({ status: 'quoted', updated_at: new Date().toISOString() }).eq('id', inquiry.id);
    }

    setGenResults(results);
    setGenerating(false);
    load();
  }

  const totalAmount = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  if (showForm) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{editing ? '编辑询盘' : '新建询盘'}</h1>
          <button onClick={() => { setShowForm(false); setEditing(null); setForm({}); setItems([]); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="询盘编号 *">
              <input value={form.inquiry_number || ''} onChange={e => setForm({ ...form, inquiry_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="主题 *">
              <input value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="如：Industrial Fans Inquiry"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="关联客户">
              <select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— 不关联 —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}{c.contact_name ? ` (${c.contact_name})` : ''}</option>)}
              </select>
            </Field>
            <Field label="来源">
              <select value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="状态">
              <select value={form.status || 'new'} onChange={e => setForm({ ...form, status: e.target.value as Inquiry['status'] })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="币种">
              <select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
              </select>
            </Field>
            <Field label="交付国家">
              <input value={form.delivery_country || ''} onChange={e => setForm({ ...form, delivery_country: e.target.value })}
                placeholder="如：UAE / USA / Germany"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="有效期">
              <input type="date" value={form.valid_until || ''} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="贸易条款">
              <select value={form.delivery_terms || ''} onChange={e => setForm({ ...form, delivery_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— 选择 —</option>
                {TRADE_TERMS.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
              </select>
            </Field>
            <Field label="付款条件">
              <select value={form.payment_terms || ''} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— 选择 —</option>
                {PAYMENT_TERMS.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="询盘产品明细">
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <input value={it.product_name} onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, product_name: e.target.value } : x))}
                    placeholder="产品名"
                    className="col-span-3 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input value={it.description} onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                    placeholder="规格描述"
                    className="col-span-3 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="number" value={it.quantity} onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value), total: Number(e.target.value) * (x.unit_price || 0) } : x))}
                    placeholder="数量" className="col-span-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input value={it.unit} onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))}
                    placeholder="单位" className="col-span-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="number" value={it.unit_price} onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value), total: (x.quantity || 0) * Number(e.target.value) } : x))}
                    placeholder="单价" className="col-span-2 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <div className="col-span-1 px-2 py-1.5 text-sm text-slate-700 text-right">{((it.quantity || 0) * (it.unit_price || 0)).toLocaleString()}</div>
                  <button onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))} className="col-span-1 p-1.5 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setItems([...items, { product_name: '', description: '', quantity: 1, unit: 'piece', unit_price: 0, total: 0 }])}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
                <Plus className="w-4 h-4" />添加产品行
              </button>
              <div className="flex justify-end gap-6 pt-2 border-t border-slate-100">
                <div className="text-sm text-slate-500">总数量: <span className="font-semibold text-slate-900">{totalQty}</span></div>
                <div className="text-sm text-slate-500">总金额: <span className="font-semibold text-slate-900">{formatCurrency(totalAmount, form.currency || 'USD')}</span></div>
              </div>
            </div>
          </Field>

          <Field label="备注">
            <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3} placeholder="客户特殊要求、技术细节等"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => { setShowForm(false); setEditing(null); setForm({}); setItems([]); }}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">取消</button>
          <button onClick={save} disabled={!form.inquiry_number?.trim() || !form.subject?.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium text-sm">
            {editing ? '保存修改' : '创建询盘'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">询盘管理</h1>
          <p className="text-slate-500 mt-0.5 text-sm">管理客户询价、自动生成单据</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" />新建询盘
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索询盘编号、主题、客户..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">全部状态</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{inquiries.length === 0 ? '还没有询盘，点击右上角新建第一条' : '没有匹配的询盘'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => {
            const isExpanded = expanded === q.id;
            const statusInfo = statusOptions.find(s => s.value === q.status);
            const totalAmt = (q.items || []).reduce((s, i) => s + (i.total || 0), 0);
            const totalQty = (q.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <button onClick={() => setExpanded(isExpanded ? null : q.id)} className="p-1 text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{q.inquiry_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusInfo?.color}`}>{statusInfo?.label}</span>
                      {q.source && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[11px]">{q.source}</span>}
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-1 truncate">{q.subject}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                      {q.customer && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{q.customer.company_name}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(q.created_at)}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(totalAmt, q.currency)}</span>
                      <span>数量 {totalQty}</span>
                      {(q.items || []).length > 0 && <span>{(q.items || []).length} 个产品</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(q)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="编辑">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(q.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setGenModal({ inquiry: q, customer: q.customer })}
                      className="ml-2 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 text-xs font-medium">
                      <FileText className="w-3.5 h-3.5" />生成单据
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {q.delivery_country && <div><span className="text-slate-400">交付国家:</span> <span className="font-medium text-slate-700">{q.delivery_country}</span></div>}
                      {q.delivery_terms && <div><span className="text-slate-400">贸易条款:</span> <span className="font-medium text-slate-700">{q.delivery_terms}</span></div>}
                      {q.payment_terms && <div><span className="text-slate-400">付款条件:</span> <span className="font-medium text-slate-700">{q.payment_terms}</span></div>}
                      {q.valid_until && <div><span className="text-slate-400">有效期:</span> <span className="font-medium text-slate-700">{formatDate(q.valid_until)}</span></div>}
                    </div>
                    {(q.items || []).length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-200">
                              <th className="py-1.5 pr-3">产品</th>
                              <th className="py-1.5 pr-3">规格</th>
                              <th className="py-1.5 pr-3 text-right">数量</th>
                              <th className="py-1.5 pr-3">单位</th>
                              <th className="py-1.5 pr-3 text-right">单价</th>
                              <th className="py-1.5 text-right">小计</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(q.items || []).map((it, i) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="py-1.5 pr-3 font-medium text-slate-700">{it.product_name}</td>
                                <td className="py-1.5 pr-3 text-slate-500">{it.description}</td>
                                <td className="py-1.5 pr-3 text-right">{it.quantity}</td>
                                <td className="py-1.5 pr-3 text-slate-500">{it.unit}</td>
                                <td className="py-1.5 pr-3 text-right">{formatCurrency(it.unit_price, q.currency)}</td>
                                <td className="py-1.5 text-right font-medium">{formatCurrency(it.total, q.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {q.notes && <div className="text-xs text-slate-500 bg-white rounded p-2 border border-slate-100"><span className="text-slate-400">备注：</span>{q.notes}</div>}
                    {q.customer && (
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {q.customer.contact_name && <span>联系人: {q.customer.contact_name}</span>}
                        {q.customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{q.customer.email}</span>}
                        {q.customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{q.customer.phone}</span>}
                        {q.customer.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{q.customer.country}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 生成单据弹窗 */}
      {genModal && (
        <GenerateDocsModal
          inquiry={genModal.inquiry}
          customer={genModal.customer}
          onClose={() => { setGenModal(null); setGenResults([]); }}
          onGenerate={(types) => generateDocuments(genModal.inquiry, genModal.customer, types)}
          onNavigateDoc={onNavigateDoc}
          generating={generating}
          results={genResults}
        />
      )}
    </div>
  );
}

interface GenerateDocsModalProps {
  inquiry: Inquiry;
  customer?: Customer;
  onClose: () => void;
  onGenerate: (types: string[]) => void;
  onNavigateDoc?: (docType: string) => void;
  generating: boolean;
  results: GenerateResult[];
}

function GenerateDocsModal({ inquiry, customer, onClose, onGenerate, onNavigateDoc, generating, results }: GenerateDocsModalProps) {
  const [selected, setSelected] = useState<string[]>(['quotation']);

  const docOptions = [
    { id: 'quotation', label: '报价单', english: 'Quotation', icon: Quote, color: 'text-cyan-600' },
    { id: 'pi', label: '形式发票', english: 'Proforma Invoice', icon: FileText, color: 'text-violet-600' },
    { id: 'ci', label: '商业发票', english: 'Commercial Invoice', icon: Receipt, color: 'text-blue-600' },
    { id: 'contract', label: '销售合同', english: 'Sales Contract', icon: Handshake, color: 'text-emerald-600' },
  ];

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  const totalAmt = (inquiry.items || []).reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">一键生成单据</h2>
            <p className="text-xs text-slate-500 mt-0.5">从询盘 {inquiry.inquiry_number} 自动生成</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* 询盘摘要 */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">主题</span><span className="font-medium text-slate-700">{inquiry.subject}</span></div>
            {customer && <div className="flex justify-between"><span className="text-slate-400">客户</span><span className="font-medium text-slate-700">{customer.company_name}</span></div>}
            <div className="flex justify-between"><span className="text-slate-400">总金额</span><span className="font-medium text-slate-700">{formatCurrency(totalAmt, inquiry.currency)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">产品数</span><span className="font-medium text-slate-700">{(inquiry.items || []).length} 项</span></div>
          </div>

          {!customer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
              ⚠️ 该询盘未关联客户，生成的单据中客户信息将为空，请在单据中心手动补充
            </div>
          )}

          {results.length === 0 ? (
            <>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">选择要生成的单据类型</p>
                <div className="grid grid-cols-2 gap-2">
                  {docOptions.map(opt => {
                    const Icon = opt.icon;
                    const isSel = selected.includes(opt.id);
                    return (
                      <button key={opt.id} onClick={() => toggle(opt.id)}
                        className={classNames(
                          'flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all',
                          isSel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        )}>
                        <Icon className={classNames('w-5 h-5', opt.color)} />
                        <div>
                          <div className="text-sm font-medium text-slate-900">{opt.label}</div>
                          <div className="text-[10px] text-slate-400">{opt.english}</div>
                        </div>
                        {isSel && <CheckIcon className="w-4 h-4 text-blue-600 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                ✨ 生成后会自动填充：客户信息、币种、产品明细、单价、数量、贸易条款、付款条件等字段
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={classNames(
                  'flex items-center gap-2 p-3 rounded-lg text-sm',
                  r.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                )}>
                  {r.success ? '✅' : '❌'} <span className="flex-1">{r.message}</span>
                  {r.success && onNavigateDoc && (
                    <button
                      onClick={() => { onNavigateDoc(r.type); onClose(); }}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
                      title="跳转到单据中心查看"
                    >
                      查看 <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {r.success && !onNavigateDoc && r.number && <ArrowRight className="w-3.5 h-3.5" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
          {results.length > 0 ? (
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">完成</button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">取消</button>
              <button onClick={() => onGenerate(selected)} disabled={selected.length === 0 || generating}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 font-medium text-sm flex items-center gap-2">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...</>
                ) : (
                  <>生成 {selected.length} 份单据</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}
