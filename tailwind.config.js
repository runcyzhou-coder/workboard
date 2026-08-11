/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ============ INTJ Dark Violet RPG Theme ============
        arcane: {
          bg: '#0B0813',          // 黑曜石深紫（最底）
          bg2: '#130E20',         // 渐变次底
          card: '#1B142C',        // 暗紫半透明卡片
          card2: '#221A3A',       // 悬浮卡片
          border: '#3A2D54',      // 暗银/灰紫金属边框
          borderLight: '#4A3A70',
          ink: '#F3EFE6',         // 白/淡金 主文字
          muted: '#B8AEC8',       // 次要文字
          dim: '#8879A0',
          gold: '#E8D7A8',
        },
        gem: {
          violet: '#A855F7',     // 电光紫（主高亮）
          violet2: '#8B5CF6',
          cyan: '#06B6D4',        // 量子蓝
          amber: '#F5B77A',
        },
        parchment: {
          bg: '#F2ECE1',          // AI 终端羊皮纸
          ink: '#2A2338',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        handwriting: ['"Caveat"', '"Kalam"', 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'arcane': '0_0_15px_rgba(168,85,247,0.15)',
        'arcane-md': '0_0_30px_rgba(168,85,247,0.22)',
        'arcane-glow': 'inset 0 0 18px rgba(168,85,247,0.15), 0 0 24px rgba(168,85,247,0.25)',
      },
      backgroundImage: {
        'arcane-grid': "linear-gradient(rgba(168,85,247,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.22) 1px, transparent 1px)",
      },
      keyframes: {
        'float-slow': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'arcane-pulse': {
          '0%,100%': { boxShadow: '0 0 12px rgba(168,85,247,0.3)' },
          '50%': { boxShadow: '0 0 28px rgba(168,85,247,0.65)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'arcane-pulse': 'arcane-pulse 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
      },
    },
  },
  plugins: [],
};
