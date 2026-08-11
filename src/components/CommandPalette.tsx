import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, Home, LayoutDashboard, Users, Package, Calculator,
  Wrench, FolderOpen, Inbox, Headphones, Truck,
  ChevronRight, FileText, Quote, Briefcase,
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
  { id: 'home', label: '首页', description: '工作台概览 · 行业快讯 · 每日任务', icon: Home, page: 'home', kbd: 'G H', category: '导航' },
  { id: 'dashboard', label: '仪表盘', description: '业务数据总览 · 统计卡片', icon: LayoutDashboard, page: 'dashboard', kbd: 'G D', category: '导航' },
  { id: 'customers', label: '客户管理', description: '客户档案 · AI 背调 · 跟进记录', icon: Users, page: 'customers', kbd: 'G C', category: '导航' },
  { id: 'inquiries', label: '询盘管理', description: '询盘跟进 · 一键生成单据', icon: Inbox, page: 'inquiries', kbd: 'G I', category: '导航' },
  { id: 'shipments', label: '物流管理', description: '订舱 · 提单 · 物流轨迹', icon: Truck, page: 'shipments', kbd: 'G S', category: '导航' },
  { id: 'products', label: '产品管理', description: '产品库 · 规格 · 价格', icon: Package, page: 'products', kbd: 'G P', category: '导航' },
  { id: 'document-center', label: '单据中心', description: '商业发票 · 装箱单 · 合同', icon: FolderOpen, page: 'document-center', kbd: 'G O', category: '导航' },
  { id: 'profit-calculator', label: '防亏核算', description: '利润计算 · 实时汇率 · 成本分析', icon: Calculator, page: 'profit-calculator', kbd: 'G A', category: '导航' },
  { id: 'after-sales', label: '售后处理', description: '售后工单 · 问题跟进', icon: Headphones, page: 'after-sales', kbd: 'G R', category: '导航' },
  { id: 'tools', label: '贸易工具', description: '汇率 · 翻译 · 计算工具', icon: Wrench, page: 'tools', kbd: 'G T', category: '导航' },
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

const categoryOrder = ['快捷操作', '导航'];

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

  // Group by category
  const grouped: Record<string, CommandItem[]> = {};
  for (const item of filtered) {
    const cat = item.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const orderedCategories = categoryOrder.filter((c) => grouped[c]?.length);

  // Build flat index map for keyboard navigation
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

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3D3A36]/40 backdrop-blur-[2px]" />

      {/* Palette panel */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-[#FFFDF9] border border-[#524E48]/25 rounded-xl shadow-[0_12px_48px_rgba(45,42,38,0.18)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-dashed border-[#524E48]/25">
          <Search className="w-4 h-4 text-[#78716C] shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索功能、页面、命令…"
            className="flex-1 bg-transparent outline-none text-sm text-[#2D2A26] placeholder-[#78716C]/60 font-handwriting text-[15px]"
          />
          <button
            onClick={onClose}
            className="p-1 text-[#78716C] hover:text-[#2D2A26] hover:bg-[#F2EBDC] rounded transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {flatItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 mx-auto mb-3 text-[#E0D5C1]" strokeWidth={1.75} />
              <p className="text-[#78716C] text-sm">未找到匹配的功能</p>
            </div>
          ) : (
            orderedCategories.map((cat) => (
              <div key={cat} className="mb-1">
                <p className="px-3 py-1 text-[10px] font-mono uppercase tracking-[0.15em] text-[#78716C]/60">
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
                          ? 'bg-[#C25932]/10 border border-dashed border-[#C25932]/40 text-[#2D2A26]'
                          : 'text-[#5C5246] hover:bg-[#F7F3EB] border border-transparent'
                      )}
                    >
                      <div className={classNames(
                        'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                        isActive ? 'bg-[#C25932] text-[#FAF7F2] shadow-[1px_1px_0px_0px_#2B2927]' : 'bg-[#F2EBDC] text-[#78716C]'
                      )}>
                        <Icon className="w-4 h-4" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={classNames('text-sm font-medium', isActive ? 'text-[#2D2A26]' : 'text-[#2D2A26]')}>
                          {item.label}
                        </p>
                        <p className="text-xs text-[#78716C] truncate">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.kbd && (
                          <kbd className="bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1] rounded px-1.5 py-0.5 text-[10px] font-mono">
                            {item.kbd}
                          </kbd>
                        )}
                        <ChevronRight className={classNames(
                          'w-4 h-4 transition-colors',
                          isActive ? 'text-[#C25932]' : 'text-[#E0D5C1]'
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
        <div className="flex items-center justify-between px-4 py-2 border-t border-dashed border-[#524E48]/25 bg-[#F7F3EB]">
          <div className="flex items-center gap-3 text-[11px] text-[#78716C]">
            <span className="flex items-center gap-1">
              <kbd className="bg-[#FFFDF9] text-[#5C5246] border border-[#E0D5C1] rounded px-1 py-0.5 text-[10px] font-mono">↑</kbd>
              <kbd className="bg-[#FFFDF9] text-[#5C5246] border border-[#E0D5C1] rounded px-1 py-0.5 text-[10px] font-mono">↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#FFFDF9] text-[#5C5246] border border-[#E0D5C1] rounded px-1 py-0.5 text-[10px] font-mono">↵</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[#FFFDF9] text-[#5C5246] border border-[#E0D5C1] rounded px-1 py-0.5 text-[10px] font-mono">Esc</kbd>
              关闭
            </span>
          </div>
          <span className="text-[10px] text-[#78716C]/60 font-handwriting">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
