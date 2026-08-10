import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, FileText, X, Edit2, Trash2, Printer, Eye,
  ArrowLeft, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateDocNumber, classNames, CURRENCIES, TRADE_TERMS, PAYMENT_TERMS } from '@/lib/utils';
import type { ProformaInvoice, PiItem, Customer, Product } from '@/lib/supabase';
import { DocHeader } from '@/components/documents/DocHeader';

const statusLabels: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', confirmed: 'Confirmed', cancelled: 'Cancelled',
};
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
};

export function ProformaInvoices() {
  const [pis, setPis] = useState<(ProformaInvoice & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPI, setEditingPI] = useState<ProformaInvoice | null>(null);
  const [viewingPI, setViewingPI] = useState<(ProformaInvoice & { customer?: Customer; items: PiItem[] }) | null>(null);
  const [form, setForm] = useState<Partial<ProformaInvoice>>({});
  const [items, setItems] = useState<Partial<PiItem>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('proforma_invoices').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setPis((data as (ProformaInvoice & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from('products').select('*').then(({ data }) => setProducts((data as Product[]) || []));
  }, [load]);

  const filtered = pis.filter(p =>
    !search || p.pi_number.toLowerCase().includes(search.toLowerCase()) ||
    (p.customer?.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  function recalcItems(its: Partial<PiItem>[]): { subtotal: number; total: number } {
    const subtotal = its.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    return { subtotal, total: 0 };
  }

  async function savePI() {
    if (!form.pi_number?.trim()) return;
    const calc = recalcItems(items);
    const subtotal = calc.subtotal;
    const discount = form.discount || 0;
    const freight = form.freight || 0;
    const insurance = form.insurance || 0;
    const other = form.other_charges || 0;
    const total = subtotal - discount + freight + insurance + other;

    const payload = { ...form, subtotal, total_amount: total };

    if (editingPI) {
      await supabase.from('proforma_invoices').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingPI.id);
      await supabase.from('pi_items').delete().eq('pi_id', editingPI.id);
      const validItems = items.filter(i => i.description?.trim());
      if (validItems.length > 0) {
        await supabase.from('pi_items').insert(validItems.map(i => ({ ...i, pi_id: editingPI.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
      }
    } else {
      const { data } = await supabase.from('proforma_invoices').insert(payload).select('*').single();
      const newPI = data as ProformaInvoice;
      const validItems = items.filter(i => i.description?.trim());
      if (validItems.length > 0 && newPI) {
        await supabase.from('pi_items').insert(validItems.map(i => ({ ...i, pi_id: newPI.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
      }
    }
    setShowForm(false); setEditingPI(null); setForm({}); setItems([]);
    load();
  }

  async function deletePI(id: string) {
    if (!confirm('确定删除此形式发票？')) return;
    await supabase.from('pi_items').delete().eq('pi_id', id);
    await supabase.from('proforma_invoices').delete().eq('id', id);
    load();
  }

  async function viewPI(pi: ProformaInvoice & { customer?: Customer }) {
    const { data: itemsData } = await supabase.from('pi_items').select('*').eq('pi_id', pi.id).order('created_at', { ascending: true });
    setViewingPI({ ...pi, items: (itemsData as PiItem[]) || [] });
  }

  function startAdd() {
    setEditingPI(null);
    setForm({
      pi_number: generateDocNumber('PI'),
      status: 'draft', currency: 'USD', discount: 0, freight: 0, insurance: 0, other_charges: 0,
      payment_terms: 'T/T 30%', delivery_terms: 'FOB',
    });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  }

  async function startEdit(pi: ProformaInvoice & { customer?: Customer }) {
    const { data: itemsData } = await supabase.from('pi_items').select('*').eq('pi_id', pi.id).order('created_at', { ascending: true });
    setEditingPI(pi);
    setForm(pi);
    setItems((itemsData as PiItem[]) || [{ description: '', quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  }

  function addItem() { setItems([...items, { description: '', quantity: 1, unit_price: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof PiItem, value: string | number) {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }
  function selectProduct(idx: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) {
      setItems(items.map((it, i) => i === idx ? { ...it, product_id: product.id, description: product.name, unit_price: product.selling_price } : it));
    }
  }

  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
  const total = subtotal - (form.discount || 0) + (form.freight || 0) + (form.insurance || 0) + (form.other_charges || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Proforma Invoices</h2>
          <p className="text-sm text-slate-500 mt-0.5">Create professional proforma invoices with print and PDF export</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" />New PI
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PI number, customer..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{search ? 'No matching proforma invoices' : 'No proforma invoices yet. Click "New PI" to start.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">PI Number</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Valid Until</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(pi => (
                  <tr key={pi.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{pi.pi_number}</td>
                    <td className="px-4 py-3 text-slate-600">{pi.customer?.company_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(pi.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(pi.valid_until)}</td>
                    <td className="px-4 py-3"><span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[pi.status])}>{statusLabels[pi.status]}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(pi.total_amount, pi.currency)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewPI(pi)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => startEdit(pi)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deletePI(pi.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-900">{editingPI ? 'Edit Proforma Invoice' : 'New Proforma Invoice'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="PI Number *">
                  <input value={form.pi_number || ''} onChange={e => setForm({ ...form, pi_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </Field>
                <Field label="客户">
                  <select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value as ProformaInvoice['status'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Currency">
                  <select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </Field>
                <Field label="Valid Until">
                  <input type="date" value={form.valid_until || ''} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </Field>
                <Field label="Trade Terms">
                  <select value={form.delivery_terms || ''} onChange={e => setForm({ ...form, delivery_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {TRADE_TERMS.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
                  </select>
                </Field>
                <Field label="Payment Terms">
                  <select value={form.payment_terms || ''} onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {PAYMENT_TERMS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Origin Country"><input value={form.origin_country || ''} onChange={e => setForm({ ...form, origin_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
                <Field label="Destination Country"><input value={form.destination_country || ''} onChange={e => setForm({ ...form, destination_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
                <Field label="Shipping Method"><input value={form.shipping_method || ''} onChange={e => setForm({ ...form, shipping_method: e.target.value })} placeholder="Sea/Air/Express" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">Product Items</h3>
                  <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 text-sm font-medium">
                    <Plus className="w-3.5 h-3.5" />Add Row
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-2 bg-slate-50 rounded-lg">
                      <select value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)}
                        className="w-full sm:w-40 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description"
                        className="flex-1 w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                      <input type="number" value={item.quantity || 0} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty"
                        className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                      <input type="number" step="0.01" value={item.unit_price || 0} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Unit Price"
                        className="w-24 px-2 py-1.5 border border-slate-200 rounded text-xs" />
                      <span className="text-xs font-medium text-slate-600 w-24 text-right">{formatCurrency((item.quantity || 0) * (item.unit_price || 0), form.currency || 'USD')}</span>
                      <button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                <Field label="Discount"><input type="number" step="0.01" value={form.discount ?? 0} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
                <Field label="Freight"><input type="number" step="0.01" value={form.freight ?? 0} onChange={e => setForm({ ...form, freight: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
                <Field label="Insurance"><input type="number" step="0.01" value={form.insurance ?? 0} onChange={e => setForm({ ...form, insurance: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
                <Field label="Other Charges"><input type="number" step="0.01" value={form.other_charges ?? 0} onChange={e => setForm({ ...form, other_charges: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></Field>
              </div>

              <Field label="Notes">
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </Field>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">{formatCurrency(subtotal, form.currency || 'USD')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Discount</span><span className="text-red-500">-{formatCurrency(form.discount || 0, form.currency || 'USD')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Freight</span><span>{formatCurrency(form.freight || 0, form.currency || 'USD')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Insurance</span><span>{formatCurrency(form.insurance || 0, form.currency || 'USD')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Other</span><span>{formatCurrency(form.other_charges || 0, form.currency || 'USD')}</span></div>
                <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Total</span><span className="text-violet-600">{formatCurrency(total, form.currency || 'USD')}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">Cancel</button>
              <button onClick={savePI} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium text-sm">{editingPI ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewingPI && (
        <PIViewModal pi={viewingPI} onClose={() => setViewingPI(null)} />
      )}
    </div>
  );
}

function PIViewModal({ pi, onClose }: { pi: ProformaInvoice & { customer?: Customer; items: PiItem[] }; onClose: () => void }) {
  const subtotal = pi.items.reduce((s, i) => s + i.total, 0);
  const total = subtotal - pi.discount + pi.freight + pi.insurance + pi.other_charges;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-slate-900">Preview Proforma Invoice</h2>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium text-sm">
            <Printer className="w-4 h-4" />Print / PDF
          </button>
        </div>

        {/* PI Document */}
        <div className="p-8 print:p-10" id="pi-document">
          <DocHeader title="PROFORMA INVOICE" docNumber={pi.pi_number} />

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Sold To (Buyer)</p>
              <p className="text-sm font-medium text-slate-900">{pi.customer?.company_name || '—'}</p>
              {pi.customer?.contact_name && <p className="text-sm text-slate-600">{pi.customer.contact_name}</p>}
              {pi.customer?.address && <p className="text-sm text-slate-600">{pi.customer.address}</p>}
              <p className="text-sm text-slate-600">{pi.customer?.country || ''}</p>
              {pi.customer?.email && <p className="text-sm text-slate-600">{pi.customer.email}</p>}
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Invoice Details</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="text-slate-900">{formatDate(pi.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Valid Until:</span><span className="text-slate-900">{formatDate(pi.valid_until)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Trade Terms:</span><span className="text-slate-900">{pi.delivery_terms || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Payment Terms:</span><span className="text-slate-900">{pi.payment_terms || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Shipping Method:</span><span className="text-slate-900">{pi.shipping_method || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Origin:</span><span className="text-slate-900">{pi.origin_country || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Destination:</span><span className="text-slate-900">{pi.destination_country || '—'}</span></div>
              </div>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2 text-left font-medium rounded-l">#</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                <th className="px-3 py-2 text-right font-medium rounded-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pi.items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400">No items</td></tr>
              ) : pi.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-slate-900">{item.description}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(item.unit_price, pi.currency)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatCurrency(item.total, pi.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="text-slate-900">{formatCurrency(subtotal, pi.currency)}</span></div>
              {pi.discount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Discount</span><span className="text-red-500">-{formatCurrency(pi.discount, pi.currency)}</span></div>}
              {pi.freight > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Freight</span><span className="text-slate-900">{formatCurrency(pi.freight, pi.currency)}</span></div>}
              {pi.insurance > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Insurance</span><span className="text-slate-900">{formatCurrency(pi.insurance, pi.currency)}</span></div>}
              {pi.other_charges > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Other Charges</span><span className="text-slate-900">{formatCurrency(pi.other_charges, pi.currency)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Total</span><span className="text-violet-600">{formatCurrency(total, pi.currency)}</span></div>
            </div>
          </div>

          {pi.notes && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{pi.notes}</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p>This Proforma Invoice is valid until {formatDate(pi.valid_until)}. Prices are subject to final confirmation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
