import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, hasValidSupabaseConfig } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isLocalMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // 本地降级模式：未配置Supabase时用localStorage模拟多用户
  const [isLocalMode] = useState(!hasValidSupabaseConfig);

  useEffect(() => {
    if (isLocalMode) {
      // 本地模式：从localStorage恢复登录状态
      try {
        const saved = localStorage.getItem('wb_auth_user');
        if (saved) {
          const userData = JSON.parse(saved);
          setUser({ id: userData.id, email: userData.email } as User);
        }
      } catch {}
      setLoading(false);
      return;
    }

    // Supabase 模式：监听认证状态变化
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      // 同步用户ID到 wb_auth_user，供 localClient 做数据命名空间隔离使用
      if (u) {
        localStorage.setItem('wb_auth_user', JSON.stringify({ id: u.id, email: u.email }));
      } else {
        localStorage.removeItem('wb_auth_user');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // 同步用户ID到 wb_auth_user，供 localClient 做数据命名空间隔离使用
      if (u) {
        localStorage.setItem('wb_auth_user', JSON.stringify({ id: u.id, email: u.email }));
      } else {
        localStorage.removeItem('wb_auth_user');
      }
    });

    return () => subscription.unsubscribe();
  }, [isLocalMode]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isLocalMode) {
      // 本地模式：用localStorage模拟登录
      const users = JSON.parse(localStorage.getItem('wb_users') || '[]');
      const found = users.find((u: any) => u.email === email && u.password === password);
      if (!found) {
        return { error: '邮箱或密码错误' };
      }
      const userData = { id: found.id, email: found.email };
      localStorage.setItem('wb_auth_user', JSON.stringify(userData));
      setUser(userData as User);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // 登录成功后同步用户ID到 wb_auth_user，供 localClient 数据隔离使用
    if (data.user) {
      localStorage.setItem('wb_auth_user', JSON.stringify({ id: data.user.id, email: data.user.email }));
    }
    return { error: null };
  }, [isLocalMode]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (isLocalMode) {
      // 本地模式：注册新用户到localStorage
      const users = JSON.parse(localStorage.getItem('wb_users') || '[]');
      if (users.some((u: any) => u.email === email)) {
        return { error: '该邮箱已注册' };
      }
      const newUser = {
        id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        email,
        password,
      };
      users.push(newUser);
      localStorage.setItem('wb_users', JSON.stringify(users));
      const userData = { id: newUser.id, email: newUser.email };
      localStorage.setItem('wb_auth_user', JSON.stringify(userData));
      setUser(userData as User);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // 注册成功后同步用户ID到 wb_auth_user，供 localClient 数据隔离使用
    if (data.user) {
      localStorage.setItem('wb_auth_user', JSON.stringify({ id: data.user.id, email: data.user.email }));
    }
    return { error: null };
  }, [isLocalMode]);

  const signOut = useCallback(async () => {
    if (isLocalMode) {
      localStorage.removeItem('wb_auth_user');
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    // 清除本地用户标识
    localStorage.removeItem('wb_auth_user');
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

// 获取当前用户ID（用于数据查询时过滤/命名空间隔离）
export function getCurrentUserId(): string | null {
  // 从 wb_auth_user 获取（登录时已同步写入）
  try {
    const saved = localStorage.getItem('wb_auth_user');
    if (saved) {
      const userData = JSON.parse(saved);
      return userData.id;
    }
  } catch {}
  return null;
}
