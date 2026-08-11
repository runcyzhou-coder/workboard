import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Handshake, X, Edit2, Trash2, Printer, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateDocNumber, classNames, CURRENCIES, TRADE_TERMS, PAYMENT_TERMS } from '@/lib/utils';
import type { Contract, ContractItem, Customer, Product } from '@/lib/supabase';
import { DocHeader } from '@/components/documents/DocHeader';

const statusLabels: Record<string, string> = { draft: 'Draft', sent: 'Sent', signed: 'Signed', cancelled: 'Cancelled' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
};

export function Contracts() {
  const [rows, setRows] = useState<(Contract & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [viewing, setViewing] = useState<(Contract & { customer?: Customer; items: ContractItem[] }) | null>(null);
  const [form, setForm] = useState<Partial<Contract>>({});
  const [items, setItems] = useState<Partial<ContractItem>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contracts').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setRows((data as (Contract & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from('products').select('*').then(({ data }) => setProducts((data as Product[]) || []));
  }, [load]);

  const filtered = rows.filter(r => !search || r.contract_number.toLowerCase().includes(search.toLowerCase()) || (r.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!form.contract_number?.trim()) return;
    const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const total = subtotal;
    const { customer, id, created_at, updated_at, items: _items, ...rest } = form;
    const payload = { ...rest, subtotal, total_amount: total };
    if (editing) {
      await supabase.from('contracts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await supabase.from('contract_items').delete().eq('contract_id', editing.id);
      const valid = items.filter(i => i.description?.trim());
      if (valid.length) await supabase.from('contract_items').insert(valid.map(i => ({ ...i, contract_id: editing.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
    } else {
      const { data } = await supabase.from('contracts').insert(payload).select('*').single();
      const newRow = data as Contract;
      const valid = items.filter(i => i.description?.trim());
      if (valid.length && newRow) await supabase.from('contract_items').insert(valid.map(i => ({ ...i, contract_id: newRow.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
    }
    setShowForm(false); setEditing(null); setForm({}); setItems([]); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this contract?')) return;
    await supabase.from('contract_items').delete().eq('contract_id', id);
    await supabase.from('contracts').delete().eq('id', id); load();
  }

  async function view(c: Contract & { customer?: Customer }) {
    const { data } = await supabase.from('contract_items').select('*').eq('contract_id', c.id).order('created_at', { ascending: true });
    setViewing({ ...c, items: (data as ContractItem[]) || [] });
  }

  function startAdd() {
    setEditing(null);
    setForm({ contract_number: generateDocNumber('SC'), status: 'draft', currency: 'USD', payment_terms: 'T/T 30%', delivery_terms: 'FOB' });
    setItems([{ description: '', quantity: 1, unit_price: 0 }]); setShowForm(true);
  }

  async function startEdit(c: Contract & { customer?: Customer }) {
    const { data } = await supabase.from('contract_items').select('*').eq('contract_id', c.id).order('created_at', { ascending: true });
    setEditing(c); setForm(c); setItems((data as ContractItem[]) || [{ description: '', quantity: 1, unit_price: 0 }]); setShowForm(true);
  }

  function addItem() { setItems([...items, { description: '', quantity: 1, unit_price: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof ContractItem, value: string | number) { setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it)); }
  function selectProduct(idx: number, productId: string) {
    const p = products.find(p => p.id === productId);
    if (p) setItems(items.map((it, i) => i === idx ? { ...it, product_id: p.id, description: p.name, unit_price: p.selling_price } : it));
  }

  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">Sales Contracts</h2><p className="text-sm text-slate-500 mt-0.5">Formal sales contracts signed between buyer and seller</p></div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"><Plus className="w-4 h-4" />New Contract</button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contract number, customer..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
      {loading ? <div className="text-center py-12 text-slate-400"><Handshake className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Loading...</p></div>
        : filtered.length === 0 ? <div className="text-center py-12 text-slate-400"><Handshake className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>{search ? 'No matching contracts' : 'No contracts yet. Click "New Contract" to start.'}</p></div>
        : <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200 text-center text-slate-600"><th className="px-4 py-3 font-medium text-center">Contract No.</th><th className="px-4 py-3 font-medium text-center">Customer</th><th className="px-4 py-3 font-medium text-center">Date</th><th className="px-4 py-3 font-medium text-center">Status</th><th className="px-4 py-3 font-medium text-center">Amount</th><th className="px-4 py-3 font-medium text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(c => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{c.contract_number}</td><td className="px-4 py-3 text-slate-600">{c.customer?.company_name || '—'}</td><td className="px-4 py-3 text-slate-600">{formatDate(c.created_at)}</td><td className="px-4 py-3"><span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[c.status])}>{statusLabels[c.status]}</span></td><td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(c.total_amount, c.currency)}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => view(c)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Eye className="w-4 h-4" /></button><button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => del(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div></div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10"><h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Contract' : 'New Contract'}</h2><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Contract No. *"><input value={form.contract_number || ''} onChange={e => setForm({ ...form, contract_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
                <Field label="Customer"><select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"><option value="">Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></Field>
                <Field label="Status"><select value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value as Contract['status'] })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Currency"><select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></Field>
                <Field label="Trade Terms"><select value={form.delivery_terms || ''} onChange={e => setForm({ ...form, delivery_terms: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">{TRADE_TERMS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}</select></Field>
                <Field label="Payment Terms"><select value={form.payment_terms || ''} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">{PAYMENT_TERMS.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}</select></Field>
                <Field label="交货日期"><input value={form.delivery_date || ''} onChange={e => setForm({ ...form, delivery_date: e.target.value })} placeholder="e.g. 2026-09-30" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Origin Country"><input value={form.origin_country || ''} onChange={e => setForm({ ...form, origin_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
                <Field label="Destination Country"><input value={form.destination_country || ''} onChange={e => setForm({ ...form, destination_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
                <Field label="Port of Loading"><input value={form.port_of_loading || ''} onChange={e => setForm({ ...form, port_of_loading: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
                <Field label="Port of Discharge"><input value={form.port_of_discharge || ''} onChange={e => setForm({ ...form, port_of_discharge: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-slate-700">Product Items</h3><button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-sm font-medium"><Plus className="w-3.5 h-3.5" />Add Row</button></div>
                <div className="space-y-2">{items.map((item, idx) => <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center p-2 bg-slate-50 rounded-lg"><select value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)} className="w-full sm:w-40 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" className="flex-1 w-full px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" value={item.quantity || 0} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty" className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.01" value={item.unit_price || 0} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Unit Price" className="w-24 px-2 py-1.5 border border-slate-200 rounded text-xs" /><span className="text-xs font-medium text-slate-600 w-24 text-right">{formatCurrency((item.quantity || 0) * (item.unit_price || 0), form.currency || 'USD')}</span><button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>)}</div>
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Terms &amp; Conditions</p>
                <Field label="Inspection Clause"><textarea value={form.inspection_clause || ''} onChange={e => setForm({ ...form, inspection_clause: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. The seller shall inspect products before shipment..." /></Field>
                <Field label="Warranty / After-Sales"><textarea value={form.warranty_clause || ''} onChange={e => setForm({ ...form, warranty_clause: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Warranty period is 12 months after delivery..." /></Field>
                <Field label="Force Majeure"><textarea value={form.force_majeure || ''} onChange={e => setForm({ ...form, force_majeure: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Neither party shall be liable for failure to perform due to force majeure..." /></Field>
                <Field label="Arbitration Clause"><textarea value={form.arbitration_clause || ''} onChange={e => setForm({ ...form, arbitration_clause: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Disputes shall be submitted to CIETAC for arbitration..." /></Field>
              </div>
              <Field label="Notes"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></Field>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">{formatCurrency(subtotal, form.currency || 'USD')}</span></div><div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Contract Total</span><span className="text-emerald-600">{formatCurrency(subtotal, form.currency || 'USD')}</span></div></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">Cancel</button><button onClick={save} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm">{editing ? 'Save' : 'Create'}</button></div>
          </div>
        </div>
      )}

      {viewing && <ContractViewModal contract={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ContractViewModal({ contract, onClose }: { contract: Contract & { customer?: Customer; items: ContractItem[] }; onClose: () => void }) {
  const total = contract.items.reduce((s, i) => s + i.total, 0);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden"><div className="flex items-center gap-3"><button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-lg font-semibold text-slate-900">Preview Contract</h2></div><button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"><Printer className="w-4 h-4" />Print / PDF</button></div>
        <div className="p-8 print:p-10" id="pi-document">
          <DocHeader title="SALES CONTRACT" docNumber={contract.contract_number} />
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">BUYER</p>
              <div className="space-y-1">
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Cont.Pers:</span><span className="text-slate-700">{contract.customer?.contact_name || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Company:</span><span className="text-slate-700">{contract.customer?.company_name || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Address:</span><span className="text-slate-700">{contract.customer?.address || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Tel. No.:</span><span className="text-slate-700">{contract.customer?.phone || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">E-mail:</span><span className="text-slate-700">{contract.customer?.email || '—'}</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">CONTRACT DETAILS</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="text-slate-700">{formatDate(contract.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Trade Terms:</span><span className="text-slate-700">{contract.delivery_terms || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Payment:</span><span className="text-slate-700">{contract.payment_terms || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Currency:</span><span className="text-slate-700">{contract.currency || 'USD'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Destination:</span><span className="text-slate-700">{contract.destination_country || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Origin:</span><span className="text-slate-700">{contract.origin_country || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Loading Port:</span><span className="text-slate-700">{contract.port_of_loading || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Discharge Port:</span><span className="text-slate-700">{contract.port_of_discharge || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Delivery Date:</span><span className="text-slate-700">{contract.delivery_date ? formatDate(contract.delivery_date) : '—'}</span></div>
              </div>
            </div>
          </div>
          <table className="w-full text-sm mb-6"><thead><tr className="bg-slate-900 text-white"><th className="px-3 py-2 text-center font-medium rounded-l">#</th><th className="px-3 py-2 text-center font-medium">Description</th><th className="px-3 py-2 text-center font-medium">Qty</th><th className="px-3 py-2 text-center font-medium">Unit Price</th><th className="px-3 py-2 text-center font-medium rounded-r">Amount</th></tr></thead><tbody>{contract.items.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-slate-400">No items</td></tr> : contract.items.map((item, idx) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2.5 text-slate-500">{idx + 1}</td><td className="px-3 py-2.5 text-slate-900">{item.description}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.quantity}</td><td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(item.unit_price, contract.currency)}</td><td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatCurrency(item.total, contract.currency)}</td></tr>)}</tbody></table>
          <div className="flex justify-end mb-6"><div className="w-64 space-y-2"><div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Total</span><span className="text-emerald-600">{formatCurrency(total, contract.currency)}</span></div></div></div>
          {(contract.inspection_clause || contract.warranty_clause || contract.force_majeure || contract.arbitration_clause) && (
            <div className="space-y-3 mb-6"><p className="text-xs font-semibold text-slate-400 uppercase">Terms & Conditions</p>{contract.inspection_clause && <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs font-medium text-slate-500 mb-1">Inspection Clause</p><p className="text-sm text-slate-600">{contract.inspection_clause}</p></div>}{contract.warranty_clause && <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs font-medium text-slate-500 mb-1">Warranty / After-Sales</p><p className="text-sm text-slate-600">{contract.warranty_clause}</p></div>}{contract.force_majeure && <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs font-medium text-slate-500 mb-1">Force Majeure</p><p className="text-sm text-slate-600">{contract.force_majeure}</p></div>}{contract.arbitration_clause && <div className="bg-slate-50 p-3 rounded-lg"><p className="text-xs font-medium text-slate-500 mb-1">Arbitration Clause</p><p className="text-sm text-slate-600">{contract.arbitration_clause}</p></div>}</div>
          )}
          {contract.notes && <div className="mb-6"><p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p><p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{contract.notes}</p></div>}
          <div className="grid grid-cols-2 gap-6 mt-8"><div><p className="text-xs font-semibold text-slate-400 uppercase mb-8">Seller</p><div className="border-t border-slate-300 pt-2 text-xs text-slate-500">Authorized Signature &amp; Date</div></div><div><p className="text-xs font-semibold text-slate-400 uppercase mb-8">Buyer</p><div className="border-t border-slate-300 pt-2 text-xs text-slate-500">Authorized Signature &amp; Date</div></div></div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}
