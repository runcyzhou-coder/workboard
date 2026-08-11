import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Package2, X, Edit2, Trash2, Printer, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, generateDocNumber, classNames } from '@/lib/utils';
import type { PackingList, PlItem, Customer, Product } from '@/lib/supabase';
import { DocHeader } from '@/components/documents/DocHeader';

const statusLabels: Record<string, string> = { draft: 'Draft', sent: 'Sent', confirmed: 'Confirmed', cancelled: 'Cancelled' };
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700',
};

function calcVol(l: number | null, w: number | null, h: number | null): number {
  if (!l || !w || !h) return 0;
  return (l * w * h) / 1000000;
}

export function PackingLists() {
  const [rows, setRows] = useState<(PackingList & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PackingList | null>(null);
  const [viewing, setViewing] = useState<(PackingList & { customer?: Customer; items: PlItem[] }) | null>(null);
  const [form, setForm] = useState<Partial<PackingList>>({});
  const [items, setItems] = useState<Partial<PlItem>[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('packing_lists').select('*, customer:customers(*)').order('created_at', { ascending: false });
    setRows((data as (PackingList & { customer?: Customer })[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from('customers').select('*').then(({ data }) => setCustomers((data as Customer[]) || []));
    supabase.from('products').select('*').then(({ data }) => setProducts((data as Product[]) || []));
  }, [load]);

  const filtered = rows.filter(r => !search || r.pl_number.toLowerCase().includes(search.toLowerCase()) || (r.customer?.company_name || '').toLowerCase().includes(search.toLowerCase()));

  async function save() {
    if (!form.pl_number?.trim()) return;
    const grossWt = items.reduce((s, i) => s + (i.gross_weight || 0), 0);
    const netWt = items.reduce((s, i) => s + (i.net_weight || 0), 0);
    const vol = items.reduce((s, i) => s + calcVol(i.length ?? null, i.width ?? null, i.height ?? null), 0);
    const pkgCount = items.reduce((s, i) => s + (i.package_count || 0), 0);
    const payload = { ...form, total_gross_weight: grossWt, total_net_weight: netWt, total_volume: vol, total_packages: pkgCount };
    if (editing) {
      await supabase.from('packing_lists').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await supabase.from('pl_items').delete().eq('pl_id', editing.id);
      const valid = items.filter(i => i.description?.trim());
      if (valid.length) await supabase.from('pl_items').insert(valid.map(i => ({ ...i, pl_id: editing.id, volume: calcVol(i.length ?? null, i.width ?? null, i.height ?? null) })));
    } else {
      const { data } = await supabase.from('packing_lists').insert(payload).select('*').single();
      const newRow = data as PackingList;
      const valid = items.filter(i => i.description?.trim());
      if (valid.length && newRow) await supabase.from('pl_items').insert(valid.map(i => ({ ...i, pl_id: newRow.id, volume: calcVol(i.length ?? null, i.width ?? null, i.height ?? null) })));
    }
    setShowForm(false); setEditing(null); setForm({}); setItems([]); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this packing list?')) return;
    await supabase.from('pl_items').delete().eq('pl_id', id);
    await supabase.from('packing_lists').delete().eq('id', id); load();
  }

  async function view(p: PackingList & { customer?: Customer }) {
    const { data } = await supabase.from('pl_items').select('*').eq('pl_id', p.id).order('created_at', { ascending: true });
    setViewing({ ...p, items: (data as PlItem[]) || [] });
  }

  function startAdd() {
    setEditing(null);
    setForm({ pl_number: generateDocNumber('PL'), status: 'draft' });
    setItems([{ description: '', quantity: 1, package_count: 1, package_type: 'carton', gross_weight: 0, net_weight: 0 }]); setShowForm(true);
  }

  async function startEdit(p: PackingList & { customer?: Customer }) {
    const { data } = await supabase.from('pl_items').select('*').eq('pl_id', p.id).order('created_at', { ascending: true });
    setEditing(p); setForm(p); setItems((data as PlItem[]) || [{ description: '', quantity: 1, package_count: 1, package_type: 'carton', gross_weight: 0, net_weight: 0 }]); setShowForm(true);
  }

  function addItem() { setItems([...items, { description: '', quantity: 1, package_count: 1, package_type: 'carton', gross_weight: 0, net_weight: 0 }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, field: keyof PlItem, value: string | number) { setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it)); }
  function selectProduct(idx: number, productId: string) {
    const p = products.find(p => p.id === productId);
    if (p) setItems(items.map((it, i) => i === idx ? { ...it, product_id: p.id, description: p.name } : it));
  }

  const totalGross = items.reduce((s, i) => s + (i.gross_weight || 0), 0);
  const totalNet = items.reduce((s, i) => s + (i.net_weight || 0), 0);
  const totalVol = items.reduce((s, i) => s + calcVol(i.length ?? null, i.width ?? null, i.height ?? null), 0);
  const totalPkg = items.reduce((s, i) => s + (i.package_count || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-slate-900">Packing Lists</h2><p className="text-sm text-slate-500 mt-0.5">Detailed packing list with quantity, weight, dimensions and volume</p></div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium text-sm"><Plus className="w-4 h-4" />New Packing List</button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PL number, customer..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></div>
      {loading ? <div className="text-center py-12 text-slate-400"><Package2 className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Loading...</p></div>
        : filtered.length === 0 ? <div className="text-center py-12 text-slate-400"><Package2 className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>{search ? 'No matching packing lists' : 'No packing lists yet. Click "New Packing List" to start.'}</p></div>
        : <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-200 text-center text-slate-600"><th className="px-4 py-3 font-medium text-center">PL Number</th><th className="px-4 py-3 font-medium text-center">Customer</th><th className="px-4 py-3 font-medium text-center">Date</th><th className="px-4 py-3 font-medium text-center">Status</th><th className="px-4 py-3 font-medium text-center">Gross Weight</th><th className="px-4 py-3 font-medium text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(p => <tr key={p.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-900">{p.pl_number}</td><td className="px-4 py-3 text-slate-600">{p.customer?.company_name || '—'}</td><td className="px-4 py-3 text-slate-600">{formatDate(p.created_at)}</td><td className="px-4 py-3"><span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[p.status])}>{statusLabels[p.status]}</span></td><td className="px-4 py-3 text-right font-semibold text-slate-900">{p.total_gross_weight} kg</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => view(p)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Eye className="w-4 h-4" /></button><button onClick={() => startEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => del(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div></div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10"><h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit Packing List' : 'New Packing List'}</h2><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="PL Number *"><input value={form.pl_number || ''} onChange={e => setForm({ ...form, pl_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
                <Field label="Customer"><select value={form.customer_id || ''} onChange={e => setForm({ ...form, customer_id: e.target.value || null })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"><option value="">Select customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></Field>
                <Field label="Status"><select value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value as PackingList['status'] })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Shipping Method"><input value={form.shipping_method || ''} onChange={e => setForm({ ...form, shipping_method: e.target.value })} placeholder="Sea/Air/Express" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
                <Field label="Vessel Name"><input value={form.vessel_name || ''} onChange={e => setForm({ ...form, vessel_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
                <Field label="B/L No."><input value={form.bl_number || ''} onChange={e => setForm({ ...form, bl_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
                <Field label="Container No."><input value={form.container_number || ''} onChange={e => setForm({ ...form, container_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Port of Loading"><input value={form.port_of_loading || ''} onChange={e => setForm({ ...form, port_of_loading: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
                <Field label="Port of Discharge"><input value={form.port_of_discharge || ''} onChange={e => setForm({ ...form, port_of_discharge: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-slate-700">Packing Details</h3><button onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-medium"><Plus className="w-3.5 h-3.5" />Add Row</button></div>
                <div className="space-y-2">{items.map((item, idx) => <div key={idx} className="p-2 bg-slate-50 rounded-lg space-y-2"><div className="flex gap-2 items-center"><select value={item.product_id || ''} onChange={e => selectProduct(idx, e.target.value)} className="w-full sm:w-32 px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"><option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Product Description" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-xs" /><button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button></div><div className="grid grid-cols-2 sm:grid-cols-7 gap-2"><input type="number" value={item.quantity || 0} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" value={item.package_count || 0} onChange={e => updateItem(idx, 'package_count', parseInt(e.target.value) || 0)} placeholder="Packages" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input value={item.package_type || ''} onChange={e => updateItem(idx, 'package_type', e.target.value)} placeholder="Package" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.001" value={item.gross_weight || 0} onChange={e => updateItem(idx, 'gross_weight', parseFloat(e.target.value) || 0)} placeholder="Gross kg" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.001" value={item.net_weight || 0} onChange={e => updateItem(idx, 'net_weight', parseFloat(e.target.value) || 0)} placeholder="Net kg" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.1" value={item.length ?? ''} onChange={e => updateItem(idx, 'length', parseFloat(e.target.value) || 0)} placeholder="L cm" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /><input type="number" step="0.1" value={item.width ?? ''} onChange={e => updateItem(idx, 'width', parseFloat(e.target.value) || 0)} placeholder="W cm" className="px-2 py-1.5 border border-slate-200 rounded text-xs" /></div><div className="flex items-center gap-2"><input type="number" step="0.1" value={item.height ?? ''} onChange={e => updateItem(idx, 'height', parseFloat(e.target.value) || 0)} placeholder="H cm" className="w-24 px-2 py-1.5 border border-slate-200 rounded text-xs" /><span className="text-xs text-slate-500">Volume: {calcVol(item.length ?? null, item.width ?? null, item.height ?? null).toFixed(3)} m³</span></div></div>)}</div>
              </div>
              <Field label="Notes"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" /></Field>
              <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-4 gap-4 text-center"><div><p className="text-xs text-slate-500">Total Gross Weight</p><p className="text-sm font-semibold text-slate-900">{totalGross.toFixed(2)} kg</p></div><div><p className="text-xs text-slate-500">Total Net Weight</p><p className="text-sm font-semibold text-slate-900">{totalNet.toFixed(2)} kg</p></div><div><p className="text-xs text-slate-500">Total Volume</p><p className="text-sm font-semibold text-slate-900">{totalVol.toFixed(3)} m³</p></div><div><p className="text-xs text-slate-500">Total Packages</p><p className="text-sm font-semibold text-slate-900">{totalPkg}</p></div></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">Cancel</button><button onClick={save} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium text-sm">{editing ? 'Save' : 'Create'}</button></div>
          </div>
        </div>
      )}

      {viewing && <PlViewModal pl={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function PlViewModal({ pl, onClose }: { pl: PackingList & { customer?: Customer; items: PlItem[] }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none print:shadow-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 print:hidden"><div className="flex items-center gap-3"><button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-lg font-semibold text-slate-900">Preview Packing List</h2></div><button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium text-sm"><Printer className="w-4 h-4" />Print / PDF</button></div>
        <div className="p-8 print:p-10" id="pi-document">
          <DocHeader title="PACKING LIST" docNumber={pl.pl_number} />
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="flex flex-wrap gap-x-6 gap-y-1 mb-6 text-sm pb-3 border-b border-slate-200">
              <div><span className="text-slate-400">Cont.Pers: </span><span className="text-slate-700">{pl.customer?.contact_name || '—'}</span></div>
              <div><span className="text-slate-400">Company: </span><span className="text-slate-700">{pl.customer?.company_name || '—'}</span></div>
              <div><span className="text-slate-400">Address: </span><span className="text-slate-700">{pl.customer?.address || '—'}</span></div>
              <div><span className="text-slate-400">Tel. No.: </span><span className="text-slate-700">{pl.customer?.phone || '—'}</span></div>
              <div><span className="text-slate-400">E-mail: </span><span className="text-slate-700">{pl.customer?.email || '—'}</span></div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Shipment Details</p><div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="text-slate-900">{formatDate(pl.created_at)}</span></div><div className="flex justify-between"><span className="text-slate-500">Shipping Method:</span><span className="text-slate-900">{pl.shipping_method || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">Vessel Name:</span><span className="text-slate-900">{pl.vessel_name || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">B/L No.:</span><span className="text-slate-900">{pl.bl_number || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">Container No.:</span><span className="text-slate-900">{pl.container_number || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">Port of Loading:</span><span className="text-slate-900">{pl.port_of_loading || '—'}</span></div><div className="flex justify-between"><span className="text-slate-500">Port of Discharge:</span><span className="text-slate-900">{pl.port_of_discharge || '—'}</span></div></div></div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6"><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Total Gross Weight</p><p className="text-sm font-semibold text-slate-900">{pl.total_gross_weight} kg</p></div><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Total Net Weight</p><p className="text-sm font-semibold text-slate-900">{pl.total_net_weight} kg</p></div><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Total Volume</p><p className="text-sm font-semibold text-slate-900">{pl.total_volume} m³</p></div><div className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xs text-slate-500">Total Packages</p><p className="text-sm font-semibold text-slate-900">{pl.total_packages}</p></div></div>
          <table className="w-full text-sm mb-6"><thead><tr className="bg-slate-900 text-white"><th className="px-3 py-2 text-center font-medium rounded-l">#</th><th className="px-3 py-2 text-center font-medium">Description</th><th className="px-3 py-2 text-center font-medium">Qty</th><th className="px-3 py-2 text-center font-medium">Packages</th><th className="px-3 py-2 text-center font-medium">Package</th><th className="px-3 py-2 text-center font-medium">Gross Wt. (kg)</th><th className="px-3 py-2 text-center font-medium">Net Wt. (kg)</th><th className="px-3 py-2 text-center font-medium rounded-r">Volume (m³)</th></tr></thead><tbody>{pl.items.length === 0 ? <tr><td colSpan={8} className="text-center py-6 text-slate-400">No items</td></tr> : pl.items.map((item, idx) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2.5 text-slate-500">{idx + 1}</td><td className="px-3 py-2.5 text-slate-900">{item.description}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.quantity}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.package_count}</td><td className="px-3 py-2.5 text-slate-600">{item.package_type}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.gross_weight}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.net_weight}</td><td className="px-3 py-2.5 text-right text-slate-600">{item.volume.toFixed(3)}</td></tr>)}</tbody></table>
          {pl.notes && <div className="mb-6"><p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p><p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{pl.notes}</p></div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}
