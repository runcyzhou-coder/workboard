import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// ===== 本地账号系统 =====
// 账号与密码保存在浏览器本地，不依赖任何外部服务（Supabase / 网络）。
// 这样无论网络如何、后端是否可用，登录与注册都始终可以正常使用。
// 不同账号的数据通过用户ID命名空间隔离，互不干扰。

export interface SimpleUser {
  id: string;
  email: string;
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isLocalMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'wb_users';
const SESSION_KEY = 'wb_auth_user';

// ===== 安全的本地存储读写 =====
// 兼容：隐私模式禁用 localStorage、存储配额不足、存储被清理等异常场景
const memoryFallback: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch {}
  return key in memoryFallback ? memoryFallback[key] : null;
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
  // 同时在内存中保留一份，避免 localStorage 不可用时直接崩溃
  memoryFallback[key] = value;
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
  delete memoryFallback[key];
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function loadUsers(): StoredUser[] {
  const raw = safeGet(USERS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u: any) => u && u.email && u.id) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  safeSet(USERS_KEY, JSON.stringify(users));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 启动时恢复登录状态
  useEffect(() => {
    try {
      const raw = safeGet(SESSION_KEY);
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.id && u.email) {
          setUser({ id: u.id, email: u.email });
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const target = (email || '').trim().toLowerCase();
    if (!target || !password) return { error: '请填写邮箱和密码' };

    const users = loadUsers();
    const found = users.find((u) => u.email.toLowerCase() === target);
    if (!found) {
      return { error: '该邮箱还未注册，请先点击上方「注册」创建账号' };
    }
    if (found.password !== password) {
      return { error: '密码不正确，请重新输入' };
    }

    const session = { id: found.id, email: found.email };
    safeSet(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const target = (email || '').trim().toLowerCase();
    if (!target || !password) return { error: '请填写邮箱和密码' };
    if (!EMAIL_RE.test(target)) return { error: '邮箱格式不正确，请检查后重试' };
    if (password.length < 6) return { error: '密码至少需要 6 位' };

    const users = loadUsers();
    if (users.some((u) => u.email.toLowerCase() === target)) {
      return { error: '该邮箱已注册，请直接登录' };
    }

    const created: StoredUser = {
      id: genId(),
      email: target,
      password,
      created_at: new Date().toISOString(),
    };
    users.push(created);
    saveUsers(users);

    // 注册成功后自动登录，直接进入应用
    const session = { id: created.id, email: created.email };
    safeSet(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    safeRemove(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isLocalMode: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// 获取当前用户ID（用于数据按用户隔离）
export function getCurrentUserId(): string | null {
  try {
    const raw = safeGet(SESSION_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (u && u.id) return u.id;
    }
  } catch {}
  return null;
}
