import { useState } from 'react';
import { BookOpen, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-4">
      <div className="w-full max-w-md">
        {/* Logo区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#E8F0E0] border border-[#7BA369]/20 mb-4">
            <img src="/favicon.svg" alt="KIKI TECH" className="w-14 h-14" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#2D2A26] tracking-wide">KIKI TECH</h1>
          <p className="text-sm text-[#78716C] mt-1 font-handwriting">外贸智能工作台</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-[#FFFDF9] border border-[#E8E2D5] rounded-xl shadow-[0_8px_32px_rgba(45,42,38,0.06)] p-8">
          {/* 模式切换 */}
          <div className="flex gap-1 p-1 bg-[#F2EBDC] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-sm'
                  : 'text-[#78716C] hover:text-[#2D2A26]'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-[#FFFDF9] text-[#2D2A26] shadow-sm'
                  : 'text-[#78716C] hover:text-[#2D2A26]'
              }`}
            >
              注册
            </button>
          </div>

          <h2 className="text-lg font-serif font-bold text-[#2D2A26] mb-1">
            {mode === 'signin' ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-xs text-[#78716C] mb-6">
            {mode === 'signin' ? '登录查看你的外贸业务数据' : '注册后开始管理你的客户和订单'}
          </p>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#5C5246] mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" strokeWidth={1.75} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[#F7F3EB] border border-[#E8E2D5] text-sm text-[#2D2A26] placeholder-[#A8A29E] focus:outline-none focus:border-[#7BA369] focus:bg-[#FFFDF9] transition-colors"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5246] mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" strokeWidth={1.75} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[#F7F3EB] border border-[#E8E2D5] text-sm text-[#2D2A26] placeholder-[#A8A29E] focus:outline-none focus:border-[#7BA369] focus:bg-[#FFFDF9] transition-colors"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#2D5A3D] text-[#FAF7F2] text-sm font-medium hover:bg-[#246235] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
              {mode === 'signin' ? '登录' : '注册'}
            </button>
          </form>

          <p className="mt-4 text-xs text-[#A8A29E] text-center leading-relaxed">
            账号与数据保存在当前浏览器中，不同账号的数据相互独立
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-[#78716C] font-handwriting">
          学会世界的语言，做成世界的生意
        </p>
      </div>
    </div>
  );
}
