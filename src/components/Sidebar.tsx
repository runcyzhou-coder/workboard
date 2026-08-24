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
  MessageCircle,
  Compass,
} from 'lucide-react';
import { classNames } from '@/lib/utils';

export type Page =
  | 'home'
  | 'dashboard'
  | 'customers'
  | 'inquiries'
  | 'shipments'
  | 'products'
  | 'ai-chat'
  | 'document-center'
  | 'profit-calculator'
  | 'after-sales'
  | 'tools'
  | 'dev-customers';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: { id: Page; label: string; icon: typeof Home; kbd: string }[] = [
  { id: 'home', label: '首页', icon: Home, kbd: 'G H' },
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, kbd: 'G D' },
  { id: 'dev-customers', label: '客户开发', icon: Compass, kbd: 'G V' },
  { id: 'customers', label: '客户管理', icon: Users, kbd: 'G C' },
  { id: 'inquiries', label: '询盘管理', icon: Inbox, kbd: 'G I' },
  { id: 'shipments', label: '订单履约', icon: Truck, kbd: 'G S' },
  { id: 'products', label: '产品管理', icon: Package, kbd: 'G P' },
  // { id: 'ai-chat', label: '智能客服', icon: MessageCircle, kbd: 'G M' }, // 暂时隐藏：流程未跑通
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
          className="fixed inset-0 bg-[#3D3A36]/40 backdrop-blur-[1px] z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#FFFDF9] text-[#2D2A26] flex flex-col transition-transform duration-300 border-r border-[#E8E2D5] shadow-[4px_0_12px_rgba(45,42,38,0.03)]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-dashed border-[#524E48]/25">
          <div className="flex flex-col">
            <h1 className="text-base font-serif font-bold leading-tight tracking-wide text-[#2D2A26]">KIKI TECH</h1>
            <p className="text-[11px] text-[#78716C] leading-tight font-handwriting mt-0.5">外贸智能工作台</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-[#78716C] hover:text-[#2D2A26]">
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-[#78716C]/70">
            — Navigation —
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
                    ? 'bg-[#7BA369] text-[#FAF7F2] shadow-[2px_2px_0px_0px_#2B2927]'
                    : 'text-[#5C5246] hover:bg-[#F2EBDC] hover:text-[#2D2A26] border border-transparent hover:border-dashed hover:border-[#524E48]/25'
                )}
              >
                <Icon className={classNames('w-[16px] h-[16px] shrink-0', isActive ? 'text-[#FAF7F2]' : 'text-[#78716C] group-hover:text-[#2D2A26]')} strokeWidth={1.75} />
                <span className="flex-1 text-left">{item.label}</span>
                {!isActive && (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-[#F2EBDC] text-[#78716C] border border-[#E0D5C1] rounded px-1 py-0.5 text-[10px] font-mono">
                    {item.kbd}
                  </kbd>
                )}
                {isActive && (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-[#FAF7F2]/20 text-[#FAF7F2]/90 border border-[#FAF7F2]/30 rounded px-1 py-0.5 text-[10px] font-mono">
                    {item.kbd}
                  </kbd>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-dashed border-[#524E48]/25">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F5D50] animate-pulse" />
              <p className="text-[10px] text-[#78716C] font-mono">System Online</p>
            </div>
            <kbd className="bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1] rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
          </div>
          <p className="text-[11px] text-[#78716C] text-center mt-2 font-handwriting">学会世界的语言，做成世界的生意</p>
        </div>
      </aside>
    </>
  );
}
