import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Package as PackageIcon, Boxes,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, classNames } from '@/lib/utils';
import type { Product } from '@/lib/supabase';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    if (!form.name?.trim()) return;
    if (editing) {
      await supabase.from('products').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('products').insert(form);
    }
    setShowForm(false); setEditing(null); setForm({}); load();
  }

  async function remove(id: string) {
    if (!confirm('确定删除此产品？')) return;
    await supabase.from('products').delete().eq('id', id);
    load();
  }

  function startEdit(p: Product) { setEditing(p); setForm(p); setShowForm(true); }
  function startAdd() { setEditing(null); setForm({ unit: 'piece', cost_price: 0, selling_price: 0, moq: 1, stock: 0, weight_unit: 'kg' }); setShowForm(true); }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F3EFE6]">产品管理</h1>
          <p className="text-[#8879A0] mt-1">管理产品目录、价格与包装信息</p>
        </div>
        <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#A855F7] to-[#6B21A8] text-[#F3EFE6] rounded-lg hover:bg-[#6B21A8] transition-colors font-medium text-sm">
          <Plus className="w-4 h-4" />添加产品
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名称、SKU、分类..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#1B142C]/90 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#78716C]">
          <PackageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>加载中...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#78716C]">
          <Boxes className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{search ? '没有匹配的产品' : '还没有产品，点击"添加产品"开始'}</p>
        </div>
      ) : (
        <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#161228]/60 border-b border-[#3A2D54]/50 text-left text-[#B8AEC8]">
                  <th className="px-4 py-3 font-medium">产品名称</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium text-right">成本价</th>
                  <th className="px-4 py-3 font-medium text-right">售价</th>
                  <th className="px-4 py-3 font-medium text-right">起订量</th>
                  <th className="px-4 py-3 font-medium text-right">库存</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A2D54]/50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-[#221A3A]/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#F3EFE6]">{p.name}</div>
                      {p.description && <div className="text-xs text-[#78716C] truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#B8AEC8]">{p.sku || '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-[#161228]/70 text-[#8879A0] rounded text-xs">{p.category || '—'}</span></td>
                    <td className="px-4 py-3 text-right text-[#B8AEC8]">{formatCurrency(p.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#F3EFE6]">{formatCurrency(p.selling_price)}</td>
                    <td className="px-4 py-3 text-right text-[#B8AEC8]">{p.moq} {p.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={classNames('font-medium', p.stock > 0 ? 'text-[#A855F7]' : 'text-[#F87171]')}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(p)} className="p-1.5 text-[#78716C] hover:text-[#A855F7] hover:bg-[#221A3A]/60 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => remove(p.id)} className="p-1.5 text-[#78716C] hover:text-[#F87171] hover:bg-[#3A1F1F]/80 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3A2D54]/50">
              <h2 className="text-lg font-semibold text-[#F3EFE6]">{editing ? '编辑产品' : '添加产品'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#78716C] hover:text-[#B8AEC8]"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative z-10 p-6 space-y-4">
              <Field label="产品名称 *">
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SKU">
                  <input value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="分类">
                  <input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
              </div>
              <Field label="产品描述">
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="成本价">
                  <input type="number" step="0.01" value={form.cost_price || ''} onChange={e => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="售价">
                  <input type="number" step="0.01" value={form.selling_price || ''} onChange={e => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="单位">
                  <input value={form.unit || 'piece'} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="起订量">
                  <input type="number" value={form.moq || ''} onChange={e => setForm({ ...form, moq: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="库存">
                  <input type="number" value={form.stock || ''} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="HS编码">
                  <input value={form.hs_code || ''} onChange={e => setForm({ ...form, hs_code: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Field label="重量">
                  <input type="number" step="0.001" value={form.weight ?? ''} onChange={e => setForm({ ...form, weight: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="长(cm)">
                  <input type="number" step="0.1" value={form.length ?? ''} onChange={e => setForm({ ...form, length: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="宽(cm)">
                  <input type="number" step="0.1" value={form.width ?? ''} onChange={e => setForm({ ...form, width: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
                <Field label="高(cm)">
                  <input type="number" step="0.1" value={form.height ?? ''} onChange={e => setForm({ ...form, height: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
                </Field>
              </div>
              <Field label="包装方式">
                <input value={form.packing || ''} onChange={e => setForm({ ...form, packing: e.target.value })} placeholder="如：50pcs/箱"
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
              </Field>
              <Field label="原产国">
                <input value={form.origin_country || ''} onChange={e => setForm({ ...form, origin_country: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]" />
              </Field>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#3A2D54]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[#B8AEC8] hover:text-[#F3EFE6] font-medium text-sm">取消</button>
              <button onClick={save} className="px-4 py-2 bg-gradient-to-r from-[#A855F7] to-[#6B21A8] text-[#F3EFE6] rounded-lg hover:bg-[#6B21A8] font-medium text-sm">{editing ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#F3EFE6] mb-1.5">{label}</label>
      {children}
    </div>
  );
}
