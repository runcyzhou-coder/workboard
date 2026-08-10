import { useState, useEffect } from 'react';
import {
  Newspaper, CheckCircle2, Circle, Plus, Trash2,
  TrendingUp, Globe2, MapPin, Clock, Calendar,
  Briefcase, Zap, AlertCircle, ExternalLink,
  Sparkles, BarChart3, ChevronRight, Target,
  ListTodo, RefreshCw,
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

export function HomePage({ onNavigate }: HomeProps) {
  // To-do state
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos());
  const [todoInput, setTodoInput] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'pending' | 'done'>('all');

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

  return (
    <div className="space-y-6">
      {/* 顶部问候与日期 */}
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
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20">
              <p className="text-[10px] text-white/70 font-medium">待办任务</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20">
              <p className="text-[10px] text-white/70 font-medium">已完成</p>
              <p className="text-2xl font-bold text-emerald-300">{doneCount}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 border border-white/20">
              <p className="text-[10px] text-white/70 font-medium">完成率</p>
              <p className="text-2xl font-bold text-amber-300">{todos.length === 0 ? 0 : Math.round(doneCount / todos.length * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容：左列待办 + 右列信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左：待办列表 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-1">
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
                onClick={() => setFilterPriority(f.key as any)}
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

        {/* 右：行业新闻、热销产品、热门市场 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 行业新闻 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    风机行业快讯
                    <span className="ml-2 text-xs font-normal text-slate-400">（AI 每日收集，可替换任意行业内容）</span>
                  </h2>
                  <p className="text-xs text-slate-500">全球风电政策、市场项目、技术认证实时动态</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>更新于 {formatDate(today.toISOString())}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    className="group p-4 rounded-xl border border-slate-100 hover:border-orange-200 hover:shadow-sm transition-all bg-gradient-to-br from-white to-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
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
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-2 group-hover:text-orange-700 transition-colors">
                      {n.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                      {n.summary}
                    </p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Globe2 className="w-3 h-3" />
                        {n.source}
                      </span>
                      <button className="flex items-center gap-1 text-orange-600 font-medium hover:text-orange-700">
                        查看原文 <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 热销产品 & 热门市场 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 热销产品 */}
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
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onNavigate('products')}>
                      <div className={classNames(
                        'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                        idx < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                          <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium', catColor[p.category])}>
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

            {/* 热门国家 */}
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
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onNavigate('customers')}>
                      <div className="text-2xl shrink-0 w-9 text-center">{m.flag}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{m.country}</p>
                          <span className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium', riskColors[m.risk])}>
                            {riskLabels[m.risk]}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />{m.demand}
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
        </div>
      </div>
    </div>
  );
}
