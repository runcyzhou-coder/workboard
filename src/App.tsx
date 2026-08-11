import { useState, useEffect } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { Sidebar, type Page } from '@/components/Sidebar';
import { Login } from '@/components/Login';
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
import { supabase } from '@/lib/supabase';

const ALLOWED_DOMAIN = '@kiki-tech.com';

function App() {
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [pendingDocType, setPendingDocType] = useState<DocType | null>(null);

  useEffect(() => {
    // 检查 Supabase 是否支持 auth（本地模式没有 auth）
    const hasAuth = typeof (supabase as any).auth !== 'undefined';

    if (!hasAuth) {
      // 本地模式：从 localStorage 恢复登录
      const saved = localStorage.getItem('wb_auth_user');
      if (saved && saved.endsWith(ALLOWED_DOMAIN)) {
        setAuthed(true);
        setUserEmail(saved);
      }
      setCheckingSession(false);
      return;
    }

    // Supabase 模式：检查现有 session
    (supabase as any).auth.getSession().then(({ data }: any) => {
      const email = data?.session?.user?.email;
      if (email && email.endsWith(ALLOWED_DOMAIN)) {
        setAuthed(true);
        setUserEmail(email);
      }
      setCheckingSession(false);
    });

    // 监听 auth 状态变化
    const { data: listener } = (supabase as any).auth.onAuthStateChange((_event: any, session: any) => {
      const email = session?.user?.email;
      if (email && email.endsWith(ALLOWED_DOMAIN)) {
        setAuthed(true);
        setUserEmail(email);
      } else {
        setAuthed(false);
        setUserEmail('');
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  function handleLogin(email: string) {
    setAuthed(true);
    setUserEmail(email);
  }

  async function handleLogout() {
    const hasAuth = typeof (supabase as any).auth !== 'undefined';
    if (hasAuth) {
      await (supabase as any).auth.signOut();
    }
    localStorage.removeItem('wb_auth_user');
    setAuthed(false);
    setUserEmail('');
    setPage('home');
  }

  // 加载中状态
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Login onLogin={handleLogin} />;
  }

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
          <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop top bar with user info */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-2.5 items-center justify-end gap-3">
          <span className="text-sm text-slate-500">{userEmail}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            退出
          </button>
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
