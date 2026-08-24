import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, X, Edit2, Trash2, Globe, Mail, Phone, MessageCircle,
  Calendar, TrendingUp, Users, Filter, Download, Target,
  AlertCircle, ChevronDown, ChevronUp, ArrowRight, Clock,
  MapPin, Building2, Star, FileText, RefreshCw, BarChart3,
  Package, CheckCircle2, MoreHorizontal, Sparkles, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames, formatDate } from '@/lib/utils';
import type {
  DevCustomer, DevSource, CustomerType, DevStage,
  CooperationGrade, FollowupType, FollowupRecord, DailyDevLog,
} from '@/lib/supabase';

// ====== 常量定义 ======
const DEV_SOURCES: { value: DevSource; label: string; color: string }[] = [
  { value: 'google', label: 'Google开发', color: 'bg-blue-100 text-blue-700' },
  { value: 'linkedin', label: 'LinkedIn', color: 'bg-sky-100 text-sky-700' },
  { value: 'alibaba', label: 'Alibaba国际站', color: 'bg-orange-100 text-orange-700' },
  { value: 'mic', label: 'MIC', color: 'bg-amber-100 text-amber-700' },
  { value: 'globalsources', label: '环球资源', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'exhibition', label: '展会', color: 'bg-purple-100 text-purple-700' },
  { value: 'whatsapp', label: 'WhatsApp群组', color: 'bg-green-100 text-green-700' },
  { value: 'referral', label: '客户介绍', color: 'bg-pink-100 text-pink-700' },
  { value: 'email', label: '邮件开发', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'website', label: '独立站询盘', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'other', label: '其他', color: 'bg-slate-100 text-slate-700' },
];

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'trader', label: '贸易商' },
  { value: 'wholesaler', label: '批发商' },
  { value: 'retailer', label: '零售商' },
  { value: 'factory', label: '工厂' },
  { value: 'brand', label: '品牌商' },
];

const DEV_STAGES: { value: DevStage; label: string; color: string }[] = [
  { value: 'new_not_contacted', label: '新开发未触达', color: 'bg-slate-100 text-slate-700' },
  { value: 'first_email_sent', label: '已首次邮件', color: 'bg-blue-100 text-blue-700' },
  { value: 'quoted', label: '已报价', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'sample_pending', label: '待样品', color: 'bg-amber-100 text-amber-700' },
  { value: 'sample_confirmed', label: '样品确认', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'pi_pending', label: '待PI', color: 'bg-purple-100 text-purple-700' },
  { value: 'balance_pending', label: '待尾款', color: 'bg-orange-100 text-orange-700' },
  { value: 'won', label: '已成交', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: '客户流失', color: 'bg-red-100 text-red-700' },
  { value: 'dormant', label: '长期休眠', color: 'bg-gray-100 text-gray-500' },
];

const COOPERATION_GRADES: { value: CooperationGrade; label: string; color: string }[] = [
  { value: 'A', label: 'A级', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'B', label: 'B级', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'C', label: 'C级', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'D', label: 'D级', color: 'bg-slate-100 text-slate-500 border-slate-300' },
];

const FOLLOWUP_TYPES: { value: FollowupType; label: string; icon: typeof Mail }[] = [
  { value: 'email', label: '邮件', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'quote', label: '报价', icon: FileText },
  { value: 'sample', label: '样品', icon: Package },
  { value: 'call', label: '电话', icon: Phone },
  { value: 'visit', label: '拜访', icon: Users },
  { value: 'other', label: '其他', icon: MoreHorizontal },
];

// 时区-国家映射
const COUNTRY_TIMEZONES: Record<string, string> = {
  '美国': 'UTC-5~UTC-8',
  '加拿大': 'UTC-3.5~UTC-8',
  '英国': 'UTC+0',
  '德国': 'UTC+1',
  '法国': 'UTC+1',
  '意大利': 'UTC+1',
  '西班牙': 'UTC+1',
  '荷兰': 'UTC+1',
  '俄罗斯': 'UTC+2~UTC+12',
  '澳大利亚': 'UTC+8~UTC+11',
  '日本': 'UTC+9',
  '韩国': 'UTC+9',
  '印度': 'UTC+5.5',
  '东南亚': 'UTC+7~UTC+8',
  '中东': 'UTC+3~UTC+4',
  '非洲': 'UTC+0~UTC+3',
  '南美': 'UTC-3~UTC-5',
};

function getStageInfo(stage: DevStage) {
  return DEV_STAGES.find(s => s.value === stage) || DEV_STAGES[0];
}
function getSourceInfo(source: DevSource) {
  return DEV_SOURCES.find(s => s.value === source) || DEV_SOURCES[10];
}
function getGradeInfo(grade: CooperationGrade) {
  return COOPERATION_GRADES.find(g => g.value === grade) || COOPERATION_GRADES[3];
}

type TabType = 'list' | 'followup' | 'review';

// ====== Toast 组件 ======
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const styles = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={classNames('fixed bottom-4 right-4 px-4 py-3 rounded-lg border shadow-lg z-50 text-sm font-medium', styles[type])}>
      {message}
    </div>
  );
}

