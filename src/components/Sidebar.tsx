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
  Crown,
  Sparkles,
  Gem,
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
  { id: 'home', label: '战略主殿', icon: Home, kbd: 'G H' },
  { id: 'dashboard', label: '全局推演', icon: LayoutDashboard, kbd: 'G D' },
  { id: 'customers', label: '客户图谱', icon: Users, kbd: 'G C' },
  { id: 'inquiries', label: '询盘谋略', icon: Inbox, kbd: 'G I' },
  { id: 'shipments', label: '物流节点', icon: Truck, kbd: 'G S' },
  { id: 'products', label: '产品矩阵', icon: Package, kbd: 'G P' },
  { id: 'document-center', label: '典籍文献', icon: FolderOpen, kbd: 'G O' },
  { id: 'profit-calculator', label: '利润演算', icon: Calculator, kbd: 'G A' },
  { id: 'after-sales', label: '售后裁决', icon: Headphones, kbd: 'G R' },
  { id: 'tools', label: '奥术工具', icon: Wrench, kbd: 'G T' },
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
          className="fixed inset-0 bg-[#0B0813]/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#1B142C]/95 text-[#F3EFE6] flex flex-col transition-transform duration-300 border-r-2 border-[#3A2D54] shadow-[0_0_20px_rgba(168,85,247,0.15)] backdrop-blur-md',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(168,85,247,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="pointer-events-none absolute -top-20 -right-10 w-48 h-48 rounded-full bg-[#A855F7]/20 blur-3xl" />

        <div className="relative px-5 py-5 border-b-2 border-[#3A2D54]">
          <div className="flex items-center gap-3">
            {/* Logo 徽章 */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#6B21A8] shadow-[0_0_12px_rgba(168,85,247,0.55)] rpg-cut" />
              <Crown className="relative w-5 h-5 text-[#F3EFE6]" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-serif font-bold leading-tight tracking-wide text-[#F3EFE6]">KIKI TECH</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono tracking-widest text-[#A855F7] uppercase">INTJ</span>
                <span className="text-[10px] text-[#B8AEC8]">战略领主 · 首席架构师</span>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-[#B8AEC8] hover:text-[#A855F7]">
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
          {/* 战略属性条 */}
          <div className="mt-4 grid grid-cols-4 gap-1.5 text-[10px]">
            {[
              { label: '谋', v: 95 },
              { label: '冷静', v: 92 },
              { label: '规划', v: 88 },
              { label: '洞察', v: 90 },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-[#3A2D54] bg-[#0B0813]/60 py-1.5 text-center">
                <div className="text-[#A855F7] font-bold">{s.v}</div>
                <div className="text-[#8879A0]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-[#8879A0]">
            — 战略导航 —
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
                  'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-[#A855F7]/25 via-[#6B21A8]/15 to-transparent text-[#F3EFE6] border-2 border-[#A855F7]/50 shadow-[0_0_14px_rgba(168,85,247,0.25)]'
                    : 'text-[#B8AEC8] hover:bg-[#1B142C]/70 hover:text-[#F3EFE6] border-2 border-transparent hover:border-[#3A2D54]'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#A855F7] to-[#06B6D4] rounded-r" />
                )}
                <Icon className={classNames('w-[16px] h-[16px] shrink-0', isActive ? 'text-[#A855F7]' : 'text-[#8879A0] group-hover:text-[#A855F7]')} strokeWidth={1.75} />
                <span className="flex-1 text-left">{item.label}</span>
                {!isActive && (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-[#221A3A] text-[#8879A0] border border-[#3A2D54] rounded px-1 py-0.5 text-[10px] font-mono">
                    {item.kbd}
                  </kbd>
                )}
                {isActive && (
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 bg-[#A855F7]/20 text-[#F3EFE6] border border-[#A855F7]/40 rounded px-1 py-0.5 text-[10px] font-mono">
                    {item.kbd}
                  </kbd>
                )}
              </button>
            );
          })}
        </nav>

        {/* 底部：等级徽章 */}
        <div className="relative px-4 py-4 border-t-2 border-[#3A2D54] bg-gradient-to-b from-transparent to-[#0B0813]/80">
          <div className="rounded-xl border-2 border-[#3A2D54] bg-[#1B142C]/60 p-3 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-3.5 h-3.5 text-[#A855F7]" />
              <p className="text-[10px] font-mono tracking-widest text-[#A855F7] uppercase">RANK · 战略领主</p>
            </div>
            <div className="space-y-1 text-[11px] text-[#B8AEC8]">
              <div className="flex items-center justify-between">
                <span>🧠 INTJ 逻辑能量</span>
                <span className="text-[#A855F7] font-semibold">99%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#0B0813] overflow-hidden border border-[#3A2D54]">
                <div className="h-full w-[99%] bg-gradient-to-r from-[#A855F7] to-[#06B6D4] shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse shadow-[0_0_6px_#06B6D4]" />
                <p className="text-[10px] text-[#8879A0] font-mono">系统 · 运行中</p>
              </div>
              <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </div>
          </div>
          <p className="text-[11px] text-[#8879A0] text-center mt-3 font-handwriting">思想推演前路，逻辑铸就结果</p>
        </div>
      </aside>
    </>
  );
}
