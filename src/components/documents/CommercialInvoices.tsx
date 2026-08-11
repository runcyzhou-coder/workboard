import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Receipt, X, Edit2, Trash2, Printer, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateDocNumber, classNames, CURRENCIES, TRADE_TERMS, PAYMENT_TERMS } from '@/lib/utils';
import type { CommercialInvoice, CiItem, Customer, Product } from '@/lib/supabase';
import { DocHeader } from '@/components/documents/DocHeader';

const statusLabels: Record<string, string> = { draft: '草稿', sent: '已发送', confirmed: '已确认', cancelled: '已取消' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
};

export function CommercialInvoices() {
  const [cis, setCis] = useState<(CommercialInvoice & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CommercialInvoice | null>(null);
  const [viewing, setViewing] = useState<(CommercialInvoice & { customer?: Customer; items: CiItem[] }) | null>(null);
  const [form, setForm] = useState<Partial<CommercialInvoice>>({});
  const [items, setItems] = useState<Partial<CiItem>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('commercial_invoices').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setCis((data as (CommercialInvoice & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from('products').select('*').then(({ data }) => setProducts((data as Product[]) || []));
  }, [load]);

  const filtered = cis.filter(c => !search || c.ci_number.toLowerCase().includes(search.toLowerCase()) || (c.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!form.ci_number?.trim()) return;
    const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const total = subtotal + (form.freight || 0) + (form.insurance || 0) + (form.other_charges || 0);
    const payload = { ...form, subtotal, total_amount: total };
    if (editing) {
      await supabase.from('commercial_invoices').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await supabase.from('ci_items').delete().eq('ci_id', editing.id);
      const valid = items.filter(i => i.description?.trim());
      if (valid.length) await supabase.from('ci_items').insert(valid.map(i => ({ ...i, ci_id: editing.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
    } else {
      const { data } = await supabase.from('commercial_invoices').insert(payload).select('*').single();
      const newRow = data as CommercialInvoice;
      const valid = items.filter(i => i.description?.trim());
      if (valid.length && newRow) await supabase.from('ci_items').insert(valid.map(i => ({ ...i, ci_id: newRow.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
    }
    setShowForm(false); setEditing(null); setForm({}); setItems([]); load();
  }

  async function del(id: string) {
    if (!confirm('确定删除此商业发票？')) return;
    await supabase.from('ci_items').delete().eq('ci_id', id);
    await supabase.from('commercial_invoices').delete().eq('id', id); load();
  }

  async function view(ci: CommercialInvoice & { customer?: Customer }) {
    const { data } = await supabase.from('ci_items').select('*').eq('ci_id', ci.id).order('created_at', { ascending: true });
    setViewing({ ...ci, items: (data as CiItem[]) || [] });
  }

  function startAdd() {
    setEditing(null);
    setForm({ ci_number: generateDocNumber('CI'), status: 'draft', currency: 'USD', freight: 0, insurance: 0, other_charges: 0, payment_terms: 'T/T 30%', delivery_terms: 'FOB' });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]); setShowForm(true);
  }

  async function startEdit(ci: CommercialInvoice & { customer?: Customer }) {
    const { data } = await supabase.from('ci_items').select('*').eq('ci_id', ci.id).order('created_at', { ascending: true });
    setEditing(ci); setForm(ci); setItems((data as CiItem[]) || [{ description: '', quantity: 1, unit_price: 0 }]); setShowForm(true);
  }

  function addItem() { setItems([...items, { description: '', quantity: 1, unit_price: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof CiItem, value: string | number) { setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it)); }
  function selectProduct(idx: number, productId: string) {
    const p = products.find(p => p.id === productId);
    if (p) setItems(items.map((it, i) => i === idx ? { ...it, product_id: p.id, description: p.name, unit_price: p.selling_price } : it));
  }

  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const total = subtotal + (form.freight || 0) + (form.insurance || 0) + (form.other_charges || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">商业发票列表</h2><p className="text-sm text-slate-500 mt-0.5">正式结算凭证，用于报关清关和付款</p></div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"><Plus className="w-4 h-4" />新建商业发票</button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索发票编号、客户名称..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
      {loading ? <div className="text-center py-12 text-slate-400"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>加载中...</p></div>
        : filtered.length === 0 ? <div className="text-center py-12 text-slate-400"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>{search ? '没有匹配的商业发票' : '还没有商业发票，点击"新建商业发票"开始'}</p></div>
        : <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600"><th className="px-4 py-3 font-medium">发票编号</th><th className="px-4 py-3 font-medium">客户</th><th className="px-4 py-3 font-medium">日期</th><th className="px-4 py-3 font-medium">状态</th><th className="px-4 py-3 font-medium text-right">金额</th><th className="px-4 py-3 font-medium text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(ci => <tr key={ci.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{ci.ci_number}</td><td className="px-4 py-3 text-slate-600">{ci.customer?.company_name || '—'}</td><td className="px-4 py-3 text-slate-600">{formatDate(ci.created_at)}</td><td className="px-4 py-3"><span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[ci.status])}>{statusLabels[ci.status]}</span></td><td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(ci.total_amount, ci.currency)}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => view(ci)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></button><button onClick={() => startEdit(ci)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => del(ci.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div></div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10"><h2 className="text-lg font-semibold text-slate-900">{editing ? '编辑商业发票' : '新建商业发票'}</h2><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="发票编号 *"><input value={form.ci_number || ''} onChange={e => setForm({ ...form, ci_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="客户"><select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">选择客户</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></Field>
                <Field label="状态"><select value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value as CommercialInvoice['status'] })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="币种"><select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></Field>
                <Field label="贸易术语"><select value={form.delivery_terms || ''} onChange={e => setForm({ ...form, delivery_terms: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{TRADE_TERMS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}</select></Field>
                <Field label="付款条件"><select value={form.payment_terms || ''} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">{PAYMENT_TERMS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}</select></Field>
                <Field label="运输方式"><input value={form.shipping_method || ''} onChange={e => setForm({ ...form, shipping_method: e.target.value })} placeholder="海运/空运" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="起运国"><input value={form.origin_country || ''} onChange={e => setForm({ ...form, origin_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="目的国"><input value={form.destination_country || ''} onChange={e => setForm({ ...form, destination_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="装运港"><input value={form.port_of_loading || ''} onChange={e => setForm({ ...form, port_of_loading: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="卸货港"><input value={form.port_of_discharge || ''} onChange={e => setForm({ ...form, port_of_discharge: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="船名"><input value={form.vessel_name || ''} onChange={e => setForm({ ...form, vessel_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="提单号"><input value={form.bl_number || ''} onChange={e => setForm({ ...form, bl_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-slate-700">产品明细</h3><button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"><Plus className="w-3.5 h-3.5" />添加行</button></div>
                <div className="space-y-2">{items.map((item, idx) => <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-2 bg-slate-50 rounded-lg"><select value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)} className="w-full sm:w-40 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="">选择产品</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="描述" className="flex-1 w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" value={item.quantity || 0} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="数量" className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.01" value={item.unit_price || 0} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="单价" className="w-24 px-2 py-1.5 border border-slate-200 rounded text-xs" /><span className="text-xs font-medium text-slate-600 w-24 text-right">{formatCurrency((item.quantity || 0) * (item.unit_price || 0), form.currency || 'USD')}</span><button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>)}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <Field label="运费"><input type="number" step="0.01" value={form.freight ?? 0} onChange={e => setForm({ ...form, freight: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="保险"><input type="number" step="0.01" value={form.insurance ?? 0} onChange={e => setForm({ ...form, insurance: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="其他费用"><input type="number" step="0.01" value={form.other_charges ?? 0} onChange={e => setForm({ ...form, other_charges: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
              </div>
              <Field label="备注"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></Field>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600">小计</span><span className="font-medium">{formatCurrency(subtotal, form.currency || 'USD')}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">运费</span><span>{formatCurrency(form.freight || 0, form.currency || 'USD')}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">保险</span><span>{formatCurrency(form.insurance || 0, form.currency || 'USD')}</span></div><div className="flex justify-between text-sm"><span className="text-slate-600">其他</span><span>{formatCurrency(form.other_charges || 0, form.currency || 'USD')}</span></div><div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">总计</span><span className="text-blue-600">{formatCurrency(total, form.currency || 'USD')}</span></div></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">取消</button><button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">{editing ? '保存' : '创建'}</button></div>
          </div>
        </div>
      )}

      {viewing && <CiViewModal ci={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CiViewModal({ ci, onClose }: { ci: CommercialInvoice & { customer?: Customer; items: CiItem[] }; onClose: () => void }) {
  const subtotal = ci.items.reduce((s, i) => s + i.total, 0);
  const total = subtotal + ci.freight + ci.insurance + ci.other_charges;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden"><div className="flex items-center gap-3"><button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-lg font-semibold text-slate-900">预览商业发票</h2></div><button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"><Printer className="w-4 h-4" />打印 / PDF</button></div>
        <div className="p-8 print:p-10" id="pi-document">
          <DocHeader title="COMMERCIAL INVOICE" docNumber={ci.ci_number} />
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-lg p-4"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Sold To (买方)</p><p className="text-sm font-medium text-slate-900">{ci.customer?.company_name || '—'}</p>{ci.customer?.address && <p className="text-sm text-slate-600">{ci.customer.address}</p>}<p className="text-sm text-slate-600">{ci.customer?.country || ''}</p>{ci.customer?.email && <p className="text-sm text-slate-600">{ci.customer.email}</p>}</div>
            <div className="bg-slate-50 rounded-lg p-4"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Invoice Details</p><div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-slate-500">日期:</span><span className="text-slate-900">{formatDate(ci.created_at)}</span></div><div className="flex justify-between"><span className="text-slate-500">贸易术语:</span><span className="text-slate-900">{ci.delivery_terms || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">付款条件:</span><span className="text-slate-900">{ci.payment_terms || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">运输方式:</span><span className="text-slate-900">{ci.shipping_method || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">起运港:</span><span className="text-slate-900">{ci.port_of_loading || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">卸货港:</span><span className="text-slate-900">{ci.port_of_discharge || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">船名:</span><span className="text-slate-900">{ci.vessel_name || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">提单号:</span><span className="text-slate-900">{ci.bl_number || '—'}</span></div></div></div>
          </div>
          <table className="w-full text-sm mb-6"><thead><tr className="bg-slate-900 text-white"><th className="px-3 py-2 text-left font-medium rounded-l">序号</th><th className="px-3 py-2 text-left font-medium">Description</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Unit Price</th><th className="px-3 py-2 text-right font-medium rounded-r">Amount</th></tr></thead><tbody>{ci.items.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-slate-400">无明细</td></tr> : ci.items.map((item, idx) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2.5 text-slate-500">{idx + 1}</td><td className="px-3 py-2.5 text-slate-900">{item.description}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.quantity}</td><td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(item.unit_price, ci.currency)}</td><td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatCurrency(item.total, ci.currency)}</td></tr>)}</tbody></table>
          <div className="flex justify-end mb-6"><div className="w-64 space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="text-slate-900">{formatCurrency(subtotal, ci.currency)}</span></div>{ci.freight > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Freight</span><span className="text-slate-900">{formatCurrency(ci.freight, ci.currency)}</span></div>}{ci.insurance > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Insurance</span><span className="text-slate-900">{formatCurrency(ci.insurance, ci.currency)}</span></div>}{ci.other_charges > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Other Charges</span><span className="text-slate-900">{formatCurrency(ci.other_charges, ci.currency)}</span></div>}<div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Total</span><span className="text-blue-600">{formatCurrency(total, ci.currency)}</span></div></div></div>
          {ci.notes && <div className="mb-6"><p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p><p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{ci.notes}</p></div>}
          <div className="grid grid-cols-2 gap-6 mt-8"><div><p className="text-xs font-semibold text-slate-400 uppercase mb-8">Seller's Signature</p><div className="border-t border-slate-300 pt-2 text-xs text-slate-500">Authorized Signature</div></div><div><p className="text-xs font-semibold text-slate-400 uppercase mb-8">Buyer's Signature</p><div className="border-t border-slate-300 pt-2 text-xs text-slate-500">Authorized Signature</div></div></div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}
