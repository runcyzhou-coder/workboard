import { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Sidebar, type Page } from '@/components/Sidebar';
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

  return (
    <div className="flex min-h-screen bg-[#0C0C0E] text-zinc-100">
      <Sidebar
        currentPage={page}
        onPageChange={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0C0C0E]/90 backdrop-blur-md border-b border-white/[0.06] text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-zinc-100">KIKI TECH</span>
        </header>

        {/* Desktop top bar — Raycast minimalist floating header with ⌘K search */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-[#0C0C0E]/80 backdrop-blur-md border-b border-white/[0.06] px-8 py-2.5 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage('home')}
            className="group flex items-center gap-2 text-left"
          >
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] flex items-center justify-center text-white text-[11px] font-bold shadow-[0_0_16px_rgba(59,130,246,0.35)]">
              K
            </span>
            <span className="text-sm font-semibold text-zinc-100 tracking-wide">
              KIKI TECH
            </span>
            <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider ml-1 hidden xl:inline">
              CRM
            </span>
          </button>

          {/* Command Palette trigger */}
          <div className="flex-1 max-w-md mx-6">
            <div className="group flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-text">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-xs text-zinc-500 flex-1">搜索或运行命令…</span>
              <span className="inline-flex items-center gap-0.5">
                <kbd className="bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-inner">⌘</kbd>
                <kbd className="bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-inner">K</kbd>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-500 font-mono hidden xl:inline">guest@kiki-tech.com</span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {page === 'home' && <HomePage onNavigate={setPage} />}
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
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
    </div>
  );
}

export default App;
