import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Quote as QuoteIcon, X, Edit2, Trash2, Eye, ArrowLeft, Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateDocNumber, classNames, CURRENCIES } from '@/lib/utils';
import type { Quotation, QuotationItem, Customer, Product } from '@/lib/supabase';
import { DocHeader } from '@/components/documents/DocHeader';

const statusLabels: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired',
};
const statusColors: Record<string, string> = {
  draft: 'bg-[#161228]/70 text-[#8879A0]', sent: 'bg-[#161228]/70 text-[#06B6D4]',
  accepted: 'bg-[#221A3A]/70 text-[#A855F7]', rejected: 'bg-[#3A1F1F]/80 text-[#F87171]', expired: 'bg-[#3A2D54]/60 text-[#F87171]',
};

export function Quotations() {
  const [quotes, setQuotes] = useState<(Quotation & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [viewing, setViewing] = useState<(Quotation & { customer?: Customer; items: QuotationItem[] }) | null>(null);
  const [form, setForm] = useState<Partial<Quotation>>({});
  const [items, setItems] = useState<Partial<QuotationItem>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('quotations').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setQuotes((data as (Quotation & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from('products').select('*').then(({ data }) => setProducts((data as Product[]) || []));
  }, [load]);

  const filtered = quotes.filter(q =>
    !search || q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    (q.customer?.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    if (!form.quote_number?.trim()) return;
    const total = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const { customer, id, created_at, updated_at, items: _items, ...rest } = form;
    const payload = { ...rest, total_amount: total };

    if (editing) {
      await supabase.from('quotations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await supabase.from('quotation_items').delete().eq('quotation_id', editing.id);
      const valid = items.filter(i => i.description?.trim());
      if (valid.length > 0) {
        await supabase.from('quotation_items').insert(valid.map(i => ({ ...i, quotation_id: editing.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
      }
    } else {
      const { data } = await supabase.from('quotations').insert(payload).select('*').single();
      const newQ = data as Quotation;
      const valid = items.filter(i => i.description?.trim());
      if (valid.length > 0 && newQ) {
        await supabase.from('quotation_items').insert(valid.map(i => ({ ...i, quotation_id: newQ.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
      }
    }
    setShowForm(false); setEditing(null); setForm({}); setItems([]);
    load();
  }

  async function remove(id: string) {
    if (!confirm('确定删除此报价单？')) return;
    await supabase.from('quotation_items').delete().eq('quotation_id', id);
    await supabase.from('quotations').delete().eq('id', id);
    load();
  }

  async function view(q: Quotation & { customer?: Customer }) {
    const { data } = await supabase.from('quotation_items').select('*').eq('quotation_id', q.id).order('created_at', { ascending: true });
    setViewing({ ...q, items: (data as QuotationItem[]) || [] });
  }

  function startAdd() {
    setEditing(null);
    setForm({ quote_number: generateDocNumber('QT'), status: 'draft', currency: 'USD' });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  }

  async function startEdit(q: Quotation & { customer?: Customer }) {
    const { data } = await supabase.from('quotation_items').select('*').eq('quotation_id', q.id).order('created_at', { ascending: true });
    setEditing(q); setForm(q);
    setItems((data as QuotationItem[]) || [{ description: '', quantity: 1, unit_price: 0 }]);
    setShowForm(true);
  }

  function addItem() { setItems([...items, { description: '', quantity: 1, unit_price: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof QuotationItem, value: string | number) {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }
  function selectProduct(idx: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) setItems(items.map((it, i) => i === idx ? { ...it, product_id: product.id, description: product.name, unit_price: product.selling_price } : it));
  }

  const total = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#F3EFE6]">Quotations</h2>
          <p className="text-sm text-[#8879A0] mt-0.5">Create and manage customer quotations</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#A855F7] to-[#6B21A8] text-[#F3EFE6] rounded-lg hover:bg-[#6B21A8] transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" />New Quotation
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quote number, customer..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#1B142C]/90 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#78716C]"><QuoteIcon className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#78716C]"><QuoteIcon className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>{search ? 'No matching quotations' : 'No quotations yet. Click "New Quotation" to start.'}</p></div>
      ) : (
        <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#161228]/60 border-b border-[#3A2D54]/50 text-center text-[#B8AEC8]">
                  <th className="px-4 py-3 font-medium text-center">Quote Number</th>
                  <th className="px-4 py-3 font-medium text-center">Customer</th>
                  <th className="px-4 py-3 font-medium text-center">Date</th>
                  <th className="px-4 py-3 font-medium text-center">Valid Until</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Amount</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A2D54]/50">
                {filtered.map(q => (
                  <tr key={q.id} className="hover:bg-[#221A3A]/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#F3EFE6]">{q.quote_number}</td>
                    <td className="px-4 py-3 text-[#B8AEC8]">{q.customer?.company_name || '—'}</td>
                    <td className="px-4 py-3 text-[#B8AEC8]">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-3 text-[#B8AEC8]">{formatDate(q.valid_until)}</td>
                    <td className="px-4 py-3"><span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[q.status])}>{statusLabels[q.status]}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-[#F3EFE6]">{formatCurrency(q.total_amount, q.currency)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => view(q)} className="p-1.5 text-[#78716C] intj-btn-ghost rounded-lg"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => startEdit(q)} className="p-1.5 text-[#78716C] hover:text-[#06B6D4] hover:bg-[#161228]/70 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => remove(q.id)} className="p-1.5 text-[#78716C] hover:text-[#F87171] hover:bg-[#3A1F1F]/80 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3A2D54]/50 sticky top-0 bg-[#1B142C]/90 z-10">
              <h2 className="text-lg font-semibold text-[#F3EFE6]">{editing ? 'Edit Quotation' : 'New Quotation'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#78716C] hover:text-[#B8AEC8]"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative z-10 p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Quote Number *">
                  <input value={form.quote_number || ''} onChange={e => setForm({ ...form, quote_number: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]" />
                </Field>
                <Field label="Customer">
                  <select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]">
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </Field>
                <Field label="Currency">
                  <select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value as Quotation['status'] })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]">
                    {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Valid Until"><input type="date" value={form.valid_until || ''} onChange={e => setForm({ ...form, valid_until: e.target.value })} className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]" /></Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#F3EFE6]">Product Items</h3>
                  <button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-[#3A2D54]/60 text-[#D8B4FE] rounded-lg hover:bg-[#3A2D54]/60 text-sm font-medium"><Plus className="w-3.5 h-3.5" />Add Row</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col sm:flex-row gap-2 items-start sm:items-center p-2 bg-[#161228]/60 rounded-lg">
                      <select value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)} className="w-full sm:w-40 px-2 py-1.5 border border-[#3A2D54] rounded text-xs bg-[#1B142C]/90">
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" className="flex-1 w-full px-2 py-1.5 border border-[#3A2D54] rounded text-xs" />
                      <input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty" className="w-20 px-2 py-1.5 border border-[#3A2D54] rounded text-xs" />
                      <input type="number" step="0.01" value={item.unit_price || ''} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Unit Price" className="w-24 px-2 py-1.5 border border-[#3A2D54] rounded text-xs" />
                      <span className="text-xs font-medium text-[#B8AEC8] w-24 text-right">{formatCurrency((item.quantity || 0) * (item.unit_price || 0), form.currency || 'USD')}</span>
                      <button onClick={() => removeItem(idx)} className="p-1 text-[#78716C] hover:text-[#F87171]"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Notes">
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D8B4FE]" />
              </Field>

              <div className="bg-[#161228]/60 rounded-lg p-4 flex justify-between text-base font-bold">
                <span className="text-[#F3EFE6]">Total</span>
                <span className="text-[#D8B4FE]">{formatCurrency(total, form.currency || 'USD')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#3A2D54] sticky bottom-0 bg-[#1B142C]/90">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[#B8AEC8] hover:text-[#F3EFE6] font-medium text-sm">Cancel</button>
              <button onClick={save} className="px-4 py-2 bg-gradient-to-r from-[#A855F7] to-[#6B21A8] text-[#F3EFE6] rounded-lg hover:bg-[#6B21A8] font-medium text-sm">{editing ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-[#0B0818]/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-[#1B142C]/90" onClick={() => setViewing(null)}>
          <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3A2D54]/50 print:hidden">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewing(null)} className="p-2 text-[#78716C] hover:text-[#B8AEC8] hover:bg-[#221A3A]/50 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-lg font-semibold text-[#F3EFE6]">Preview Quotation</h2>
              </div>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#A855F7] to-[#6B21A8] text-[#F3EFE6] rounded-lg hover:bg-[#6B21A8] font-medium text-sm"><Printer className="w-4 h-4" />Print / PDF</button>
            </div>

            <div className="p-8 print:p-10" id="pi-document">
              <DocHeader title="QUOTATION" docNumber={viewing.quote_number} />
              <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                <div>
                  <p className="text-xs font-bold text-[#8879A0] uppercase tracking-wide mb-2">QUOTED TO</p>
                  <div className="space-y-1">
                    <div className="flex"><span className="w-24 shrink-0 text-[#78716C]">Cont.Pers:</span><span className="text-[#F3EFE6]">{viewing.customer?.contact_name || '—'}</span></div>
                    <div className="flex"><span className="w-24 shrink-0 text-[#78716C]">Company:</span><span className="text-[#F3EFE6]">{viewing.customer?.company_name || '—'}</span></div>
                    <div className="flex"><span className="w-24 shrink-0 text-[#78716C]">Address:</span><span className="text-[#F3EFE6]">{viewing.customer?.address || '—'}</span></div>
                    <div className="flex"><span className="w-24 shrink-0 text-[#78716C]">Tel. No.:</span><span className="text-[#F3EFE6]">{viewing.customer?.phone || '—'}</span></div>
                    <div className="flex"><span className="w-24 shrink-0 text-[#78716C]">E-mail:</span><span className="text-[#F3EFE6]">{viewing.customer?.email || '—'}</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#8879A0] uppercase tracking-wide mb-2">QUOTATION DETAILS</p>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-[#78716C]">Date:</span><span className="text-[#F3EFE6]">{formatDate(viewing.created_at)}</span></div>
                    <div className="flex justify-between"><span className="text-[#78716C]">Valid Until:</span><span className="text-[#F3EFE6]">{viewing.valid_until ? formatDate(viewing.valid_until) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[#78716C]">Currency:</span><span className="text-[#F3EFE6]">{viewing.currency || 'USD'}</span></div>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#3A2D54] mb-4" />
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="bg-[#221A3A] text-[#F3EFE6]">
                    <th className="px-3 py-2 text-center font-medium rounded-l">#</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium rounded-r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-[#3A2D54]/50/50">
                      <td className="px-3 py-2.5 text-center text-[#8879A0]">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-left text-[#F3EFE6]">{item.description}</td>
                      <td className="px-3 py-2.5 text-right text-[#B8AEC8]">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-[#B8AEC8]">{formatCurrency(item.unit_price, viewing.currency)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-[#F3EFE6]">{formatCurrency(item.total, viewing.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mb-6">
                <div className="w-64 flex justify-between text-lg font-bold border-t border-[#3A2D54] pt-2">
                  <span className="text-[#F3EFE6]">Total</span><span className="text-[#D8B4FE]">{formatCurrency(viewing.total_amount, viewing.currency)}</span>
                </div>
              </div>
              {viewing.notes && <div className="mb-6"><p className="text-xs font-semibold text-[#78716C] uppercase mb-1">Notes</p><p className="text-sm text-[#B8AEC8] bg-[#161228]/60 p-3 rounded-lg">{viewing.notes}</p></div>}
              <div className="border-t border-[#3A2D54] pt-4 text-xs text-[#8879A0]">
                <p>This quotation is valid until {formatDate(viewing.valid_until)}. Terms and conditions apply.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-[#F3EFE6] mb-1.5">{label}</label>{children}</div>;
}
