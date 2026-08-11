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
      const prodCount = products.count ?? (products.data as any[] | null)?.length ?? 0;
      const quoteCount = quotations.count ?? (quotations.data as any[] | null)?.length ?? 0;
      const piCount = pis.count ?? (pis.data as any[] | null)?.length ?? 0;
      setStats({
        customers: custData?.length || 0,
        activeCustomers: custData?.filter(c => c.status === 'active').length || 0,
        products: prodCount,
        quotations: quoteCount,
        pis: piCount,
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
    draft: 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]', sent: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20', expired: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', confirmed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20', prospect: 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]', negotiating: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', inactive: 'bg-white/[0.06] text-zinc-500 border border-white/[0.08]',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">仪表盘</h1>
        <p className="text-zinc-500 mt-1">外贸业务总览与快捷入口</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group bg-[#131316] rounded-xl p-5 border border-white/[0.08] backdrop-blur-md transition-all duration-200 hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={classNames('w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-2xl font-bold text-zinc-100">{loading ? '—' : card.value}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{card.label}</p>
              <p className="text-xs text-zinc-500 mt-1">{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-[#131316] rounded-xl border border-white/[0.08] backdrop-blur-md p-5">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '新建客户', page: 'customers' as Page, icon: Users, kbd: '⌘1' },
            { label: '添加产品', page: 'products' as Page, icon: Package, kbd: '⌘2' },
            { label: '创建报价', page: 'document-center' as Page, icon: Quote, kbd: '⌘3' },
            { label: '生成PI', page: 'document-center' as Page, icon: FileText, kbd: '⌘4' },
            { label: '防亏核算', page: 'profit-calculator' as Page, icon: Calculator, kbd: '⌘5' },
            { label: '新建询盘', page: 'inquiries' as Page, icon: Briefcase, kbd: '⌘6' },
            { label: '售后处理', page: 'after-sales' as Page, icon: Headphones, kbd: '⌘7' },
            { label: '贸易工具', page: 'tools' as Page, icon: Globe2, kbd: '⌘8' },
            { label: '查看客户', page: 'customers' as Page, icon: TrendingUp, kbd: '⌘9' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className="group flex items-center gap-2.5 px-4 py-3 rounded-lg border border-white/[0.08] bg-white/[0.02] font-medium text-sm text-zinc-300 hover:bg-white/[0.05] hover:border-zinc-700 hover:text-zinc-100 transition-all"
              >
                <Icon className="w-[18px] h-[18px] text-zinc-400 group-hover:text-[#FF7A00]" />
                <span className="flex-1 text-left">{action.label}</span>
                <kbd className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/60 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-inner">
                  {action.kbd}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent PIs and Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#131316] rounded-xl border border-white/[0.08] backdrop-blur-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">最近形式发票</h2>
            <button onClick={() => onNavigate('document-center')} className="text-sm text-[#FF5232] hover:text-[#FF7A00] font-medium">
              查看全部
            </button>
          </div>
          {recentPIs.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <FileText className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">暂无形式发票</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPIs.map((pi) => (
                <div key={pi.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{pi.pi_number}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {pi.customer?.company_name || '未关联客户'} · {formatDate(pi.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded-md text-xs font-medium', statusColors[pi.status] || 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]')}>
                      {statusLabels[pi.status] || pi.status}
                    </span>
                    <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">{formatCurrency(pi.total_amount, pi.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#131316] rounded-xl border border-white/[0.08] backdrop-blur-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">最近报价单</h2>
            <button onClick={() => onNavigate('document-center')} className="text-sm text-[#FF5232] hover:text-[#FF7A00] font-medium">
              查看全部
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <Quote className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">暂无报价单</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{q.quote_number}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {q.customer?.company_name || '未关联客户'} · {formatDate(q.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded-md text-xs font-medium', statusColors[q.status] || 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]')}>
                      {statusLabels[q.status] || q.status}
                    </span>
                    <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap">{formatCurrency(q.total_amount, q.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trade tips */}
      <div className="bg-[#131316] rounded-xl border border-white/[0.08] backdrop-blur-md p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#FF5232]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF5232] to-[#FF7A00] flex items-center justify-center shadow-[0_0_18px_rgba(255,82,50,0.35)]">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-zinc-100">外贸每日一贴</h2>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            "FOB（船上交货）条件下，卖方负责将货物运到装运港船上并承担到此为止的费用和风险；买方负责租船订舱、支付海运费和保险。确认报价时务必明确贸易术语，避免费用归属产生争议。"
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">贸易术语 · Incoterms 2020</span>
          </div>
        </div>
      </div>
    </div>
  );
}
