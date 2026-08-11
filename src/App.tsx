import { useState, useEffect, useCallback } from 'react';
import { Menu, Search } from 'lucide-react';
import { Sidebar, type Page } from '@/components/Sidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { HomePage } from '@/components/HomePage';
import { Dashboard } from '@/components/Dashboard';
import { Customers } from '@/components/Customers';
import { Inquiries } from '@/components/Inquiries';
import { Shipments } from '@/components/Shipments';
import { Products } from '@/components/Products';
import { DocumentCenter, type DocType } from '@/components/DocumentCenter';
import { ProfitCalculator } from '@/components/ProfitCalculator';
import { AfterSales } from '@/components/AfterSales';
import { TradeTools } from '@/components/TradeTools';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingDocType, setPendingDocType] = useState<DocType | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K to toggle command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = useCallback((p: Page) => {
    setPage(p);
    setPaletteOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0B0813] text-[#F3EFE6] relative">
      <Sidebar
        currentPage={page}
        onPageChange={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0B0813]/80 backdrop-blur-md border-b-2 border-[#3A2D54] px-4 py-3 flex items-center gap-3 shadow-arcane">
          <button onClick={() => setSidebarOpen(true)} className="text-[#B8AEC8] hover:text-[#A855F7]">
            <Menu className="w-6 h-6" strokeWidth={1.75} />
          </button>
          <span className="font-serif font-bold text-[#F3EFE6] tracking-wide">KIKI TECH</span>
          <span className="ml-auto text-[10px] text-[#8879A0] font-mono uppercase tracking-[0.15em]">INTJ · 战略领主</span>
        </header>

        {/* Desktop top bar — INTJ 暗紫城堡顶栏 */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-[#0B0813]/75 backdrop-blur-md border-b-2 border-[#3A2D54] px-8 py-3 items-center justify-between gap-3 shadow-[0_0_18px_rgba(168,85,247,0.12)]">
          <button
            type="button"
            onClick={() => setPage('home')}
            className="group flex items-center gap-3 text-left"
          >
            {/* Logo — 紫晶宝石 */}
            <span className="relative inline-flex w-8 h-8 rounded-md bg-gradient-to-br from-[#A855F7] to-[#6B21A8] items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.5)] rpg-cut">
              <span className="text-[13px] font-black text-white drop-shadow">♟</span>
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold tracking-wide text-[#F3EFE6]">KIKI TECH</span>
                <span className="text-[10px] text-[#A855F7] font-mono uppercase tracking-[0.2em] border border-[#A855F7]/40 rounded px-1.5 py-0.5">
                  INTJ 战略领主
                </span>
              </div>
              <span className="text-[10px] text-[#8879A0] tracking-widest">CHIEF ARCHITECT · MASTER OF STRATEGY</span>
            </div>
          </button>

          {/* Command Palette trigger */}
          <div className="flex-1 max-w-md mx-6">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#1B142C]/60 border-2 border-[#3A2D54] hover:border-[#A855F7] transition-colors cursor-text text-left backdrop-blur-md"
            >
              <Search className="w-3.5 h-3.5 text-[#A855F7] shrink-0 group-hover:text-[#D8B4FE]" strokeWidth={1.75} />
              <span className="text-xs text-[#8879A0] flex-1 group-hover:text-[#B8AEC8]">推演你的下一步战略…</span>
              <span className="inline-flex items-center gap-0.5">
                <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1.5 py-0.5 text-[10px] font-mono">⌘</kbd>
                <kbd className="bg-[#221A3A] text-[#B8AEC8] border border-[#3A2D54] rounded px-1.5 py-0.5 text-[10px] font-mono">K</kbd>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button className="px-3 py-1.5 rounded-lg border-2 border-[#3A2D54] bg-[#1B142C]/60 hover:border-[#A855F7] transition-colors text-xs text-[#B8AEC8] hidden xl:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] shadow-[0_0_6px_#06B6D4] animate-pulse" />
              <span>战略推演模式已就绪</span>
            </button>
            <span className="text-xs text-[#8879A0] hidden lg:inline">guest@kiki-tech.com</span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {page === 'home' && <HomePage onNavigate={handleNavigate} />}
          {page === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {page === 'customers' && <Customers />}
          {page === 'inquiries' && <Inquiries onNavigateDoc={(t) => { setPendingDocType(t as DocType); setPage('document-center'); }} />}
          {page === 'shipments' && <Shipments />}
          {page === 'products' && <Products />}
          {page === 'document-center' && <DocumentCenter initialDocType={pendingDocType ?? undefined} onConsumed={() => setPendingDocType(null)} />}
          {page === 'profit-calculator' && <ProfitCalculator />}
          {page === 'after-sales' && <AfterSales />}
          {page === 'tools' && <TradeTools />}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default App;
