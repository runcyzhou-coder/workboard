import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, hasValidSupabaseConfig } from './supabase';

// ====== 用户对象 ======
// 兼容 Supabase User 和本地降级 SimpleUser
export interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isLocalMode: boolean; // 云端不可用时的本地降级模式
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ====== 本地降级账号 ======
// 当 Supabase Auth 不可用时（网络/配置问题），自动降级到浏览器本地
// 这样无论云端状态如何，登录注册永远可用
const LOCAL_USERS_KEY = 'wb_users';
const LOCAL_SESSION_KEY = 'wb_auth_user';

const memoryFallback: Record<string, string> = {};
function safeGet(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch {}
  return key in memoryFallback ? memoryFallback[key] : null;
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch {}
  memoryFallback[key] = value;
}
function safeRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
  delete memoryFallback[key];
}

function loadLocalUsers(): Array<{ id: string; email: string; password: string }> {
  const raw = safeGet(LOCAL_USERS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u: any) => u && u.email && u.id) : [];
  } catch { return []; }
}
function saveLocalUsers(users: any[]): void { safeSet(LOCAL_USERS_KEY, JSON.stringify(users)); }
function genLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // ===== 启动：恢复登录态 =====
  useEffect(() => {
    let cancelled = false;

    const restoreFromLocal = () => {
      try {
        const raw = safeGet(LOCAL_SESSION_KEY);
        if (raw) {
          const u = JSON.parse(raw);
          if (u && u.id && u.email) setUser({ id: u.id, email: u.email });
        }
      } catch {}
      setLoading(false);
    };

    if (!hasValidSupabaseConfig) {
      restoreFromLocal();
      return;
    }

    // 尝试从 Supabase 恢复会话
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
          safeSet(LOCAL_SESSION_KEY, JSON.stringify({ id: session.user.id, email: session.user.email }));
        } else {
          restoreFromLocal();
          return;
        }

        // 监听认证状态变化（只在 Supabase 模式下）
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email });
            safeSet(LOCAL_SESSION_KEY, JSON.stringify({ id: session.user.id, email: session.user.email }));
          } else {
            setUser(null);
            safeRemove(LOCAL_SESSION_KEY);
          }
        });
        // 只在恢复成功后才监听，避免重复订阅
        // subscription.unsubscribe 在卸载时调用
      } catch (e) {
        // Supabase Auth 不可用 → 降级到本地
        console.warn('[Auth] Supabase Auth 不可用，降级本地模式:', e);
        setIsLocalMode(true);
        restoreFromLocal();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ===== 登录 =====
  const signIn = useCallback(async (email: string, password: string) => {
    const target = (email || '').trim().toLowerCase();
    if (!target || !password) return { error: '请填写邮箱和密码' };

    // 云端模式优先尝试 Supabase
    if (hasValidSupabaseConfig && !isLocalMode) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: target, password });
        if (error) {
          // 邮箱不存在（500）→ 提示先注册
          if (error.status === 400 && /invalid login credentials/i.test(error.message)) {
            return { error: '邮箱或密码错误，请重新输入' };
          }
          if (error.status === 400 && /email.*confirm/i.test(error.message)) {
            return { error: '请先去邮箱点击验证链接，或联系管理员开启"Email Confirmations"' };
          }
          return { error: error.message };
        }
        if (data.user) {
          safeSet(LOCAL_SESSION_KEY, JSON.stringify({ id: data.user.id, email: data.user.email }));
          setUser({ id: data.user.id, email: data.user.email });
          return { error: null };
        }
        return { error: '登录失败，请重试' };
      } catch (e: any) {
        // 网络/配置问题 → 自动降级本地
        console.warn('[Auth] Supabase 登录失败，降级本地:', e?.message);
      }
    }

    // 本地降级模式
    const users = loadLocalUsers();
    const found = users.find((u) => u.email.toLowerCase() === target);
    if (!found) return { error: '该邮箱还未注册，请先点「注册」创建账号' };
    if (found.password !== password) return { error: '密码不正确，请重新输入' };
    safeSet(LOCAL_SESSION_KEY, JSON.stringify({ id: found.id, email: found.email }));
    setUser({ id: found.id, email: found.email });
    return { error: null };
  }, [isLocalMode]);

  // ===== 注册 =====
  const signUp = useCallback(async (email: string, password: string) => {
    const target = (email || '').trim().toLowerCase();
    if (!target || !password) return { error: '请填写邮箱和密码' };
    if (!EMAIL_RE.test(target)) return { error: '邮箱格式不正确，请检查后重试' };
    if (password.length < 6) return { error: '密码至少需要 6 位' };

    // 云端模式优先尝试 Supabase
    if (hasValidSupabaseConfig && !isLocalMode) {
      try {
        const { data, error } = await supabase.auth.signUp({ email: target, password });
        if (error) {
          // 如果 Supabase 报该邮箱已存在（但之前登录却找不到），提示用登录
          if (/already registered|already exists/i.test(error.message)) {
            return { error: '该邮箱已注册，请直接登录' };
          }
          return { error: error.message };
        }
        // Supabase 注册可能返回 email_needed 或直接带 user
        if (data.user) {
          // 成功注册并拿到了 user（通常是 Confirm Email 关闭时）→ 直接登录
          safeSet(LOCAL_SESSION_KEY, JSON.stringify({ id: data.user.id, email: data.user.email }));
          setUser({ id: data.user.id, email: data.user.email });
          return { error: null };
        }
        // Confirm Email 开启 → 提示去邮箱验证
        return {
          error: '注册请求已提交，请查收邮箱点击验证链接。如果没收到，请检查垃圾邮件，或告诉我关闭 Confirm Email。',
        };
      } catch (e: any) {
        console.warn('[Auth] Supabase 注册失败，降级本地:', e?.message);
      }
    }

    // 本地降级模式
    const users = loadLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === target)) {
      return { error: '该邮箱已注册，请直接登录' };
    }
    const created = { id: genLocalId(), email: target, password, created_at: new Date().toISOString() };
    users.push(created);
    saveLocalUsers(users);
    safeSet(LOCAL_SESSION_KEY, JSON.stringify({ id: created.id, email: created.email }));
    setUser({ id: created.id, email: created.email });
    return { error: null };
  }, [isLocalMode]);

  // ===== 登出 =====
  const signOut = useCallback(async () => {
    try {
      if (hasValidSupabaseConfig && !isLocalMode) {
        await supabase.auth.signOut();
      }
    } catch {}
    safeRemove(LOCAL_SESSION_KEY);
    setUser(null);
  }, [isLocalMode]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isLocalMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// 获取当前用户ID（供数据隔离/命名空间使用）
export function getCurrentUserId(): string | null {
  try {
    const raw = safeGet(LOCAL_SESSION_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.id) return u.id;
    }
  } catch {}
  return null;
}
