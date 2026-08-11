import { useState, useEffect } from 'react';
import { Menu, LogOut, Search } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-[#0C0C0E]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5232] to-[#FF7A00] flex items-center justify-center shadow-[0_0_24px_rgba(255,82,50,0.45)]">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-[#FF5232] rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Login onLogin={handleLogin} />;
  }

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
          <button onClick={handleLogout} className="ml-auto text-zinc-500 hover:text-[#FF5232]">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Desktop top bar — Raycast minimalist floating header with ⌘K search */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-[#0C0C0E]/80 backdrop-blur-md border-b border-white/[0.06] px-8 py-2.5 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage('home')}
            className="group flex items-center gap-2 text-left"
          >
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF5232] to-[#FF7A00] flex items-center justify-center text-white text-[11px] font-bold shadow-[0_0_16px_rgba(255,82,50,0.35)]">
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
            <span className="text-xs text-zinc-500 font-mono hidden xl:inline">{userEmail}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-[#FF5232] hover:bg-[#FF5232]/10 border border-transparent hover:border-[#FF5232]/20 rounded-md transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
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
