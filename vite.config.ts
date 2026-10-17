import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // ===== 代码分割 =====
  // 把大依赖拆成独立 chunk，浏览器缓存一次后所有页面共享
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 基础（所有页面都需要）
          react: ['react', 'react-dom', 'react-dom/client'],
          // Supabase（认证/数据）
          supabase: ['@supabase/supabase-js'],
          // lucide 图标
          lucide: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
});
