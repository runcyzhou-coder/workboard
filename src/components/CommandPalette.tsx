import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, Home, LayoutDashboard, Users, Package, Calculator,
  Wrench, FolderOpen, Inbox, Headphones, Truck,
  ChevronRight, FileText, Quote, Briefcase, Sparkles,
} from 'lucide-react';
import type { Page } from './Sidebar';
import { classNames } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Home;
  page?: Page;
  kbd?: string;
  category: string;
}

const navCommands: CommandItem[] = [
  { id: 'home', label: '战略主殿', description: '工作台概览 · 行业快讯 · 每日任务', icon: Home, page: 'home', kbd: 'G H', category: '战略导航' },
  { id: 'dashboard', label: '全局推演', description: '业务数据总览 · 统计卡片', icon: LayoutDashboard, page: 'dashboard', kbd: 'G D', category: '战略导航' },
  { id: 'customers', label: '客户图谱', description: '客户档案 · AI 背调 · 跟进记录', icon: Users, page: 'customers', kbd: 'G C', category: '战略导航' },
  { id: 'inquiries', label: '询盘谋略', description: '询盘跟进 · 一键生成单据', icon: Inbox, page: 'inquiries', kbd: 'G I', category: '战略导航' },
  { id: 'shipments', label: '物流节点', description: '订舱 · 提单 · 物流轨迹', icon: Truck, page: 'shipments', kbd: 'G S', category: '战略导航' },
  { id: 'products', label: '产品矩阵', description: '产品库 · 规格 · 价格', icon: Package, page: 'products', kbd: 'G P', category: '战略导航' },
  { id: 'document-center', label: '典籍文献', description: '商业发票 · 装箱单 · 合同', icon: FolderOpen, page: 'document-center', kbd: 'G O', category: '战略导航' },
  { id: 'profit-calculator', label: '利润演算', description: '利润计算 · 实时汇率 · 成本分析', icon: Calculator, page: 'profit-calculator', kbd: 'G A', category: '战略导航' },
  { id: 'after-sales', label: '售后裁决', description: '售后工单 · 问题跟进', icon: Headphones, page: 'after-sales', kbd: 'G R', category: '战略导航' },
  { id: 'tools', label: '奥术工具', description: '汇率 · 翻译 · 计算工具', icon: Wrench, page: 'tools', kbd: 'G T', category: '战略导航' },
];

const quickCommands: CommandItem[] = [
  { id: 'new-customer', label: '新建客户', description: '添加新客户档案', icon: Users, page: 'customers', category: '快捷操作' },
  { id: 'new-inquiry', label: '新建询盘', description: '录入新的客户询盘', icon: Briefcase, page: 'inquiries', category: '快捷操作' },
  { id: 'new-product', label: '新建产品', description: '添加产品到产品库', icon: Package, page: 'products', category: '快捷操作' },
  { id: 'new-quote', label: '创建报价单', description: '为客户生成报价单', icon: Quote, page: 'document-center', category: '快捷操作' },
  { id: 'new-pi', label: '生成形式发票', description: '创建 PI 单据', icon: FileText, page: 'document-center', category: '快捷操作' },
  { id: 'calc-profit', label: '防亏核算', description: '快速计算利润与成本', icon: Calculator, page: 'profit-calculator', category: '快捷操作' },
];

const allCommands = [...navCommands, ...quickCommands];

const categoryOrder = ['快捷操作', '战略导航'];

export function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? allCommands.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      })
    : allCommands;

  const grouped: Record<string, CommandItem[]> = {};
  for (const item of filtered) {
    const cat = item.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const orderedCategories = categoryOrder.filter((c) => grouped[c]?.length);

  const flatItems = filtered;

  const reset = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, reset]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.page) {
        onNavigate(item.page);
      }
      onClose();
    },
    [onNavigate, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* 暗紫背景 */}
      <div className="absolute inset-0 bg-[#0B0813]/75 backdrop-blur-md" />

      {/* Palette panel */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-[#1B142C]/95 border-2 border-[#3A2D54] rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.35)] overflow-hidden backdrop-blur-md intj-cut-corner">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#3A2D54] bg-gradient-to-r from-[#1B142C] to-[#221A3A]">
          <Search className="w-4 h-4 text-[#A855F7] shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="推演战略、寻找功能、探索命令…"
            className="flex-1 bg-transparent outline-none text-sm text-[#F3EFE6] placeholder-[#8879A0] font-handwriting text-[15px]"
          />
          <Sparkles className="w-4 h-4 text-[#06B6D4] animate-pulse" />
          <button
            onClick={onClose}
            className="p-1 text-[#8879A0] hover:text-[#A855F7] hover:bg-[#1B142C] rounded transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {flatItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 mx-auto mb-3 text-[#3A2D54]" strokeWidth={1.75} />
              <p className="text-[#8879A0] text-sm">未找到匹配的战略或功能</p>
            </div>
          ) : (
            orderedCategories.map((cat) => (
              <div key={cat} className="mb-1">
                <p className="px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[#8879A0]">
                  — {cat} —
                </p>
                {grouped[cat].map((item) => {
                  const flatIdx = flatItems.findIndex((f) => f.id === item.id);
                  const Icon = item.icon;
                  const isActive = flatIdx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-idx={flatIdx}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(flatIdx)}
                      className={classNames(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-[#A855F7]/25 via-[#6B21A8]/10 to-transparent border border-[#A855F7]/40 text-[#F3EFE6] shadow-[0_0_12px_rgba(168,85,247,0.22)]'
                          : 'text-[#B8AEC8] hover:bg-[#1B142C]/80 border border-transparent'
                      )}
                    >
                      <div className={classNames(
                        'w-9 h-9 rounded-md flex items-center justify-center shrink-0 border-2',
                        isActive
                          ? 'bg-gradient-to-br from-[#A855F7] to-[#6B21A8] border-[#A855F7] text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                          : 'bg-[#221A3A] border-[#3A2D54] text-[#B8AEC8]'
                      )}>
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={classNames('text-sm font-medium', isActive ? 'text-[#F3EFE6]' : 'text-[#D8B4FE]')}>
                          {item.label}
                        </p>
                        <p className="text-xs text-[#8879A0] truncate">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.kbd && (
                          <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1.5 py-0.5 text-[10px] font-mono">
                            {item.kbd}
                          </kbd>
                        )}
                        <ChevronRight className={classNames(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-[#A855F7]' : 'text-[#3A2D54]'
                        )} strokeWidth={1.75} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t-2 border-[#3A2D54] bg-[#0B0813]/80">
          <div className="flex items-center gap-3 text-[11px] text-[#8879A0]">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1 py-0.5 text-[10px] font-mono">↑</kbd>
              <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1 py-0.5 text-[10px] font-mono">↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1 py-0.5 text-[10px] font-mono">↵</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1 py-0.5 text-[10px] font-mono">Esc</kbd>
              关闭
            </span>
          </div>
          <span className="text-[10px] text-[#A855F7] font-handwriting">INTJ 战略推演 · 按 ⌘K 开启</span>
        </div>
      </div>
    </div>
  );
}
