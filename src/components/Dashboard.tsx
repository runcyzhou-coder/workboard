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
    draft: 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]', sent: 'bg-[#EEF2F7] text-[#3B5A7A] border border-[#C7D5E6]', accepted: 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
    rejected: 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6]', expired: 'bg-[#FDF6E3] text-[#92660A] border border-[#E8D9A8]', confirmed: 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]',
    cancelled: 'bg-[#FDF2F2] text-[#9B2C2C] border border-[#F5C6C6]', prospect: 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]', negotiating: 'bg-[#FDF6E3] text-[#92660A] border border-[#E8D9A8]',
    active: 'bg-[#F0F5F2] text-[#2F5D50] border border-[#C2D6C8]', inactive: 'bg-[#F2EBDC] text-[#78716C] border border-[#E0D5C1]',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#2D2A26]">仪表盘</h1>
        <p className="text-[#78716C] mt-1 font-handwriting text-[15px]">外贸业务总览与快捷入口</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group bg-[#FFFDF9] rounded-xl p-5 border border-[#E8E2D5] shadow-[0_2px_8px_rgba(45,42,38,0.04)] transition-all duration-200 hover:border-[#524E48]/40 hover:shadow-[0_4px_16px_rgba(45,42,38,0.06)] hover:-translate-y-0.5 text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={classNames('w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center', card.color)}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
                </div>
                <ArrowRight className="w-4 h-4 text-[#78716C] group-hover:text-[#2D2A26] group-hover:translate-x-1 transition-all" strokeWidth={1.75} />
              </div>
              <p className="text-2xl font-serif font-bold text-[#2D2A26]">{loading ? '—' : card.value}</p>
              <p className="text-sm text-[#5C5246] mt-0.5">{card.label}</p>
              <p className="text-xs text-[#78716C] mt-1">{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E8E2D5] shadow-[0_2px_8px_rgba(45,42,38,0.04)] p-5">
        <h2 className="text-lg font-serif font-semibold text-[#2D2A26] mb-4">快捷操作</h2>
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
                className="group flex items-center gap-2.5 px-4 py-3 rounded-lg border border-dashed border-[#524E48]/25 bg-[#F7F3EB] font-medium text-sm text-[#5C5246] hover:bg-[#F2EBDC] hover:border-[#C25932] hover:text-[#2D2A26] transition-all"
              >
                <Icon className="w-[18px] h-[18px] text-[#78716C] group-hover:text-[#C25932]" strokeWidth={1.75} />
                <span className="flex-1 text-left">{action.label}</span>
                <kbd className="bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1] rounded px-1.5 py-0.5 text-[10px] font-mono">
                  {action.kbd}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent PIs and Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E8E2D5] shadow-[0_2px_8px_rgba(45,42,38,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-semibold text-[#2D2A26]">最近形式发票</h2>
            <button onClick={() => onNavigate('document-center')} className="text-sm text-[#C25932] hover:text-[#A94A26] font-medium">
              查看全部
            </button>
          </div>
          {recentPIs.length === 0 ? (
            <div className="text-center py-8 text-[#78716C]">
              <FileText className="w-10 h-10 mx-auto mb-2 text-[#E0D5C1]" strokeWidth={1.75} />
              <p className="text-sm">暂无形式发票</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPIs.map((pi) => (
                <div key={pi.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F2EBDC] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2D2A26] truncate">{pi.pi_number}</p>
                    <p className="text-xs text-[#78716C] truncate">
                      {pi.customer?.company_name || '未关联客户'} · {formatDate(pi.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded-md text-xs font-medium', statusColors[pi.status] || 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]')}>
                      {statusLabels[pi.status] || pi.status}
                    </span>
                    <span className="text-sm font-semibold text-[#2D2A26] whitespace-nowrap">{formatCurrency(pi.total_amount, pi.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF9] rounded-xl border border-[#E8E2D5] shadow-[0_2px_8px_rgba(45,42,38,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-semibold text-[#2D2A26]">最近报价单</h2>
            <button onClick={() => onNavigate('document-center')} className="text-sm text-[#C25932] hover:text-[#A94A26] font-medium">
              查看全部
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <div className="text-center py-8 text-[#78716C]">
              <Quote className="w-10 h-10 mx-auto mb-2 text-[#E0D5C1]" strokeWidth={1.75} />
              <p className="text-sm">暂无报价单</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentQuotes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F2EBDC] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2D2A26] truncate">{q.quote_number}</p>
                    <p className="text-xs text-[#78716C] truncate">
                      {q.customer?.company_name || '未关联客户'} · {formatDate(q.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('px-2 py-0.5 rounded-md text-xs font-medium', statusColors[q.status] || 'bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1]')}>
                      {statusLabels[q.status] || q.status}
                    </span>
                    <span className="text-sm font-semibold text-[#2D2A26] whitespace-nowrap">{formatCurrency(q.total_amount, q.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trade tips */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E8E2D5] shadow-[0_2px_8px_rgba(45,42,38,0.04)] p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#D97706]/[0.08] blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[#C25932] flex items-center justify-center shadow-[2px_2px_0px_0px_#2B2927]">
              <Globe2 className="w-5 h-5 text-[#FAF7F2]" strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#2D2A26]">外贸每日一贴</h2>
          </div>
          <p className="text-[#5C5246] text-sm leading-relaxed">
            "FOB（船上交货）条件下，卖方负责将货物运到装运港船上并承担到此为止的费用和风险；买方负责租船订舱、支付海运费和保险。确认报价时务必明确贸易术语，避免费用归属产生争议。"
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-[#78716C]">
            <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="font-mono">贸易术语 · Incoterms 2020</span>
          </div>
        </div>
      </div>
    </div>
  );
}
