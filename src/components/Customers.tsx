import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Mail, Phone, Globe, MapPin, Edit2, Trash2, X, Tag,
  Users as UsersIcon, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import type { Customer } from '@/lib/supabase';

const statusOptions: { value: Customer['status']; label: string; color: string }[] = [
  { value: 'prospect', label: '潜在', color: 'bg-slate-100 text-slate-600' },
  { value: 'negotiating', label: '谈判中', color: 'bg-amber-100 text-amber-700' },
  { value: 'active', label: '活跃', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'inactive', label: '不活跃', color: 'bg-slate-100 text-slate-400' },
];

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [tagInput, setTagInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.country || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function save() {
    if (!form.company_name?.trim()) return;
    const payload = { ...form };
    if (editing) {
      await supabase.from('customers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('customers').insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
    setTagInput('');
    load();
  }

  async function remove(id: string) {
    if (!confirm('确定删除此客户？')) return;
    await supabase.from('customers').delete().eq('id', id);
    load();
  }

  function startEdit(c: Customer) {
    setEditing(c);
    setForm(c);
    setShowForm(true);
  }

  function startAdd() {
    setEditing(null);
    setForm({ status: 'prospect' });
    setShowForm(true);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    const tags = [...(form.tags || []), tag];
    setForm({ ...form, tags });
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: (form.tags || []).filter(t => t !== tag) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户管理</h1>
          <p className="text-slate-500 mt-1">管理外贸客户信息与跟进状态</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          新建客户
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索公司名、联系人、邮箱、国家..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>加载中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{search || filterStatus !== 'all' ? '没有匹配的客户' : '还没有客户，点击"新建客户"开始'}</p>
          </div>
        ) : (
          filtered.map(c => {
            const statusInfo = statusOptions.find(s => s.value === c.status);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{c.company_name}</h3>
                    {c.contact_name && <p className="text-sm text-slate-500 mt-0.5">{c.contact_name}</p>}
                  </div>
                  <span className={classNames('px-2 py-0.5 rounded text-xs font-medium shrink-0', statusInfo?.color)}>
                    {statusInfo?.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600">
                  {c.email && <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{c.email}</span></div>}
                  {c.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />{c.phone}</div>}
                  {c.country && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{c.country}</div>}
                  {c.website && <div className="flex items-center gap-2 truncate"><Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{c.website}</span></div>}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                )}

                {c.notes && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{c.notes}</p>}

                <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-slate-100">
                  <button onClick={() => startEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? '编辑客户' : '新建客户'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="公司名称 *">
                <input value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="联系人">
                  <input value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="状态">
                  <select value={form.status || 'prospect'} onChange={e => setForm({ ...form, status: e.target.value as Customer['status'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="邮箱">
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="电话">
                  <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="国家">
                  <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="网站">
                  <input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
              </div>
              <Field label="地址">
                <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="标签">
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="输入标签后回车"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={addTag} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
                {form.tags && form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="备注">
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">取消</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                {editing ? '保存' : '创建'}
              </button>
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
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
