import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ClipboardCheck, X, Edit2, Trash2, Printer, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, generateDocNumber, classNames, CURRENCIES } from '@/lib/utils';
import type { CustomsDeclaration, CdItem, Customer, Product } from '@/lib/supabase';
import { DocHeader } from '@/components/documents/DocHeader';

const statusLabels: Record<string, string> = { draft: 'Draft', filed: 'Filed', cleared: 'Cleared', cancelled: 'Cancelled' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', filed: 'bg-blue-100 text-blue-700',
  cleared: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
};

export function CustomsDeclarations() {
  const [rows, setRows] = useState<(CustomsDeclaration & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomsDeclaration | null>(null);
  const [viewing, setViewing] = useState<(CustomsDeclaration & { customer?: Customer; items: CdItem[] }) | null>(null);
  const [form, setForm] = useState<Partial<CustomsDeclaration>>({});
  const [items, setItems] = useState<Partial<CdItem>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('customs_declarations').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setRows((data as (CustomsDeclaration & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from('products').select('*').then(({ data }) => setProducts((data as Product[]) || []));
  }, [load]);

  const filtered = rows.filter(r => !search || r.declaration_number.toLowerCase().includes(search.toLowerCase()) || (r.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!form.declaration_number?.trim()) return;
    const total = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grossWt = items.reduce((s, i) => s + (i.gross_weight || 0), 0);
    const netWt = items.reduce((s, i) => s + (i.net_weight || 0), 0);
    const pkgCount = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const { customer, id, created_at, updated_at, items: _items, ...rest } = form;
    const payload = { ...rest, total_amount: total, gross_weight: grossWt, net_weight: netWt, package_count: pkgCount };
    if (editing) {
      await supabase.from('customs_declarations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await supabase.from('cd_items').delete().eq('cd_id', editing.id);
      const valid = items.filter(i => i.description?.trim());
      if (valid.length) await supabase.from('cd_items').insert(valid.map(i => ({ ...i, cd_id: editing.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
    } else {
      const { data } = await supabase.from('customs_declarations').insert(payload).select('*').single();
      const newRow = data as CustomsDeclaration;
      const valid = items.filter(i => i.description?.trim());
      if (valid.length && newRow) await supabase.from('cd_items').insert(valid.map(i => ({ ...i, cd_id: newRow.id, total: (i.quantity || 0) * (i.unit_price || 0) })));
    }
    setShowForm(false); setEditing(null); setForm({}); setItems([]); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this customs declaration?')) return;
    await supabase.from('cd_items').delete().eq('cd_id', id);
    await supabase.from('customs_declarations').delete().eq('id', id); load();
  }

  async function view(c: CustomsDeclaration & { customer?: Customer }) {
    const { data } = await supabase.from('cd_items').select('*').eq('cd_id', c.id).order('created_at', { ascending: true });
    setViewing({ ...c, items: (data as CdItem[]) || [] });
  }

  function startAdd() {
    setEditing(null);
    setForm({ declaration_number: generateDocNumber('CD'), status: 'draft', currency: 'USD', trade_mode: '一般贸易', declaration_type: '出口' });
    setItems([{ description: '', hs_code: '', quantity: 1, unit: 'piece', unit_price: 0, gross_weight: 0, net_weight: 0 }]); setShowForm(true);
  }

  async function startEdit(c: CustomsDeclaration & { customer?: Customer }) {
    const { data } = await supabase.from('cd_items').select('*').eq('cd_id', c.id).order('created_at', { ascending: true });
    setEditing(c); setForm(c); setItems((data as CdItem[]) || [{ description: '', hs_code: '', quantity: 1, unit: 'piece', unit_price: 0, gross_weight: 0, net_weight: 0 }]); setShowForm(true);
  }

  function addItem() { setItems([...items, { description: '', hs_code: '', quantity: 1, unit: 'piece', unit_price: 0, gross_weight: 0, net_weight: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof CdItem, value: string | number) { setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it)); }
  function selectProduct(idx: number, productId: string) {
    const p = products.find(p => p.id === productId);
    if (p) setItems(items.map((it, i) => i === idx ? { ...it, product_id: p.id, description: p.name } : it));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">Customs Declarations</h2><p className="text-sm text-slate-500 mt-0.5">Export customs declaration with HS codes and packaging info</p></div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"><Plus className="w-4 h-4" />New Declaration</button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search declaration number, customer..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></div>
      {loading ? <div className="text-center py-12 text-slate-400"><ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Loading...</p></div>
        : filtered.length === 0 ? <div className="text-center py-12 text-slate-400"><ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>{search ? 'No matching declarations' : 'No declarations yet. Click "New Declaration" to start.'}</p></div>
        : <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200 text-center text-slate-600"><th className="px-4 py-3 font-medium text-center">Declaration No.</th><th className="px-4 py-3 font-medium text-center">Customer</th><th className="px-4 py-3 font-medium text-center">Date</th><th className="px-4 py-3 font-medium text-center">Status</th><th className="px-4 py-3 font-medium text-center">Amount</th><th className="px-4 py-3 font-medium text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(c => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{c.declaration_number}</td><td className="px-4 py-3 text-slate-600">{c.customer?.company_name || '—'}</td><td className="px-4 py-3 text-slate-600">{formatDate(c.created_at)}</td><td className="px-4 py-3"><span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[c.status])}>{statusLabels[c.status]}</span></td><td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(c.total_amount, c.currency)}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => view(c)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Eye className="w-4 h-4" /></button><button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => del(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div></div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10"><h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Customs Declaration' : 'New Customs Declaration'}</h2><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Declaration No. *"><input value={form.declaration_number || ''} onChange={e => setForm({ ...form, declaration_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Customer"><select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"><option value="">Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></Field>
                <Field label="Status"><select value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value as CustomsDeclaration['status'] })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Currency"><select value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">{CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select></Field>
                <Field label="Trade Mode"><input value={form.trade_mode || ''} onChange={e => setForm({ ...form, trade_mode: e.target.value })} placeholder="General Trade" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Declaration Type"><input value={form.declaration_type || ''} onChange={e => setForm({ ...form, declaration_type: e.target.value })} placeholder="Export" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Customs Broker"><input value={form.customs_broker || ''} onChange={e => setForm({ ...form, customs_broker: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Origin Country"><input value={form.origin_country || ''} onChange={e => setForm({ ...form, origin_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Destination Country"><input value={form.destination_country || ''} onChange={e => setForm({ ...form, destination_country: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Port of Departure"><input value={form.port_of_departure || ''} onChange={e => setForm({ ...form, port_of_departure: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Port of Destination"><input value={form.port_of_destination || ''} onChange={e => setForm({ ...form, port_of_destination: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Transport Method"><input value={form.transport_method || ''} onChange={e => setForm({ ...form, transport_method: e.target.value })} placeholder="Sea/Air" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Container No."><input value={form.container_number || ''} onChange={e => setForm({ ...form, container_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="Package Type"><input value={form.package_type || ''} onChange={e => setForm({ ...form, package_type: e.target.value })} placeholder="Carton/Wooden Case" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
                <Field label="HS Code Summary"><input value={form.hs_code_summary || ''} onChange={e => setForm({ ...form, hs_code_summary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-slate-700">Product Items</h3><button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-sm font-medium"><Plus className="w-3.5 h-3.5" />Add Row</button></div>
                <div className="space-y-2">{items.map((item, idx) => <div key={idx} className="p-2 bg-slate-50 rounded-lg space-y-2"><div className="flex gap-2 items-center"><select value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)} className="w-full sm:w-32 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Product Description" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs" /><button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div><div className="grid grid-cols-2 sm:grid-cols-6 gap-2"><input value={item.hs_code || ''} onChange={e => updateItem(idx, 'hs_code', e.target.value)} placeholder="HS Code" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" value={item.quantity || 0} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input value={item.unit || ''} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="Unit" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.01" value={item.unit_price || 0} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Unit Price" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.001" value={item.gross_weight || 0} onChange={e => updateItem(idx, 'gross_weight', parseFloat(e.target.value) || 0)} placeholder="Gross kg" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.001" value={item.net_weight || 0} onChange={e => updateItem(idx, 'net_weight', parseFloat(e.target.value) || 0)} placeholder="Net kg" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /></div></div>)}</div>
              </div>
              <Field label="Notes"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" /></Field>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">Cancel</button><button onClick={save} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm">{editing ? 'Save' : 'Create'}</button></div>
          </div>
        </div>
      )}

      {viewing && <CdViewModal cd={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function CdViewModal({ cd, onClose }: { cd: CustomsDeclaration & { customer?: Customer; items: CdItem[] }; onClose: () => void }) {
  const total = cd.items.reduce((s, i) => s + i.total, 0);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden"><div className="flex items-center gap-3"><button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-lg font-semibold text-slate-900">Preview Customs Declaration</h2></div><button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"><Printer className="w-4 h-4" />Print / PDF</button></div>
        <div className="p-8 print:p-10" id="pi-document">
          <DocHeader title="CUSTOMS DECLARATION" docNumber={cd.declaration_number} />
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">CONSIGNEE</p>
              <div className="space-y-1">
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Cont.Pers:</span><span className="text-slate-700">{cd.customer?.contact_name || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Company:</span><span className="text-slate-700">{cd.customer?.company_name || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Address:</span><span className="text-slate-700">{cd.customer?.address || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">Tel. No.:</span><span className="text-slate-700">{cd.customer?.phone || '—'}</span></div>
                <div className="flex"><span className="w-24 shrink-0 text-slate-400">E-mail:</span><span className="text-slate-700">{cd.customer?.email || '—'}</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">DECLARATION DETAILS</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="text-slate-700">{formatDate(cd.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Trade Mode:</span><span className="text-slate-700">{cd.trade_mode || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Decl. Type:</span><span className="text-slate-700">{cd.declaration_type || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Currency:</span><span className="text-slate-700">{cd.currency || 'USD'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Origin:</span><span className="text-slate-700">{cd.origin_country || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Destination:</span><span className="text-slate-700">{cd.destination_country || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Departure Port:</span><span className="text-slate-700">{cd.port_of_departure || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Destination Port:</span><span className="text-slate-700">{cd.port_of_destination || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Transport:</span><span className="text-slate-700">{cd.transport_method || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Container No.:</span><span className="text-slate-700">{cd.container_number || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Customs Broker:</span><span className="text-slate-700">{cd.customs_broker || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">HS Code Summary:</span><span className="text-slate-700">{cd.hs_code_summary || '—'}</span></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6"><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Gross Weight</p><p className="text-sm font-semibold text-slate-900">{cd.gross_weight || 0} kg</p></div><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Net Weight</p><p className="text-sm font-semibold text-slate-900">{cd.net_weight || 0} kg</p></div><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Packages</p><p className="text-sm font-semibold text-slate-900">{cd.package_count || 0}</p></div><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Package Type</p><p className="text-sm font-semibold text-slate-900">{cd.package_type || '—'}</p></div></div>
          <div className="border-t border-slate-200 mb-4" />
          <table className="w-full text-sm mb-6"><thead><tr className="bg-slate-900 text-white"><th className="px-3 py-2 text-center font-medium rounded-l">#</th><th className="px-3 py-2 text-left font-medium">Description</th><th className="px-3 py-2 text-center font-medium">HS Code</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-center font-medium">Unit</th><th className="px-3 py-2 text-right font-medium">Gross Wt.</th><th className="px-3 py-2 text-right font-medium rounded-r">Net Wt.</th></tr></thead><tbody>{cd.items.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-slate-400">No items</td></tr> : cd.items.map((item, idx) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2.5 text-center text-slate-500">{idx + 1}</td><td className="px-3 py-2.5 text-left text-slate-900">{item.description}</td><td className="px-3 py-2.5 text-center text-slate-600">{item.hs_code || '—'}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.quantity}</td><td className="px-3 py-2.5 text-center text-slate-600">{item.unit}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.gross_weight} kg</td><td className="px-3 py-2.5 text-right text-slate-600">{item.net_weight} kg</td></tr>)}</tbody></table>
          <div className="flex justify-end mb-6"><div className="w-48"><div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2"><span className="text-slate-900">Total</span><span className="text-amber-600">{formatCurrency(total, cd.currency)}</span></div></div></div>
          {cd.notes && <div className="mb-6"><p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p><p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{cd.notes}</p></div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}
