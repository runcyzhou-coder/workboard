import { useState, useEffect } from 'react';
import {
  Newspaper, CheckCircle2, Circle, Plus, Trash2,
  TrendingUp, Globe2, MapPin, Clock, Calendar,
  Briefcase, Zap, AlertCircle, ExternalLink,
  Sparkles, BarChart3, ChevronRight, Target,
  ListTodo, RefreshCw, AlertTriangle, X,
} from 'lucide-react';
import { formatDate, classNames } from '@/lib/utils';
import type { Page } from '@/components/Sidebar';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

// ============ 行业新闻（风机行业） ============
interface IndustryNews {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: '政策' | '市场' | '技术' | '项目';
  date: string;
  hotLevel: 'hot' | 'warm' | 'normal';
}

const fanIndustryNews: IndustryNews[] = [
  {
    id: 'n1',
    title: '2026年全球海上风电装机量预计突破50GW，亚洲市场引领增长',
    summary: '国际能源署(IEA)最新报告显示，中国、韩国、越南三国海上风电项目审批加速，风机制造商金风科技、明阳智能海外订单同比增长68%。',
    source: 'Global Wind Energy Council',
    category: '市场',
    date: '2026-08-08',
    hotLevel: 'hot',
  },
  {
    id: 'n2',
    title: '16MW超大容量海上风机通过DLC认证，出口欧盟门槛降低',
    summary: '国内某头部风机厂商的H260-16MW机型获得DNV型式认证，这是目前出口欧洲市场所需的核心资质，预计Q4可批量交付德国北海项目。',
    source: 'DNV GL 认证中心',
    category: '技术',
    date: '2026-08-07',
    hotLevel: 'hot',
  },
  {
    id: 'n3',
    title: '巴西发布2026-2030国家能源规划，新增陆上风电配额18GW',
    summary: '巴西矿产能源部(Mineral Energy)公开拍卖日程，8月28日启动第一轮1.2GW风电招标，准入门槛支持中国整机厂商以本地化率30%参与。',
    source: '巴西矿业能源部',
    category: '政策',
    date: '2026-08-06',
    hotLevel: 'warm',
  },
  {
    id: 'n4',
    title: '沙特NEOM新城绿氢配套5GW风电项目启动EPC招标',
    summary: '沙特ACWA Power发布招标文件，要求风机在沙漠高温环境下具备45°C连续运行能力，交货窗口2027Q2-2028Q1。',
    source: 'MEED 中东经济文摘',
    category: '项目',
    date: '2026-08-05',
    hotLevel: 'hot',
  },
  {
    id: 'n5',
    title: '风机塔筒出口欧盟反倾销税率调整公告（2026年第三版）',
    summary: '欧盟委员会最新公告，自9月15日起对原产于中国的钢制塔筒征收6.2%-14.8%的反倾销税，具体税率依出口商单独税率申请结果而定。',
    source: 'European Commission TARIC',
    category: '政策',
    date: '2026-08-04',
    hotLevel: 'warm',
  },
  {
    id: 'n6',
    title: '澳大利亚昆士兰州450MW风电项目正式签约，EPC总价约4.8亿美元',
    summary: '某中澳联合体项目公司签约，风机选型为5.5MW陆上机型，预计2027年并网，这是近一年中国风机厂商在大洋洲的最大单笔订单。',
    source: 'RenewEconomy Australia',
    category: '项目',
    date: '2026-08-03',
    hotLevel: 'normal',
  },
];

// ============ 热销产品 ============
interface HotProduct {
  id: string;
  name: string;
  model: string;
  category: '整机' | '塔筒' | '叶片' | '电控' | '配件';
  revenue: string;
  growth: string;
  trend: 'up' | 'down';
}

const hotProducts: HotProduct[] = [
  { id: 'p1', name: '陆上低风速风机', model: 'GW171-6.0MW', category: '整机', revenue: '$18.2M', growth: '+42%', trend: 'up' },
  { id: 'p2', name: '海上大容量风机', model: 'H260-16MW', category: '整机', revenue: '$12.8M', growth: '+156%', trend: 'up' },
  { id: 'p3', name: '钢制塔筒（含防腐）', model: '120m 三段式', category: '塔筒', revenue: '$8.6M', growth: '+28%', trend: 'up' },
  { id: 'p4', name: '碳纤维叶片', model: '92m B型', category: '叶片', revenue: '$6.1M', growth: '+35%', trend: 'up' },
  { id: 'p5', name: '变桨/偏航电控系统', model: 'PCS-5000', category: '电控', revenue: '$3.8M', growth: '+19%', trend: 'up' },
  { id: 'p6', name: '高原型风机（4500m+）', model: 'GW155-4.5MW', category: '整机', revenue: '$2.9M', growth: '+8%', trend: 'up' },
];

