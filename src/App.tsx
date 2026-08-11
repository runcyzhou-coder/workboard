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
    <div className="flex min-h-screen bg-[#FAF7F2] text-[#2D2A26]">
      <Sidebar
        currentPage={page}
        onPageChange={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#FAF7F2]/90 backdrop-blur-sm border-b border-[#E8E2D5] px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-[#78716C] hover:text-[#2D2A26]">
            <Menu className="w-6 h-6" strokeWidth={1.75} />
          </button>
          <span className="font-serif font-bold text-[#2D2A26]">KIKI TECH</span>
        </header>

        {/* Desktop top bar — 羊皮纸极简风格，带下划边框 */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-[#FAF7F2]/85 backdrop-blur-sm border-b border-[#E8E2D5] px-8 py-3 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage('home')}
            className="group flex items-center gap-2 text-left"
          >
            <span className="w-7 h-7 rounded-md bg-[#C25932] flex items-center justify-center text-[#FAF7F2] text-[12px] font-serif font-bold shadow-[2px_2px_0px_0px_#2B2927]">
              K
            </span>
            <span className="text-sm font-serif font-bold tracking-wide text-[#2D2A26]">
              KIKI TECH
            </span>
            <span className="text-[10px] text-[#78716C]/70 font-mono uppercase tracking-[0.15em] ml-1 hidden xl:inline">
              · CRM
            </span>
          </button>

          {/* Command Palette trigger — 纸质输入框 */}
          <div className="flex-1 max-w-md mx-6">
            <div className="group flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-[#F7F3EB] border border-dashed border-[#524E48]/25 hover:border-[#C25932] transition-colors cursor-text">
              <Search className="w-3.5 h-3.5 text-[#78716C] shrink-0" strokeWidth={1.75} />
              <span className="text-xs text-[#78716C] flex-1 font-handwriting text-[13px]">搜索或运行命令…</span>
              <span className="inline-flex items-center gap-0.5">
                <kbd className="bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1] rounded px-1.5 py-0.5 text-[10px] font-mono">⌘</kbd>
                <kbd className="bg-[#F2EBDC] text-[#5C5246] border border-[#E0D5C1] rounded px-1.5 py-0.5 text-[10px] font-mono">K</kbd>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-[#78716C] font-handwriting text-[13px] hidden xl:inline">guest@kiki-tech.com</span>
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
