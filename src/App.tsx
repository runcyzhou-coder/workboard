import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type Page } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { Customers } from '@/components/Customers';
import { Products } from '@/components/Products';
import { DocumentCenter } from '@/components/DocumentCenter';
import { ProfitCalculator } from '@/components/ProfitCalculator';
import { Learning } from '@/components/Learning';
import { TradeTools } from '@/components/TradeTools';

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        currentPage={page}
        onPageChange={setPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold">KIKI TECH</span>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'customers' && <Customers />}
          {page === 'products' && <Products />}
          {page === 'document-center' && <DocumentCenter />}
          {page === 'profit-calculator' && <ProfitCalculator />}
          {page === 'learning' && <Learning />}
          {page === 'tools' && <TradeTools />}
        </main>
      </div>
    </div>
  );
}

export default App;