// ============ 热销国家/地区 ============
interface HotMarket {
  id: string;
  country: string;
  flag: string;
  continent: string;
  demand: string;
  inquiries30d: number;
  avgMargin: string;
  risk: 'low' | 'medium' | 'high';
}

const hotMarkets: HotMarket[] = [
  { id: 'm1', country: '沙特阿拉伯', flag: '🇸🇦', continent: '中东', demand: '5GW 海上+陆上', inquiries30d: 18, avgMargin: '28%', risk: 'low' },
  { id: 'm2', country: '巴西', flag: '🇧🇷', continent: '拉美', demand: '18GW 陆上拍卖', inquiries30d: 12, avgMargin: '22%', risk: 'medium' },
  { id: 'm3', country: '澳大利亚', flag: '🇦🇺', continent: '大洋洲', demand: '4.5GW 新项目', inquiries30d: 9, avgMargin: '31%', risk: 'low' },
  { id: 'm4', country: '越南', flag: '🇻🇳', continent: '东南亚', demand: '3.2GW 海上一期', inquiries30d: 21, avgMargin: '19%', risk: 'medium' },
  { id: 'm5', country: '德国', flag: '🇩🇪', continent: '欧洲', demand: '北海 2.8GW', inquiries30d: 7, avgMargin: '25%', risk: 'medium' },
  { id: 'm6', country: '哈萨克斯坦', flag: '🇰🇿', continent: '中亚', demand: '1.8GW 陆上', inquiries30d: 5, avgMargin: '34%', risk: 'low' },
];

// ============ 每日 To-do ============
interface TodoItem {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  dueTime?: string;
  category?: '客户' | '报价' | '单据' | '市场' | '其他';
}

const STORAGE_KEY = 'wb_home_todos_v1';

function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { id: 't1', text: '给沙特ACWA发送16MW风机技术参数及报价', priority: 'high', done: false, dueTime: '10:30', category: '报价' },
    { id: 't2', text: '跟进巴西客户询盘的塔筒反倾销税率计算', priority: 'high', done: false, dueTime: '14:00', category: '客户' },
    { id: 't3', text: '更新越南Vinh Phuc项目的形式发票（PI）', priority: 'medium', done: false, dueTime: '16:00', category: '单据' },
    { id: 't4', text: '查看德国DNV最新认证要求并核对产品文档', priority: 'medium', done: true, dueTime: '', category: '市场' },
    { id: 't5', text: '整理本周风机出口数据并发送周报', priority: 'low', done: false, dueTime: '周五前', category: '其他' },
  ];
}

// ============ 收汇与物流风控预警数据 ============
interface RiskAlert {
  id: string;
  docNumber: string;
  customer: string;
  amount: string;
  status: string;
  action: string;
  level: 'critical' | 'warning' | 'info';
}

const riskAlerts: RiskAlert[] = [
  { id: 'r1', docNumber: 'PI-20260805-001', customer: 'Saudi ACWA Power', amount: '$890K', status: '已报关未放单', action: '严禁放单', level: 'critical' },
  { id: 'r2', docNumber: 'PI-20260728-004', customer: 'Vietnam Vinh Phuc', amount: '$320K', status: '已到港未提货', action: '催促付款', level: 'warning' },
  { id: 'r3', docNumber: 'SHP-20260810-002', customer: 'Australia QLD', amount: '—', status: '物流延误 7 天', action: '关注到港', level: 'info' },
];

// ============ 月历组件 ============
function MiniCalendar({ doneCount, totalTodos }: { doneCount: number; totalTodos: number }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // 周一开始（中国习惯）
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 0=Monday

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const cells: (number | null)[] = [];
  // 前置空格
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {year}年{month + 1}月
        </h2>
        <Calendar className="w-5 h-5 text-indigo-500" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} className={classNames(
            'aspect-square flex items-center justify-center rounded-lg text-sm',
            d === today.getDate()
              ? 'bg-indigo-600 text-white font-bold'
              : d
                ? 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                : ''
          )}>
            {d || ''}
          </div>
        ))}
      </div>
      {/* 今日任务统计 */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">今日任务</span>
          <span className="font-semibold text-indigo-600">{doneCount}/{totalTodos}</span>
        </div>
      </div>
    </div>
  );
}

