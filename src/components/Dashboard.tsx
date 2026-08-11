import { useState, useEffect } from 'react';
import {
  Users, Package, FileText, Quote, Calculator, TrendingUp,
  ArrowRight, Briefcase, Globe2, Clock, Headphones,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, classNames } from '@/lib/utils';
import type { Page } from '@/components/Sidebar';
import type { Customer, ProformaInvoice, Quotation } from '@/lib/supabase';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

interface Stats {
  customers: number;
  activeCustomers: number;
  products: number;
  quotations: number;
  pis: number;
  piTotal: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    customers: 0, activeCustomers: 0, products: 0, quotations: 0, pis: 0, piTotal: 0,
  });
  const [recentPIs, setRecentPIs] = useState<(ProformaInvoice & { customer?: Customer })[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<(Quotation & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [customers, products, quotations, pis, piData, quoteData] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('quotations').select('*', { count: 'exact', head: true }),
        supabase.from('proforma_invoices').select('*', { count: 'exact', head: true }),
        supabase.from('proforma_invoices').select('*, customer:customers(*)').order('created_at', { ascending: false }).limit(5),
        supabase.from('quotations').select('*, customer:customers(*)').order('created_at', { ascending: false }).limit(5),
      ]);

      const custData = customers.data as Customer[] | null;
      setStats({
        customers: customers.count || 0,
        activeCustomers: custData?.filter(c => c.status === 'active').length || 0,
        products: products.count || 0,
        quotations: quotations.count || 0,
        pis: pis.count || 0,
        piTotal: (piData.data as (ProformaInvoice & { customer?: Customer })[])?.reduce((s, pi) => s + (pi.total_amount || 0), 0) || 0,
      });
      setRecentPIs((piData.data as (ProformaInvoice & { customer?: Customer })[]) || []);
      setRecentQuotes((quoteData.data as (Quotation & { customer?: Customer })[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const cards: { id: Page; label: string; value: string; sub: string; icon: typeof Users; color: string }[] = [
    { id: 'customers', label: '客户总数', value: String(stats.customers), sub: `${stats.activeCustomers} 活跃`, icon: Users, color: 'from-blue-500 to-blue-600' },
    { id: 'products', label: '产品数量', value: String(stats.products), sub: '产品库', icon: Package, color: 'from-emerald-500 to-emerald-600' },
    { id: 'document-center', label: '报价单', value: String(stats.quotations), sub: '已创建', icon: Quote, color: 'from-amber-500 to-amber-600' },
    { id: 'document-center', label: '形式发票', value: String(stats.pis), sub: formatCurrency(stats.piTotal, 'USD'), icon: FileText, color: 'from-violet-500 to-violet-600' },
  ];

  const statusLabels: Record<string, string> = {
    draft: '草稿', sent: '已发送', accepted: '已接受', rejected: '已拒绝', expired: '已过期', confirmed: '已确认', cancelled: '已取消',
    prospect: '潜在', negotiating: '谈判中', active: '活跃', inactive: '不活跃',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700', expired: 'bg-orange-100 text-orange-700', confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700', prospect: 'bg-slate-100 text-slate-600', negotiating: 'bg-amber-100 text-amber-700',
    active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-slate-500 mt-1">外贸业务总览与快捷入口</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={classNames('w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? '—' : card.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '新建客户', page: 'customers' as Page, icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-200' },
            { label: '添加产品', page: 'products' as Page, icon: Package, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
            { label: '创建报价', page: 'document-center' as Page, icon: Quote, color: 'bg-amber-50 text-amber-600 border-amber-200' },
            { label: '生成PI', page: 'document-center' as Page, icon: FileText, color: 'bg-violet-50 text-violet-600 border-violet-200' },
            { label: '防亏核算', page: 'profit-calculator' as Page, icon: Calculator, color: 'bg-rose-50 text-rose-600 border-rose-200' },
            { label: '新建询盘', page: 'inquiries' as Page, icon: Briefcase, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
            { label: '售后处理', page: 'after-sales' as Page, icon: Headphones, color: 'bg-rose-50 text-rose-600 border-rose-200' },
            { label: '贸易工具', page: 'tools' as Page, icon: Globe2, color: 'bg-teal-50 text-teal-600 border-teal-200' },
            { label: '查看客户', page: 'customers' as Page, icon: TrendingUp, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className={classNames('flex items-center gap-2.5 px-4 py-3 rounded-lg border font-medium text-sm hover:shadow-md transition-all', action.color)}
              >
                <Icon className="w-[18px] h-[18px]" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent PIs and Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">最近形式发票</h2>
            <button onClick={() => onNavigate('document-center')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </button>
          </div>
          {recentPIs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无形式发票</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPIs.map((pi) => (
                <div key={pi.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{pi.pi_number}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {pi.customer?.company_name || '未关联客户'} · {formatDate(pi.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[pi.status] || 'bg-slate-100 text-slate-600')}>
                      {statusLabels[pi.status] || pi.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(pi.total_amount, pi.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">最近报价单</h2>
            <button onClick={() => onNavigate('document-center')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Quote className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无报价单</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{q.quote_number}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {q.customer?.company_name || '未关联客户'} · {formatDate(q.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded text-xs font-medium', statusColors[q.status] || 'bg-slate-100 text-slate-600')}>
                      {statusLabels[q.status] || q.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(q.total_amount, q.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trade tips */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Globe2 className="w-6 h-6 text-cyan-400" />
          <h2 className="text-lg font-bold">外贸每日一贴</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          "FOB（船上交货）条件下，卖方负责将货物运到装运港船上并承担到此为止的费用和风险；买方负责租船订舱、支付海运费和保险。确认报价时务必明确贸易术语，避免费用归属产生争议。"
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>贸易术语 · Incoterms 2020</span>
        </div>
      </div>
    </div>
  );
}