// ====== 主组件 ======
export function DevCustomers() {
  const [tab, setTab] = useState<TabType>('list');
  const [customers, setCustomers] = useState<DevCustomer[]>([]);
  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyDevLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DevCustomer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<DevCustomer | null>(null);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupCustomer, setFollowupCustomer] = useState<DevCustomer | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, fRes, dRes] = await Promise.all([
        supabase.from('dev_customers').select('*').order('created_at', { ascending: false }),
        supabase.from('followup_records').select('*').order('followup_date', { ascending: false }),
        supabase.from('daily_dev_logs').select('*').order('log_date', { ascending: false }),
      ]);

      // Supabase 成功就用 Supabase 数据，否则降级 localStorage
      if (cRes.error) {
        console.error('[客户开发] Supabase查询失败，尝试localStorage:', cRes.error);
        // 降级读取 localStorage
        const rawC = localStorage.getItem('wb_dev_customers');
        const localC = rawC ? JSON.parse(rawC) : [];
        const rawF = localStorage.getItem('wb_followup_records');
        const localF = rawF ? JSON.parse(rawF) : [];
        const rawD = localStorage.getItem('wb_daily_dev_logs');
        const localD = rawD ? JSON.parse(rawD) : [];
        localC.sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
        localF.sort((a: any, b: any) => (a.followup_date < b.followup_date ? 1 : -1));
        localD.sort((a: any, b: any) => (a.log_date < b.log_date ? 1 : -1));
        setCustomers(localC);
        setFollowups(localF);
        setDailyLogs(localD);
      } else {
        setCustomers(cRes.data || []);
        setFollowups(fRes.data || []);
        setDailyLogs(dRes.data || []);
      }
    } catch (e) {
      console.error('[客户开发] 加载失败:', e);
      // 最终降级
      const rawC = localStorage.getItem('wb_dev_customers');
      const localC = rawC ? JSON.parse(rawC) : [];
      setCustomers(localC);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ====== 筛选 ======
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        const match = (c.company_name_en || '').toLowerCase().includes(q)
          || (c.company_name || '').toLowerCase().includes(q)
          || (c.contact_name || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q)
          || (c.country || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterCountry && c.country !== filterCountry) return false;
      if (filterSource && c.dev_source !== filterSource) return false;
      if (filterStage && c.dev_stage !== filterStage) return false;
      if (filterGrade && c.cooperation_grade !== filterGrade) return false;
      return true;
    });
  }, [customers, search, filterCountry, filterSource, filterStage, filterGrade]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => { if (c.country) set.add(c.country); });
    return Array.from(set).sort();
  }, [customers]);

  // ====== 统计 ======
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekStr = thisWeek.toISOString().slice(0, 10);
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const monthStr = thisMonth.toISOString().slice(0, 10);

    return {
      total: customers.length,
      todayNew: customers.filter(c => c.daily_dev_date === today).length,
      weekNew: customers.filter(c => c.daily_dev_date && c.daily_dev_date >= weekStr).length,
      monthNew: customers.filter(c => c.daily_dev_date && c.daily_dev_date >= monthStr).length,
      won: customers.filter(c => c.dev_stage === 'won').length,
      lost: customers.filter(c => c.dev_stage === 'lost').length,
      gradeA: customers.filter(c => c.cooperation_grade === 'A').length,
      gradeB: customers.filter(c => c.cooperation_grade === 'B').length,
    };
  }, [customers]);

  // ====== 复盘数据 ======
  const reviewData = useMemo(() => {
    // 渠道复盘
    const sourceStats = DEV_SOURCES.map(src => {
      const list = customers.filter(c => c.dev_source === src.value);
      const won = list.filter(c => c.dev_stage === 'won').length;
      return {
        source: src,
        total: list.length,
        won,
        conversionRate: list.length > 0 ? (won / list.length * 100).toFixed(1) : '0',
      };
    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

    // 国家复盘
    const countryStats = countries.map(country => {
      const list = customers.filter(c => c.country === country);
      const won = list.filter(c => c.dev_stage === 'won').length;
      const lost = list.filter(c => c.dev_stage === 'lost').length;
      return {
        country,
        total: list.length,
        won,
        lost,
        conversionRate: list.length > 0 ? (won / list.length * 100).toFixed(1) : '0',
      };
    }).sort((a, b) => b.total - a.total);

    // 流失原因统计
    const lossReasons = new Map<string, number>();
    customers.filter(c => c.dev_stage === 'lost' && c.loss_reason).forEach(c => {
      const r = c.loss_reason!;
      lossReasons.set(r, (lossReasons.get(r) || 0) + 1);
    });
    const lossStats = Array.from(lossReasons.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

    // 跟进及时率
    const todayStr = new Date().toISOString().slice(0, 10);
    const needFollowup = customers.filter(c => c.next_followup_date && c.next_followup_date <= todayStr && c.dev_stage !== 'won' && c.dev_stage !== 'lost');
    const overdueFollowup = needFollowup.filter(c => c.next_followup_date! < todayStr);

    // 邮件回复率
    const emailSent = customers.filter(c => c.dev_stage !== 'new_not_contacted').length;
    const replied = customers.filter(c => c.followup_count > 1 || c.dev_stage === 'quoted' || c.dev_stage === 'won').length;

    return {
      sourceStats,
      countryStats,
      lossStats,
      needFollowup: needFollowup.length,
      overdueFollowup: overdueFollowup.length,
      emailReplyRate: emailSent > 0 ? (replied / emailSent * 100).toFixed(1) : '0',
      inquiryConversion: customers.length > 0 ? (customers.filter(c => c.dev_stage === 'won').length / customers.length * 100).toFixed(1) : '0',
    };
  }, [customers, countries]);

  function startAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function startEdit(c: DevCustomer) {
    setEditing(c);
    setShowForm(true);
  }
  function startFollowup(c: DevCustomer) {
    setFollowupCustomer(c);
    setShowFollowupForm(true);
  }
  function viewDetail(c: DevCustomer) {
    setDetailCustomer(c);
  }

  async function deleteCustomer(id: string) {
    if (!confirm('确定删除该客户？所有跟进记录也会被删除。')) return;
    try {
      const { error } = await supabase.from('dev_customers').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('[客户开发] Supabase删除失败，尝试localStorage:', e);
      // 降级 localStorage
      const rawC = localStorage.getItem('wb_dev_customers');
      const listC = rawC ? JSON.parse(rawC) : [];
      const filtered = listC.filter((c: any) => c.id !== id);
      localStorage.setItem('wb_dev_customers', JSON.stringify(filtered));
      // 同时删除跟进记录
      const rawF = localStorage.getItem('wb_followup_records');
      const listF = rawF ? JSON.parse(rawF) : [];
      const filteredF = listF.filter((f: any) => f.customer_id !== id);
      localStorage.setItem('wb_followup_records', JSON.stringify(filteredF));
    }
    showToast('success', '客户已删除');
    load();
  }

  async function updateStage(c: DevCustomer, stage: DevStage) {
    const updates: any = { dev_stage: stage, updated_at: new Date().toISOString() };
    if (stage === 'won') updates.lost_at = null;
    if (stage === 'lost') {
      updates.lost_at = new Date().toISOString().slice(0, 10);
      const reason = prompt('请输入流失原因（如：价格高、交期、认证、已有供应商、无需求）');
      if (reason) updates.loss_reason = reason;
    }
    try {
      const { error } = await supabase.from('dev_customers').update(updates).eq('id', c.id);
      if (error) throw error;
    } catch (e) {
      console.error('[客户开发] Supabase更新失败，尝试localStorage:', e);
      const rawC = localStorage.getItem('wb_dev_customers');
      const listC = rawC ? JSON.parse(rawC) : [];
      const idx = listC.findIndex((item: any) => item.id === c.id);
      if (idx >= 0) {
        listC[idx] = { ...listC[idx], ...updates };
        localStorage.setItem('wb_dev_customers', JSON.stringify(listC));
      }
    }
    load();
  }

  // ====== 导出Excel ======
  function exportExcel() {
    const headers = ['公司英文名', '公司名', '国家', '城市', '官网', '联系人', '职位', 'WhatsApp', '邮箱', '电话', 'Skype', 'LinkedIn', '开发来源', '客户类型', '主营产品', '主营市场', '客户规模', '成立年限', '现有供应商', '采购频次', '采购量', '目标价格区间', '合作评级', '开发阶段', '最后联系日期', '下次跟进日期', '跟进次数', '流失原因', '备注'];
    const rows = filteredCustomers.map(c => [
      c.company_name_en, c.company_name, c.country, c.city, c.website,
      c.contact_name, c.contact_title, c.whatsapp, c.email, c.phone, c.skype, c.linkedin_url,
      getSourceInfo(c.dev_source).label, c.customer_type ? CUSTOMER_TYPES.find(t => t.value === c.customer_type)?.label || '' : '',
      c.main_products, c.main_market, c.company_size, c.founded_year, c.current_suppliers,
      c.purchase_frequency, c.purchase_volume, c.target_price_range,
      c.cooperation_grade, getStageInfo(c.dev_stage).label, c.last_contact_date, c.next_followup_date,
      c.followup_count, c.loss_reason, c.notes,
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `外贸客户台账_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', '已导出客户台账');
  }

  // ====== 去重检查 ======
  function checkDuplicate(companyName: string, website: string, excludeId?: string): boolean {
    return customers.some(c => {
      if (excludeId && c.id === excludeId) return false;
      const nameMatch = companyName && c.company_name_en.toLowerCase() === companyName.toLowerCase();
      const siteMatch = website && c.website && c.website.replace(/https?:\/\//, '').replace(/\/$/, '') === website.replace(/https?:\/\//, '').replace(/\/$/, '');
      return nameMatch || siteMatch;
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><RefreshCw className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户开发</h1>
          <p className="text-sm text-slate-500 mt-1">每日客户开发记录 · 跟进管理 · 复盘分析</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" /> 导出台账
          </button>
          <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 新建客户
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: '总客户', value: stats.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: '今日新增', value: stats.todayNew, icon: Plus, color: 'text-green-600 bg-green-50' },
          { label: '本周新增', value: stats.weekNew, icon: Calendar, color: 'text-cyan-600 bg-cyan-50' },
          { label: '本月新增', value: stats.monthNew, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
          { label: '已成交', value: stats.won, icon: Star, color: 'text-emerald-600 bg-emerald-50' },
          { label: '客户流失', value: stats.lost, icon: AlertCircle, color: 'text-red-600 bg-red-50' },
          { label: 'A级客户', value: stats.gradeA, icon: Target, color: 'text-purple-600 bg-purple-50' },
          { label: 'B级客户', value: stats.gradeB, icon: Target, color: 'bg-amber-50 text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={classNames('w-8 h-8 rounded-lg flex items-center justify-center mb-2', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'list' as TabType, label: '客户名单库', icon: Users },
          { id: 'followup' as TabType, label: '跟进管理', icon: Clock },
          { id: 'review' as TabType, label: '复盘分析', icon: BarChart3 },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={classNames(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {tab === 'list' && (
        <CustomerList
          customers={filteredCustomers}
          countries={countries}
          search={search} setSearch={setSearch}
          filterCountry={filterCountry} setFilterCountry={setFilterCountry}
          filterSource={filterSource} setFilterSource={setFilterSource}
          filterStage={filterStage} setFilterStage={setFilterStage}
          filterGrade={filterGrade} setFilterGrade={setFilterGrade}
          onEdit={startEdit} onDelete={deleteCustomer} onFollowup={startFollowup}
          onView={viewDetail} onStageChange={updateStage}
        />
      )}

      {tab === 'followup' && (
        <FollowupTab
          customers={customers} followups={followups}
          onFollowup={startFollowup} onView={viewDetail}
        />
      )}

      {tab === 'review' && (
        <ReviewTab reviewData={reviewData} dailyLogs={dailyLogs} customers={customers} />
      )}

      {/* 表单弹窗 */}
      {showForm && (
        <CustomerForm
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); showToast('success', editing ? '客户已更新' : '客户已创建'); }}
          checkDuplicate={checkDuplicate}
          showToast={showToast}
        />
      )}

      {/* 跟进表单弹窗 */}
      {showFollowupForm && followupCustomer && (
        <FollowupForm
          customer={followupCustomer}
          followups={followups.filter(f => f.customer_id === followupCustomer.id)}
          onClose={() => setShowFollowupForm(false)}
          onSaved={() => { setShowFollowupForm(false); load(); showToast('success', '跟进记录已保存'); }}
        />
      )}

      {/* 详情弹窗 */}
      {detailCustomer && (
        <CustomerDetail
          customer={detailCustomer}
          followups={followups.filter(f => f.customer_id === detailCustomer.id)}
          onClose={() => setDetailCustomer(null)}
          onEdit={() => { setDetailCustomer(null); startEdit(detailCustomer); }}
          onFollowup={() => { const c = detailCustomer; setDetailCustomer(null); startFollowup(c); }}
        />
      )}
    </div>
  );
}

// ====== 子组件：客户列表 ======
interface CustomerListProps {
  customers: DevCustomer[];
  countries: string[];
  search: string; setSearch: (v: string) => void;
  filterCountry: string; setFilterCountry: (v: string) => void;
  filterSource: string; setFilterSource: (v: string) => void;
  filterStage: string; setFilterStage: (v: string) => void;
  filterGrade: string; setFilterGrade: (v: string) => void;
  onEdit: (c: DevCustomer) => void;
  onDelete: (id: string) => void;
  onFollowup: (c: DevCustomer) => void;
  onView: (c: DevCustomer) => void;
  onStageChange: (c: DevCustomer, stage: DevStage) => void;
}

function CustomerList(props: CustomerListProps) {
  const { customers, countries, search, setSearch, filterCountry, setFilterCountry,
    filterSource, setFilterSource, filterStage, setFilterStage, filterGrade, setFilterGrade,
    onEdit, onDelete, onFollowup, onView, onStageChange } = props;

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索公司名、联系人、邮箱、国家..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全部国家</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全部渠道</option>
            {DEV_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全部阶段</option>
            {DEV_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全部评级</option>
            {COOPERATION_GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          {(search || filterCountry || filterSource || filterStage || filterGrade) && (
            <button onClick={() => { setSearch(''); setFilterCountry(''); setFilterSource(''); setFilterStage(''); setFilterGrade(''); }}
              className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 列表 */}
      {customers.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无客户数据</p>
          <p className="text-sm mt-1">点击"新建客户"开始记录你的外贸客户开发</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {customers.map(c => {
            const stageInfo = getStageInfo(c.dev_stage);
            const srcInfo = getSourceInfo(c.dev_source);
            const gradeInfo = c.cooperation_grade ? getGradeInfo(c.cooperation_grade) : null;
            const today = new Date().toISOString().slice(0, 10);
            const isOverdue = c.next_followup_date && c.next_followup_date < today && c.dev_stage !== 'won' && c.dev_stage !== 'lost';

            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onView(c)}>
                {/* 头部 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{c.company_name_en}</h3>
                    {c.company_name && <p className="text-xs text-slate-500 truncate">{c.company_name}</p>}
                  </div>
                  {gradeInfo && (
                    <span className={classNames('text-xs font-bold px-2 py-0.5 rounded border', gradeInfo.color)}>
                      {gradeInfo.label}
                    </span>
                  )}
                </div>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={classNames('text-[10px] px-2 py-0.5 rounded-full', srcInfo.color)}>{srcInfo.label}</span>
                  <span className={classNames('text-[10px] px-2 py-0.5 rounded-full', stageInfo.color)}>{stageInfo.label}</span>
                  {c.country && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.country}</span>}
                  {isOverdue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">跟进逾期</span>}
                </div>

                {/* 联系人 */}
                <div className="space-y-1 text-xs text-slate-600 mb-3">
                  {c.contact_name && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-slate-400" /> {c.contact_name}
                      {c.contact_title && <span className="text-slate-400">· {c.contact_title}</span>}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" /> <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.whatsapp && (
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-3 h-3 text-slate-400" /> {c.whatsapp}
                    </div>
                  )}
                  {c.main_products && (
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-slate-400" /> <span className="truncate">{c.main_products}</span>
                    </div>
                  )}
                </div>

                {/* 跟进 */}
                <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                  <div className="text-slate-400">
                    {c.last_contact_date ? `最后联系: ${formatDate(c.last_contact_date)}` : '未联系'}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onFollowup(c); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="跟进">
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="编辑">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('确定删除？')) onDelete(c.id); }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="删除">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {c.next_followup_date && (
                  <div className={classNames('text-[10px] mt-1', isOverdue ? 'text-red-600 font-medium' : 'text-slate-400')}>
                    下次跟进: {formatDate(c.next_followup_date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====== 子组件：跟进管理 ======
function FollowupTab({ customers, followups, onFollowup, onView }: {
  customers: DevCustomer[];
  followups: FollowupRecord[];
  onFollowup: (c: DevCustomer) => void;
  onView: (c: DevCustomer) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const needFollowup = customers.filter(c =>
    c.next_followup_date && c.next_followup_date <= today && c.dev_stage !== 'won' && c.dev_stage !== 'lost' && c.dev_stage !== 'dormant'
  ).sort((a, b) => (a.next_followup_date! > b.next_followup_date!) ? 1 : -1);
  const recentFollowups = followups.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* 待跟进 */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" /> 待跟进客户 ({needFollowup.length})
        </h3>
        {needFollowup.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            暂无待跟进客户，所有客户都在跟进周期内
          </div>
        ) : (
          <div className="space-y-2">
            {needFollowup.map(c => {
              const overdue = c.next_followup_date! < today;
              const days = Math.ceil((new Date(c.next_followup_date!).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between hover:shadow-sm">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={classNames('w-2 h-2 rounded-full', overdue ? 'bg-red-500' : 'bg-amber-400')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 truncate cursor-pointer hover:text-blue-600" onClick={() => onView(c)}>{c.company_name_en}</span>
                        <span className={classNames('text-[10px] px-1.5 py-0.5 rounded-full', getStageInfo(c.dev_stage).color)}>{getStageInfo(c.dev_stage).label}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.contact_name} · {c.country} · 计划跟进: {formatDate(c.next_followup_date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={classNames('text-xs font-medium', overdue ? 'text-red-600' : 'text-amber-600')}>
                      {overdue ? `逾期${Math.abs(days)}天` : `今日跟进`}
                    </span>
                    <button onClick={() => onFollowup(c)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                      跟进
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 最近跟进记录 */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" /> 最近跟进记录
        </h3>
        {recentFollowups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            暂无跟进记录
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {recentFollowups.map(f => {
              const cust = customers.find(c => c.id === f.customer_id);
              const typeInfo = FOLLOWUP_TYPES.find(t => t.value === f.type);
              const Icon = typeInfo?.icon || Mail;
              return (
                <div key={f.id} className="p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-slate-900 truncate">{cust?.company_name_en || '未知客户'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{typeInfo?.label}</span>
                      <span className="text-xs text-slate-400">{formatDate(f.followup_date)}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{f.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ====== 子组件：复盘分析 ======
function ReviewTab({ reviewData, dailyLogs, customers }: {
  reviewData: any;
  dailyLogs: DailyDevLog[];
  customers: DevCustomer[];
}) {
  const recentLogs = dailyLogs.slice(0, 30);

  return (
    <div className="space-y-6">
      {/* 效率指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">邮件回复率</div>
          <div className="text-2xl font-bold text-blue-600">{reviewData.emailReplyRate}%</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">询盘转化率</div>
          <div className="text-2xl font-bold text-green-600">{reviewData.inquiryConversion}%</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">待跟进</div>
          <div className="text-2xl font-bold text-amber-600">{reviewData.needFollowup}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">逾期跟进</div>
          <div className="text-2xl font-bold text-red-600">{reviewData.overdueFollowup}</div>
        </div>
      </div>

      {/* 渠道复盘 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" /> 渠道复盘 - 哪个渠道开发质量最高
        </h3>
        {reviewData.sourceStats.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {reviewData.sourceStats.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className={classNames('text-xs px-2 py-1 rounded-full w-28 text-center', s.source.color)}>{s.source.label}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600">开发 {s.total} 个</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-green-600">成交 {s.won} 个</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-medium text-blue-600">转化率 {s.conversionRate}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.conversionRate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 国家复盘 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-green-500" /> 国家复盘 - 哪些国家意向最高
        </h3>
        {reviewData.countryStats.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">暂无数据</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {reviewData.countryStats.map((c: any, i: number) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-slate-900">{c.country}</span>
                  <span className="text-xs font-medium text-blue-600">{c.conversionRate}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>开发 {c.total}</span>
                  <span className="text-green-600">成交 {c.won}</span>
                  <span className="text-red-600">流失 {c.lost}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 流失复盘 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" /> 流失复盘 - 客户流失原因统计
        </h3>
        {reviewData.lossStats.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">暂无流失记录</p>
        ) : (
          <div className="space-y-2">
            {reviewData.lossStats.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 w-40">{l.reason}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(l.count / reviewData.lossStats[0].count * 100, 15)}%` }}>
                    <span className="text-xs text-white font-medium">{l.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 每日开发统计 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-500" /> 每日开发统计
        </h3>
        {recentLogs.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">暂无每日记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="text-left py-2 px-2">日期</th>
                  <th className="text-center py-2 px-2">新增客户</th>
                  <th className="text-center py-2 px-2">发邮件</th>
                  <th className="text-center py-2 px-2">回复数</th>
                  <th className="text-center py-2 px-2">报价数</th>
                  <th className="text-center py-2 px-2">样品数</th>
                  <th className="text-center py-2 px-2">成交单</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-700">{formatDate(log.log_date)}</td>
                    <td className="text-center py-2 px-2 font-medium text-blue-600">{log.new_customers_count}</td>
                    <td className="text-center py-2 px-2">{log.emails_sent}</td>
                    <td className="text-center py-2 px-2 text-green-600">{log.replies_received}</td>
                    <td className="text-center py-2 px-2">{log.quotes_sent}</td>
                    <td className="text-center py-2 px-2 text-amber-600">{log.samples_sent}</td>
                    <td className="text-center py-2 px-2 font-bold text-emerald-600">{log.orders_won}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== 子组件：客户表单 ======
function CustomerForm({ editing, onClose, onSaved, checkDuplicate, showToast }: {
  editing: DevCustomer | null;
  onClose: () => void;
  onSaved: () => void;
  checkDuplicate: (name: string, website: string, excludeId?: string) => boolean;
  showToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [form, setForm] = useState<any>({
    company_name_en: editing?.company_name_en || '',
    company_name: editing?.company_name || '',
    country: editing?.country || '',
    city: editing?.city || '',
    website: editing?.website || '',
    customer_type: editing?.customer_type || '',
    main_market: editing?.main_market || '',
    main_products: editing?.main_products || '',
    dev_source: editing?.dev_source || 'google',
    dev_source_detail: editing?.dev_source_detail || '',
    contact_name: editing?.contact_name || '',
    contact_title: editing?.contact_title || '',
    whatsapp: editing?.whatsapp || '',
    email: editing?.email || '',
    phone: editing?.phone || '',
    skype: editing?.skype || '',
    linkedin_url: editing?.linkedin_url || '',
    timezone: editing?.timezone || '',
    company_size: editing?.company_size || '',
    founded_year: editing?.founded_year || '',
    main_sales_region: editing?.main_sales_region || '',
    current_suppliers: editing?.current_suppliers || '',
    purchase_frequency: editing?.purchase_frequency || '',
    purchase_volume: editing?.purchase_volume || '',
    target_price_range: editing?.target_price_range || '',
    credit_status: editing?.credit_status || '',
    has_brand: editing?.has_brand ?? '',
    has_distribution: editing?.has_distribution ?? '',
    pain_points: editing?.pain_points || '',
    cooperation_grade: editing?.cooperation_grade || '',
    backgound_notes: editing?.backgound_notes || '',
    inquiry_products: editing?.inquiry_products || '',
    inquiry_specs: editing?.inquiry_specs || '',
    target_price: editing?.target_price || '',
    moq_requirement: editing?.moq_requirement || '',
    certification_needs: editing?.certification_needs || '',
    dev_stage: editing?.dev_stage || 'new_not_contacted',
    next_followup_date: editing?.next_followup_date || '',
    daily_dev_date: editing?.daily_dev_date || new Date().toISOString().slice(0, 10),
    notes: editing?.notes || '',
  });
  const [section, setSection] = useState<'basic' | 'contact' | 'background' | 'business'>('basic');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const update = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));

  // AI 分析客户官网
  async function analyzeCustomer() {
    if (!form.website) {
      showToast('error', '请先填写客户官网');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/dashboard?action=analyze-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: form.website,
          company_name_en: form.company_name_en,
          country: form.country,
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast('error', 'AI分析失败: ' + data.error);
      } else if (data.analysis) {
        const a = data.analysis;
        setAiResult(a);
        // 自动填充表单
        if (a.company_name) update('company_name', a.company_name);
        if (a.customer_type) update('customer_type', a.customer_type);
        if (a.main_products) update('main_products', a.main_products);
        if (a.main_market) update('main_market', a.main_market);
        if (a.company_size) update('company_size', a.company_size);
        if (a.main_sales_region) update('main_sales_region', a.main_sales_region);
        if (a.has_brand !== null && a.has_brand !== undefined) update('has_brand', a.has_brand);
        if (a.has_distribution !== null && a.has_distribution !== undefined) update('has_distribution', a.has_distribution);
        if (a.pain_points) update('pain_points', a.pain_points);
        if (a.cooperation_grade) update('cooperation_grade', a.cooperation_grade);
        if (a.inquiry_products) update('inquiry_products', a.inquiry_products);
        if (a.certification_needs) update('certification_needs', a.certification_needs);
        if (a.backgound_notes) update('backgound_notes', a.backgound_notes);
        if (a.suggested_next_followup) update('next_followup_date', a.suggested_next_followup);
        // 自动切换到背调信息tab
        setSection('background');
        showToast('success', 'AI分析完成，已自动填充客户信息');
      } else {
        showToast('error', 'AI返回数据异常');
      }
    } catch (e: any) {
      showToast('error', 'AI分析请求失败: ' + (e?.message || ''));
    }
    setAiLoading(false);
  }

  // 根据国家自动匹配时区
  useEffect(() => {
    if (form.country && !form.timezone) {
      const tz = COUNTRY_TIMEZONES[form.country];
      if (tz) update('timezone', tz);
    }
  }, [form.country]);

  async function save() {
    if (!form.company_name_en) {
      showToast('error', '请填写客户公司英文名称');
      return;
    }
    // 去重检查
    if (checkDuplicate(form.company_name_en, form.website, editing?.id)) {
      showToast('error', '该公司已存在，请勿重复录入');
      return;
    }

    setSaving(true);
    const data: any = { ...form };
    if (!data.founded_year) data.founded_year = null;
    if (data.has_brand === '') data.has_brand = null;
    if (data.has_distribution === '') data.has_distribution = null;
    if (!data.customer_type) data.customer_type = null;
    if (!data.cooperation_grade) data.cooperation_grade = null;
    data.updated_at = new Date().toISOString();

    let success = false;
    let errorMsg = '';

    try {
      if (editing) {
        const { error } = await supabase.from('dev_customers').update(data).eq('id', editing.id);
        if (error) throw error;
        success = true;
      } else {
        data.followup_count = 0;
        data.created_at = new Date().toISOString();
        const { error } = await supabase.from('dev_customers').insert(data);
        if (error) throw error;
        success = true;
      }
    } catch (e: any) {
      errorMsg = e?.message || String(e);
      console.error('[客户开发] Supabase保存失败，尝试localStorage:', errorMsg);

      // 降级：直接操作 localStorage 确保数据不丢失
      try {
        const raw = localStorage.getItem('wb_dev_customers');
        const list = raw ? JSON.parse(raw) : [];
        if (editing) {
          const idx = list.findIndex((c: any) => c.id === editing.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...data };
          }
        } else {
          list.push({
            ...data,
            id: 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
            followup_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        localStorage.setItem('wb_dev_customers', JSON.stringify(list));
        success = true;
        showToast('info', 'Supabase表未创建，数据已存到本地浏览器（请执行SQL迁移脚本）');
      } catch (e2: any) {
        console.error('[客户开发] localStorage也失败:', e2);
        showToast('error', '保存失败: ' + (e2?.message || '未知错误'));
      }
    }

    setSaving(false);
    if (success) {
      onSaved();
    }
  }

  const sections = [
    { id: 'basic' as const, label: '基础信息', icon: Building2 },
    { id: 'contact' as const, label: '联系人信息', icon: Users },
    { id: 'background' as const, label: '背调信息', icon: Search },
    { id: 'business' as const, label: '产品业务', icon: Package },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{editing ? '编辑客户' : '新建客户'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {/* Section tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200">
          <div className="flex gap-1">
            {sections.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={classNames('flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                  section === s.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                <s.icon className="w-4 h-4" /> {s.label}
              </button>
            ))}
          </div>
          {/* AI 分析按钮 */}
          <button
            onClick={analyzeCustomer}
            disabled={aiLoading || !form.website}
            className={classNames(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mb-1',
              aiLoading ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 disabled:opacity-50'
            )}
            title={form.website ? 'AI自动分析客户官网并填充信息' : '请先填写官网'}
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiLoading ? 'AI分析中...' : 'AI分析客户'}
          </button>
        </div>

        {/* AI 分析结果 */}
        {aiResult && (
          <div className="mx-5 mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg text-sm">
            <div className="flex items-center gap-1.5 font-bold text-purple-700 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> AI分析结果
            </div>
            {aiResult.suggested_followup_strategy && (
              <div className="text-xs text-slate-600 mb-1">
                <span className="font-medium">跟进策略：</span>{aiResult.suggested_followup_strategy}
              </div>
            )}
            {aiResult.suggested_next_followup && (
              <div className="text-xs text-slate-600">
                <span className="font-medium">建议跟进日期：</span>{aiResult.suggested_next_followup}
              </div>
            )}
            <button onClick={() => setAiResult(null)} className="text-xs text-purple-500 hover:text-purple-700 mt-1">关闭</button>
          </div>
        )}

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {section === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="公司英文名称 *" required>
                  <input type="text" value={form.company_name_en} onChange={e => update('company_name_en', e.target.value)}
                    className="input" placeholder="ABC Trading Co., Ltd." />
                </Field>
                <Field label="公司中文名">
                  <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)}
                    className="input" placeholder="ABC贸易有限公司" />
                </Field>
                <Field label="国家/地区">
                  <input type="text" list="country-list" value={form.country} onChange={e => update('country', e.target.value)}
                    className="input" placeholder="如：美国、德国" />
                  <datalist id="country-list">
                    {Object.keys(COUNTRY_TIMEZONES).map(c => <option key={c} value={c} />)}
                  </datalist>
                </Field>
                <Field label="城市">
                  <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input" />
                </Field>
                <Field label="官网网址">
                  <input type="text" value={form.website} onChange={e => update('website', e.target.value)}
                    className="input" placeholder="https://..." />
                </Field>
                <Field label="客户公司类型">
                  <select value={form.customer_type} onChange={e => update('customer_type', e.target.value)} className="input">
                    <option value="">请选择</option>
                    {CUSTOMER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="主营市场">
                  <input type="text" value={form.main_market} onChange={e => update('main_market', e.target.value)}
                    className="input" placeholder="如：北美、欧洲、中东" />
                </Field>
                <Field label="主营产品">
                  <input type="text" value={form.main_products} onChange={e => update('main_products', e.target.value)}
                    className="input" placeholder="如：消费电子、家居用品" />
                </Field>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">开发来源渠道</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="来源渠道">
                    <select value={form.dev_source} onChange={e => update('dev_source', e.target.value as DevSource)} className="input">
                      {DEV_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="来源详情">
                    <input type="text" value={form.dev_source_detail} onChange={e => update('dev_source_detail', e.target.value)}
                      className="input" placeholder="如：搜索关键词、展会名称" />
                  </Field>
                </div>
              </div>
            </>
          )}

          {section === 'contact' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="买家姓名"><input type="text" value={form.contact_name} onChange={e => update('contact_name', e.target.value)} className="input" /></Field>
              <Field label="职位">
                <select value={form.contact_title} onChange={e => update('contact_title', e.target.value)} className="input">
                  <option value="">请选择</option>
                  <option value="Buyer">Buyer</option>
                  <option value="CEO">CEO</option>
                  <option value="Purchasing Manager">Purchasing Manager</option>
                  <option value="Owner">Owner</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="其他">其他</option>
                </select>
              </Field>
              <Field label="WhatsApp"><input type="text" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} className="input" placeholder="+1..." /></Field>
              <Field label="邮箱"><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input" /></Field>
              <Field label="电话"><input type="text" value={form.phone} onChange={e => update('phone', e.target.value)} className="input" /></Field>
              <Field label="Skype"><input type="text" value={form.skype} onChange={e => update('skype', e.target.value)} className="input" /></Field>
              <Field label="LinkedIn主页"><input type="text" value={form.linkedin_url} onChange={e => update('linkedin_url', e.target.value)} className="input" placeholder="https://linkedin.com/in/..." /></Field>
              <Field label="客户时区"><input type="text" value={form.timezone} onChange={e => update('timezone', e.target.value)} className="input" placeholder="自动匹配" /></Field>
            </div>
          )}

          {section === 'background' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="公司规模"><input type="text" value={form.company_size} onChange={e => update('company_size', e.target.value)} className="input" placeholder="如：50-100人" /></Field>
                <Field label="成立年限"><input type="number" value={form.founded_year} onChange={e => update('founded_year', e.target.value)} className="input" placeholder="如：2010" /></Field>
                <Field label="主营销售区域"><input type="text" value={form.main_sales_region} onChange={e => update('main_sales_region', e.target.value)} className="input" /></Field>
                <Field label="现有中国供应商"><input type="text" value={form.current_suppliers} onChange={e => update('current_suppliers', e.target.value)} className="input" placeholder="客户现有供应商是谁" /></Field>
                <Field label="采购频次"><input type="text" value={form.purchase_frequency} onChange={e => update('purchase_frequency', e.target.value)} className="input" placeholder="如：每月/每季度" /></Field>
                <Field label="采购量级"><input type="text" value={form.purchase_volume} onChange={e => update('purchase_volume', e.target.value)} className="input" placeholder="如：10K/月" /></Field>
                <Field label="目标价格区间"><input type="text" value={form.target_price_range} onChange={e => update('target_price_range', e.target.value)} className="input" placeholder="如：$5-10/pcs" /></Field>
                <Field label="信用情况"><input type="text" value={form.credit_status} onChange={e => update('credit_status', e.target.value)} className="input" placeholder="如：信用良好/有坏账记录" /></Field>
                <Field label="是否有品牌">
                  <select value={form.has_brand} onChange={e => update('has_brand', e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')} className="input">
                    <option value="">请选择</option><option value="true">是</option><option value="false">否</option>
                  </select>
                </Field>
                <Field label="是否有海外铺货能力">
                  <select value={form.has_distribution} onChange={e => update('has_distribution', e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')} className="input">
                    <option value="">请选择</option><option value="true">是</option><option value="false">否</option>
                  </select>
                </Field>
              </div>
              <Field label="客户痛点">
                <textarea value={form.pain_points} onChange={e => update('pain_points', e.target.value)} className="input" rows={2}
                  placeholder="价格敏感/交期敏感/品质敏感/认证要求高" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="合作概率评级">
                  <select value={form.cooperation_grade} onChange={e => update('cooperation_grade', e.target.value as CooperationGrade)} className="input">
                    <option value="">请选择</option>
                    {COOPERATION_GRADES.map(g => <option key={g.value} value={g.value}>{g.label} - {g.value === 'A' ? '高意向' : g.value === 'B' ? '中等意向' : g.value === 'C' ? '低意向' : '不适合'}</option>)}
                  </select>
                </Field>
                <Field label="开发阶段">
                  <select value={form.dev_stage} onChange={e => update('dev_stage', e.target.value as DevStage)} className="input">
                    {DEV_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="背调总结备注">
                <textarea value={form.backgound_notes} onChange={e => update('backgound_notes', e.target.value)} className="input" rows={3} />
              </Field>
            </>
          )}

          {section === 'business' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="客户咨询产品"><input type="text" value={form.inquiry_products} onChange={e => update('inquiry_products', e.target.value)} className="input" /></Field>
                <Field label="规格要求"><input type="text" value={form.inquiry_specs} onChange={e => update('inquiry_specs', e.target.value)} className="input" /></Field>
                <Field label="目标价"><input type="text" value={form.target_price} onChange={e => update('target_price', e.target.value)} className="input" /></Field>
                <Field label="MOQ要求"><input type="text" value={form.moq_requirement} onChange={e => update('moq_requirement', e.target.value)} className="input" /></Field>
                <Field label="认证需求"><input type="text" value={form.certification_needs} onChange={e => update('certification_needs', e.target.value)} className="input" placeholder="CE/FCC/ROHS等" /></Field>
                <Field label="下次跟进日期"><input type="date" value={form.next_followup_date} onChange={e => update('next_followup_date', e.target.value)} className="input" /></Field>
              </div>
              <Field label="每日开发日期"><input type="date" value={form.daily_dev_date} onChange={e => update('daily_dev_date', e.target.value)} className="input" /></Field>
              <Field label="备注">
                <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="input" rows={3} />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">取消</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== 子组件：跟进表单 ======
function FollowupForm({ customer, followups, onClose, onSaved }: {
  customer: DevCustomer;
  followups: FollowupRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<FollowupType>('email');
  const [content, setContent] = useState('');
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  async function save() {
    if (!content) { alert('请填写跟进内容'); return; }
    setSaving(true);

    const followupData = {
      customer_id: customer.id,
      type, content,
      followup_date: followupDate,
      next_followup_date: nextDate || null,
      created_at: new Date().toISOString(),
    };

    const updates: any = {
      last_contact_date: followupDate,
      followup_count: (customer.followup_count || 0) + 1,
      updated_at: new Date().toISOString(),
    };
    if (nextDate) updates.next_followup_date = nextDate;
    if (customer.dev_stage === 'new_not_contacted') updates.dev_stage = 'first_email_sent';
    if (customer.dev_stage === 'first_email_sent' && type === 'quote') updates.dev_stage = 'quoted';
    if (customer.dev_stage === 'quoted' && type === 'sample') updates.dev_stage = 'sample_pending';

    let success = false;

    try {
      const { error: e1 } = await supabase.from('followup_records').insert(followupData);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('dev_customers').update(updates).eq('id', customer.id);
      if (e2) throw e2;

      success = true;
    } catch (e: any) {
      console.error('[客户开发] Supabase保存跟进失败，尝试localStorage:', e);
      try {
        const rawF = localStorage.getItem('wb_followup_records');
        const listF = rawF ? JSON.parse(rawF) : [];
        listF.push({
          ...followupData,
          id: 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        });
        localStorage.setItem('wb_followup_records', JSON.stringify(listF));

        const rawC = localStorage.getItem('wb_dev_customers');
        const listC = rawC ? JSON.parse(rawC) : [];
        const idx = listC.findIndex((c: any) => c.id === customer.id);
        if (idx >= 0) {
          listC[idx] = { ...listC[idx], ...updates };
          localStorage.setItem('wb_dev_customers', JSON.stringify(listC));
        }
        success = true;
      } catch (e2: any) {
        console.error('[客户开发] localStorage也失败:', e2);
      }
    }

    setSaving(false);
    if (success) {
      onSaved();
    }
  }

  // AI 分析所有跟进记录
  async function analyzeFollowups() {
    // 合并历史记录 + 当前输入
    const allFollowups = [
      ...followups,
      ...(content ? [{ followup_date: followupDate, type, content }] : []),
    ];

    if (allFollowups.length === 0) {
      alert('请先填写跟进内容');
      return;
    }

    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/dashboard?action=analyze-followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer.company_name_en,
          followups: allFollowups.map(f => ({
            followup_date: f.followup_date,
            type: f.type,
            content: f.content,
          })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert('AI分析失败: ' + data.error);
      } else if (data.analysis) {
        setAiAnalysis(data.analysis);
        // 如果AI建议了跟进日期，自动填入
        if (data.analysis.suggested_next_followup_date) {
          setNextDate(data.analysis.suggested_next_followup_date);
        }
      } else {
        alert('AI返回数据异常');
      }
    } catch (e: any) {
      alert('AI分析请求失败: ' + (e?.message || ''));
    }
    setAiLoading(false);
  }

  const allFollowupsCount = followups.length + (content ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">跟进记录</h2>
            <p className="text-xs text-slate-500 mt-0.5">{customer.company_name_en} · {customer.contact_name} · {customer.country}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 新增跟进输入 */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">跟进类型</label>
              <div className="flex flex-wrap gap-2">
                {FOLLOWUP_TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={classNames('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors',
                      type === t.value ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                    <t.icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">跟进日期</label>
                <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">下次跟进日期</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">跟进内容</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} className="input" rows={4}
                placeholder="记录邮件内容、WhatsApp沟通、报价信息、样品进度、客户异议..." />
            </div>
          </div>

          {/* 历史跟进记录列表 */}
          {followups.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> 历史跟进记录 ({followups.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {followups.map(f => {
                  const typeInfo = FOLLOWUP_TYPES.find(t => t.value === f.type);
                  const Icon = typeInfo?.icon || Mail;
                  return (
                    <div key={f.id} className="flex items-start gap-2 text-sm bg-white border border-slate-100 rounded-lg p-2.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-400">{formatDate(f.followup_date)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{typeInfo?.label}</span>
                          {f.next_followup_date && <span className="text-[10px] text-blue-500">→ {formatDate(f.next_followup_date)}</span>}
                        </div>
                        <p className="text-xs text-slate-700">{f.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI 分析结果 */}
          {aiAnalysis && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-purple-700">
                  <Sparkles className="w-4 h-4" /> AI 跟进分析报告
                </div>
                <button onClick={() => setAiAnalysis(null)} className="text-xs text-purple-400 hover:text-purple-600">关闭</button>
              </div>

              {aiAnalysis.summary && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-0.5">总结</div>
                  <p className="text-sm text-slate-700">{aiAnalysis.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {aiAnalysis.progress_assessment && (
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-xs font-medium text-slate-500 mb-0.5">进展评估</div>
                    <p className="text-xs text-slate-700">{aiAnalysis.progress_assessment}</p>
                  </div>
                )}
                {aiAnalysis.risk_level && (
                  <div className="bg-white/60 rounded-lg p-2.5">
                    <div className="text-xs font-medium text-slate-500 mb-0.5">流失风险</div>
                    <p className={classNames('text-xs font-bold',
                      aiAnalysis.risk_level.includes('高') ? 'text-red-600' : aiAnalysis.risk_level.includes('中') ? 'text-amber-600' : 'text-green-600')}>
                      {aiAnalysis.risk_level}
                    </p>
                  </div>
                )}
              </div>

              {aiAnalysis.key_insights && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-0.5">关键洞察</div>
                  <p className="text-sm text-slate-700">{aiAnalysis.key_insights}</p>
                </div>
              )}

              {aiAnalysis.issues && aiAnalysis.issues.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-0.5">发现的问题</div>
                  <ul className="space-y-1">
                    {aiAnalysis.issues.map((issue: string, i: number) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.suggested_actions && aiAnalysis.suggested_actions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-0.5">建议的下一步行动</div>
                  <ul className="space-y-1">
                    {aiAnalysis.suggested_actions.map((action: string, i: number) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-1">
                        <ArrowRight className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" /> {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.suggested_followup_strategy && (
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <div className="text-xs font-medium text-blue-600 mb-0.5">跟进策略建议</div>
                  <p className="text-sm text-slate-700">{aiAnalysis.suggested_followup_strategy}</p>
                </div>
              )}

              {aiAnalysis.suggested_next_followup_date && (
                <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2.5">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-slate-500">建议下次跟进日期：</span>
                  <span className="text-sm font-bold text-green-700">{aiAnalysis.suggested_next_followup_date}</span>
                  <span className="text-[10px] text-slate-400">（已自动填入）</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between gap-2 p-5 border-t border-slate-200">
          <button
            onClick={analyzeFollowups}
            disabled={aiLoading || allFollowupsCount === 0}
            className={classNames(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              aiLoading ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 disabled:opacity-50'
            )}
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiLoading ? 'AI分析中...' : `AI分析跟进 (${allFollowupsCount})`}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">取消</button>
            <button onClick={save} disabled={saving || !content}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {saving ? '保存中...' : '保存跟进'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== 子组件：客户详情 ======
function CustomerDetail({ customer, followups, onClose, onEdit, onFollowup }: {
  customer: DevCustomer;
  followups: FollowupRecord[];
  onClose: () => void;
  onEdit: () => void;
  onFollowup: () => void;
}) {
  const stageInfo = getStageInfo(customer.dev_stage);
  const srcInfo = getSourceInfo(customer.dev_source);
  const gradeInfo = customer.cooperation_grade ? getGradeInfo(customer.cooperation_grade) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{customer.company_name_en}</h2>
            {customer.company_name && <p className="text-sm text-slate-500">{customer.company_name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 标签 */}
          <div className="flex flex-wrap gap-2">
            <span className={classNames('text-xs px-2 py-1 rounded-full', srcInfo.color)}>{srcInfo.label}</span>
            <span className={classNames('text-xs px-2 py-1 rounded-full', stageInfo.color)}>{stageInfo.label}</span>
            {gradeInfo && <span className={classNames('text-xs px-2 py-1 rounded-full border', gradeInfo.color)}>{gradeInfo.label}</span>}
            {customer.country && <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{customer.country}</span>}
            {customer.timezone && <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">{customer.timezone}</span>}
          </div>

          {/* 基础信息 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem icon={Globe} label="官网" value={customer.website} />
            <InfoItem icon={Building2} label="公司类型" value={customer.customer_type ? CUSTOMER_TYPES.find(t => t.value === customer.customer_type)?.label : null} />
            <InfoItem icon={MapPin} label="城市" value={customer.city} />
            <InfoItem icon={TrendingUp} label="主营市场" value={customer.main_market} />
            <InfoItem icon={Package} label="主营产品" value={customer.main_products} />
            <InfoItem icon={Building2} label="公司规模" value={customer.company_size} />
          </div>

          {/* 联系人 */}
          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-sm font-bold text-slate-700 mb-2">联系人信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem icon={Users} label="姓名" value={customer.contact_name} />
              <InfoItem icon={Building2} label="职位" value={customer.contact_title} />
              <InfoItem icon={Mail} label="邮箱" value={customer.email} />
              <InfoItem icon={MessageCircle} label="WhatsApp" value={customer.whatsapp} />
              <InfoItem icon={Phone} label="电话" value={customer.phone} />
              <InfoItem icon={Globe} label="LinkedIn" value={customer.linkedin_url} />
            </div>
          </div>

          {/* 背调 */}
          {(customer.current_suppliers || customer.purchase_frequency || customer.purchase_volume || customer.target_price_range || customer.pain_points || customer.backgound_notes) && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-sm font-bold text-slate-700 mb-2">背调信息</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem icon={Building2} label="现有供应商" value={customer.current_suppliers} />
                <InfoItem icon={Clock} label="采购频次" value={customer.purchase_frequency} />
                <InfoItem icon={Package} label="采购量级" value={customer.purchase_volume} />
                <InfoItem icon={Star} label="目标价格区间" value={customer.target_price_range} />
                <InfoItem icon={AlertCircle} label="客户痛点" value={customer.pain_points} />
                {customer.has_brand !== null && customer.has_brand !== undefined && (
                  <InfoItem icon={Star} label="有品牌" value={customer.has_brand ? '是' : '否'} />
                )}
              </div>
              {customer.backgound_notes && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                  {customer.backgound_notes}
                </div>
              )}
            </div>
          )}

          {/* 产品业务 */}
          {(customer.inquiry_products || customer.inquiry_specs || customer.target_price || customer.moq_requirement || customer.certification_needs) && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-sm font-bold text-slate-700 mb-2">产品业务记录</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem icon={Package} label="咨询产品" value={customer.inquiry_products} />
                <InfoItem icon={FileText} label="规格" value={customer.inquiry_specs} />
                <InfoItem icon={Star} label="目标价" value={customer.target_price} />
                <InfoItem icon={Package} label="MOQ" value={customer.moq_requirement} />
                <InfoItem icon={FileText} label="认证需求" value={customer.certification_needs} />
              </div>
            </div>
          )}

          {/* 跟进记录 */}
          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-sm font-bold text-slate-700 mb-2">跟进记录 ({followups.length})</h3>
            {followups.length === 0 ? (
              <p className="text-sm text-slate-400">暂无跟进记录</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {followups.map(f => {
                  const typeInfo = FOLLOWUP_TYPES.find(t => t.value === f.type);
                  const Icon = typeInfo?.icon || Mail;
                  return (
                    <div key={f.id} className="flex items-start gap-2 text-sm border-l-2 border-slate-200 pl-3 py-1">
                      <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-400 mb-0.5">
                          {formatDate(f.followup_date)} · {typeInfo?.label}
                          {f.next_followup_date && <span className="ml-2 text-blue-500">下次: {formatDate(f.next_followup_date)}</span>}
                        </div>
                        <p className="text-slate-700">{f.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 备注 */}
          {customer.notes && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-sm font-bold text-slate-700 mb-2">备注</h3>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200">
          <button onClick={onFollowup} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Clock className="w-4 h-4" /> 添加跟进
          </button>
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Edit2 className="w-4 h-4" /> 编辑
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== 辅助组件 ======
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0 && value !== false) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs text-slate-400">{label}: </span>
        <span className="text-slate-700 truncate">{String(value)}</span>
      </div>
    </div>
  );
}