// ============ AI 写信 Modal ============
function AILetterModal({ news, onClose }: { news: IndustryNews; onClose: () => void }) {
  const letter = `Subject: Re: ${news.title} — Potential Cooperation Opportunity

Dear Valued Client,

We at KIKI TECH have been closely monitoring the latest development: "${news.title}". As reported by ${news.source}, ${news.summary}

As a leading manufacturer in the wind energy equipment industry, KIKI TECH offers competitive solutions including:
• High-efficiency wind turbines (4.5MW–16MW) with international certifications (DNV, IEC)
• Complete supply chain support from manufacturing to after-sales service
• Competitive pricing with flexible payment terms

Given the current market dynamics described in the news, we believe this presents an excellent opportunity for collaboration. Our team is ready to provide detailed technical specifications and customized quotations upon your request.

Would you be available for a brief call next week to discuss potential synergies?

Best regards,
KIKI TECH Team
Email: sales@kiki-tech.com
Tel: +86-xxx-xxxx-xxxx
www.kiki-tech.com`;

  const [copied, setCopied] = useState(false);

  function copyLetter() {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">AI 提取商机写信</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            📰 基于新闻：{news.title}
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">{letter}</pre>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">关闭</button>
          <button onClick={copyLetter} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {copied ? '已复制' : '复制全文'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomePage({ onNavigate }: HomeProps) {
  // To-do state
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos());
  const [todoInput, setTodoInput] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'pending' | 'done'>('all');
  const [aiLetterNews, setAiLetterNews] = useState<IndustryNews | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  function addTodo() {
    const text = todoInput.trim();
    if (!text) return;
    const newItem: TodoItem = {
      id: 'todo-' + Date.now(),
      text,
      priority: 'medium',
      done: false,
      category: '其他',
    };
    setTodos([newItem, ...todos]);
    setTodoInput('');
  }

  function toggleTodo(id: string) {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function removeTodo(id: string) {
    setTodos(todos.filter(t => t.id !== id));
  }

  function cyclePriority(id: string) {
    const order: TodoItem['priority'][] = ['high', 'medium', 'low'];
    setTodos(todos.map(t => t.id === id ? { ...t, priority: order[(order.indexOf(t.priority) + 1) % order.length] } : t));
  }

  const filteredTodos = todos.filter(t => {
    if (filterPriority === 'pending') return !t.done;
    if (filterPriority === 'done') return t.done;
    return true;
  });

  const doneCount = todos.filter(t => t.done).length;
  const pendingCount = todos.length - doneCount;
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // AI 快捷工具栏配置
  const quickTools: { icon: string; label: string; page: Page; bg: string; border: string; text: string; hover: string }[] = [
    { icon: '✉️', label: 'AI 写信', page: 'tools', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
    { icon: '📄', label: '新建 PI/报价单', page: 'document-center', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', hover: 'hover:bg-violet-100' },
    { icon: '🔍', label: '客户背调', page: 'customers', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:bg-emerald-100' },
    { icon: '🚚', label: '物流/风控查询', page: 'shipments', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:bg-amber-100' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. 顶部 Banner（问候 + 业务指标卡片） */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl p-6 sm:p-8 text-white overflow-hidden relative">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-white/80 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>AI 智能首页 · 风机行业版</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">早安，KIKI TECH</h1>
            <p className="text-white/80 text-sm">{dateStr} · 今天也是开拓全球市场的一天 💪</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20 min-w-[130px]">
              <p className="text-[10px] text-white/70 font-medium">本月新增询盘</p>
              <p className="text-2xl font-bold"><span className="text-blue-200">12</span> <span className="text-sm font-normal text-white/70">个</span></p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20 min-w-[130px]">
              <p className="text-[10px] text-white/70 font-medium">待跟进报价</p>
              <p className="text-2xl font-bold text-amber-300">$34.5M</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20 min-w-[130px]">
              <p className="text-[10px] text-white/70 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />待收尾款预警
              </p>
              <p className="text-2xl font-bold text-red-300">$1.2M</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI 快捷工具栏 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickTools.map((btn) => (
          <button
            key={btn.label}
            onClick={() => onNavigate(btn.page)}
            className={classNames(
              'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all',
              btn.bg, btn.border, btn.hover
            )}
          >
            <span className="text-2xl shrink-0">{btn.icon}</span>
            <span className={classNames('text-sm font-semibold', btn.text)}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* 3. 月历 + 每日任务（并排） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：月历 */}
        <div className="lg:col-span-1">
          <MiniCalendar doneCount={doneCount} totalTodos={todos.length} />
        </div>

        {/* 右：每日任务 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">每日任务</h2>
                <p className="text-xs text-slate-500">今日待办一目了然，点击圆圈勾选完成</p>
              </div>
            </div>
            <button
              onClick={() => { setTodos(loadTodos()); }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="重置为示例"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* 输入框 */}
          <div className="flex gap-2 mb-4">
            <input
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
              placeholder="添加今日任务，如：给沙特客户发送报价..."
              className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={addTodo}
              className="px-3 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 筛选 */}
          <div className="flex gap-1 mb-3 text-xs">
            {[
              { key: 'all', label: '全部', count: todos.length },
              { key: 'pending', label: '待完成', count: pendingCount },
              { key: 'done', label: '已完成', count: doneCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterPriority(f.key as 'all' | 'pending' | 'done')}
                className={classNames(
                  'px-2.5 py-1.5 rounded-md font-medium transition-colors',
                  filterPriority === f.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
                <span className={classNames(
                  'ml-1 px-1.5 rounded-full text-[10px]',
                  filterPriority === f.key ? 'bg-white/20' : 'bg-white text-slate-500'
                )}>{f.count}</span>
              </button>
            ))}
          </div>

          {/* 待办列表 */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredTodos.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无任务</p>
              </div>
            ) : (
              filteredTodos.map((todo) => {
                const priorityColors = {
                  high: { chip: 'bg-red-50 text-red-600 border-red-200', label: '高' },
                  medium: { chip: 'bg-amber-50 text-amber-600 border-amber-200', label: '中' },
                  low: { chip: 'bg-slate-50 text-slate-500 border-slate-200', label: '低' },
                };
                const catColors: Record<string, string> = {
                  '客户': 'bg-blue-50 text-blue-600',
                  '报价': 'bg-violet-50 text-violet-600',
                  '单据': 'bg-emerald-50 text-emerald-600',
                  '市场': 'bg-teal-50 text-teal-600',
                  '其他': 'bg-slate-50 text-slate-500',
                };
                return (
                  <div
                    key={todo.id}
                    className={classNames(
                      'group flex items-start gap-3 p-3 rounded-xl border transition-all',
                      todo.done
                        ? 'bg-slate-50 border-slate-100'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                    )}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="mt-0.5 shrink-0"
                    >
                      {todo.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={classNames(
                        'text-sm font-medium leading-snug',
                        todo.done ? 'text-slate-400 line-through' : 'text-slate-900'
                      )}>
                        {todo.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {todo.category && (
                          <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium', catColors[todo.category])}>
                            {todo.category}
                          </span>
                        )}
                        <button
                          onClick={() => cyclePriority(todo.id)}
                          className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium border', priorityColors[todo.priority].chip)}
                          title="点击切换优先级：高→中→低"
                        >
                          {priorityColors[todo.priority].label}优先
                        </button>
                        {todo.dueTime && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                            <Clock className="w-3 h-3" />{todo.dueTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {pendingCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>💡 提示：点击优先级标签可循环切换</span>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
              >
                查看业务数据 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. 行业快讯 + 热销产品 + 热门目标市场（三列并排） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 列1：行业快讯 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">风机行业快讯</h2>
                <p className="text-xs text-slate-500">全球风电动态实时更新</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(today.toISOString()).slice(5)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {fanIndustryNews.map((n) => {
              const hotColors: Record<string, string> = {
                hot: 'bg-red-50 text-red-600 border-red-200',
                warm: 'bg-amber-50 text-amber-600 border-amber-200',
                normal: 'bg-slate-50 text-slate-500 border-slate-200',
              };
              const catColors: Record<string, string> = {
                '政策': 'bg-violet-100 text-violet-700',
                '市场': 'bg-blue-100 text-blue-700',
                '技术': 'bg-emerald-100 text-emerald-700',
                '项目': 'bg-teal-100 text-teal-700',
              };
              const hotLabel: Record<string, string> = { hot: '🔥 热门', warm: '✨ 关注', normal: '📰 动态' };
              return (
                <div
                  key={n.id}
                  className="group p-3 rounded-xl border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all bg-gradient-to-br from-white to-slate-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={classNames('px-2 py-0.5 rounded text-[10px] font-semibold', catColors[n.category])}>
                        {n.category}
                      </span>
                      <span className={classNames('px-2 py-0.5 rounded text-[10px] font-semibold border', hotColors[n.hotLevel])}>
                        {hotLabel[n.hotLevel]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{n.date.slice(5)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1.5 group-hover:text-orange-700 transition-colors">
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-2.5">
                    {n.summary}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-slate-400 truncate">
                      <Globe2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{n.source}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button className="flex items-center gap-1 text-orange-600 font-medium hover:text-orange-700">
                        原文 <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setAiLetterNews(n)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium hover:bg-indigo-100 border border-indigo-200"
                        title="AI 提取商机写信"
                      >
                        <Sparkles className="w-3 h-3" />AI 写信
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 列2：热销产品排行 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">热销产品排行</h2>
                <p className="text-xs text-slate-500">本季度风机出口热销品类</p>
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-2">
            {hotProducts.map((p, idx) => {
              const catColor: Record<string, string> = {
                '整机': 'bg-blue-50 text-blue-600',
                '塔筒': 'bg-amber-50 text-amber-600',
                '叶片': 'bg-violet-50 text-violet-600',
                '电控': 'bg-teal-50 text-teal-600',
                '配件': 'bg-slate-50 text-slate-600',
              };
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onNavigate('products')}>
                  <div className={classNames(
                    'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                    idx < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                      <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', catColor[p.category])}>
                        {p.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{p.model}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">{p.revenue}</p>
                    <p className={classNames(
                      'text-[10px] font-medium flex items-center justify-end gap-0.5',
                      p.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      <Zap className="w-3 h-3" />{p.growth}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="mt-4 w-full text-sm text-emerald-600 font-medium py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
          >
            进入产品库 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 列3：热门目标市场 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">热门目标市场</h2>
                <p className="text-xs text-slate-500">近30天询盘热度与利润率</p>
              </div>
            </div>
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2">
            {hotMarkets.map((m) => {
              const riskColors: Record<string, string> = {
                low: 'bg-emerald-50 text-emerald-600',
                medium: 'bg-amber-50 text-amber-600',
                high: 'bg-red-50 text-red-600',
              };
              const riskLabels: Record<string, string> = {
                low: '风险低',
                medium: '风险中',
                high: '风险高',
              };
              return (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onNavigate('customers')}>
                  <div className="text-2xl shrink-0 w-9 text-center">{m.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{m.country}</p>
                      <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', riskColors[m.risk])}>
                        {riskLabels[m.risk]}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <Briefcase className="w-3 h-3 shrink-0" /><span className="truncate">{m.demand}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500">
                      <AlertCircle className="w-3 h-3" />
                      询盘 <span className="font-semibold text-slate-900">{m.inquiries30d}</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-600">利润 {m.avgMargin}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate('customers')}
            className="mt-4 w-full text-sm text-blue-600 font-medium py-2 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
          >
            进入客户管理 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. 收汇与物流风控预警卡片 */}
      <div className="bg-red-50 rounded-2xl border-2 border-red-300 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-700">收汇与物流风控预警</h2>
              <p className="text-xs text-red-500">关注未收尾款与物流异常订单</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('shipments')}
            className="text-sm text-red-600 font-medium hover:text-red-700 flex items-center gap-1"
          >
            查看详情 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {riskAlerts.map((r) => {
            const levelStyles: Record<string, string> = {
              critical: 'bg-red-100 border-red-300 text-red-700',
              warning: 'bg-orange-100 border-orange-300 text-orange-700',
              info: 'bg-amber-50 border-amber-300 text-amber-700',
            };
            const levelLabel: Record<string, string> = {
              critical: '严重',
              warning: '警告',
              info: '关注',
            };
            return (
              <div
                key={r.id}
                className={classNames(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  levelStyles[r.level]
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold">{r.docNumber}</span>
                    <span className="text-xs">|</span>
                    <span className="text-xs font-medium">{r.customer}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px]">
                    <span>未收齐尾款 <span className="font-bold">{r.amount}</span></span>
                    <span>|</span>
                    <span>状态：{r.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={classNames(
                    'px-2 py-1 rounded-md text-xs font-bold border',
                    levelStyles[r.level]
                  )}>
                    {levelLabel[r.level]}
                  </span>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-white/60">
                    {r.action}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI 写信 Modal */}
      {aiLetterNews && (
        <AILetterModal news={aiLetterNews} onClose={() => setAiLetterNews(null)} />
      )}
    </div>
  );
}
