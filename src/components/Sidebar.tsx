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

const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'customers', label: '客户管理', icon: Users },
  { id: 'inquiries', label: '询盘管理', icon: Inbox },
  { id: 'shipments', label: '物流管理', icon: Truck },
  { id: 'products', label: '产品管理', icon: Package },
  { id: 'document-center', label: '单据中心', icon: FolderOpen },
  { id: 'profit-calculator', label: '防亏核算', icon: Calculator },
  { id: 'after-sales', label: '售后处理', icon: Headphones },
  { id: 'tools', label: '贸易工具', icon: Wrench },
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
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-wide">KIKI TECH</h1>
              <p className="text-[10px] text-slate-400 leading-tight">外贸智能工作台</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className={classNames('w-[18px] h-[18px]', isActive ? 'text-white' : 'text-slate-400')} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 text-center">学会世界的语言，做成世界的生意</p>
        </div>
      </aside>
    </>
  );
}
