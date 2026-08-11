import { useState, useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  Users,
  Package,
  Calculator,
  Wrench,
  FolderOpen,
  X,
  Inbox,
  Headphones,
  Truck,
} from 'lucide-react';
import { classNames } from '@/lib/utils';

export type Page =
  | 'home'
  | 'dashboard'
  | 'customers'
  | 'inquiries'
  | 'shipments'
  | 'products'
  | 'document-center'
  | 'profit-calculator'
  | 'after-sales'
  | 'tools';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: { id: Page; label: string; icon: typeof Home; kbd: string }[] = [
  { id: 'home', label: '首页', icon: Home, kbd: 'G H' },
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, kbd: 'G D' },
  { id: 'customers', label: '客户管理', icon: Users, kbd: 'G C' },
  { id: 'inquiries', label: '询盘管理', icon: Inbox, kbd: 'G I' },
  { id: 'shipments', label: '物流管理', icon: Truck, kbd: 'G S' },
  { id: 'products', label: '产品管理', icon: Package, kbd: 'G P' },
  { id: 'document-center', label: '单据中心', icon: FolderOpen, kbd: 'G O' },
  { id: 'profit-calculator', label: '防亏核算', icon: Calculator, kbd: 'G A' },
  { id: 'after-sales', label: '售后处理', icon: Headphones, kbd: 'G R' },
  { id: 'tools', label: '贸易工具', icon: Wrench, kbd: 'G T' },
];

export function Sidebar({ currentPage, onPageChange, isOpen, onClose }: SidebarProps) {
  const [activeItem, setActiveItem] = useState<Page>(currentPage);

  useEffect(() => {
    setActiveItem(currentPage);
  }, [currentPage]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0C0C0E] text-zinc-100 flex flex-col transition-transform duration-300 border-r border-white/[0.06]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.4)]">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-wide text-zinc-100">KIKI TECH</h1>
              <p className="text-[10px] text-zinc-500 leading-tight">外贸智能工作台</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  onClose();
                }}
                className={classNames(
                  'group w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white shadow-[0_0_18px_rgba(59,130,246,0.3)]'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                )}
              >
                <Icon className={classNames('w-[16px] h-[16px] shrink-0', isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300')} />
                <span className="flex-1 text-left">{item.label}</span>
                {!isActive && (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-zinc-800/60 text-zinc-600 border border-zinc-700/40 rounded px-1 py-0.5 text-[10px] font-mono">
                    {item.kbd}
                  </kbd>
                )}
                {isActive && (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-white/15 text-white/80 border border-white/20 rounded px-1 py-0.5 text-[10px] font-mono">
                    {item.kbd}
                  </kbd>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] text-zinc-500 font-mono">System Online</p>
            </div>
            <kbd className="bg-zinc-800/80 text-zinc-500 border border-zinc-700/60 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-inner">⌘K</kbd>
          </div>
          <p className="text-[10px] text-zinc-600 text-center mt-2">学会世界的语言，做成世界的生意</p>
        </div>
      </aside>
    </>
  );
}
