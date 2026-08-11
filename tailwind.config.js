/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          bg: '#FAF7F2',      // 暖黄米白纸质底
          card: '#FFFDF9',    // 微暖乳白卡片
          sunken: '#F2EBDC',  // 凹陷/次级背景
          input: '#F7F3EB',   // 输入框底
          border: '#E8E2D5',  // 纸质切边边框
          ink: '#2D2A26',     // 深炭木墨色
          muted: '#78716C',   // 暖棕灰
          graphite: '#3D3A36',// 石墨色
        },
        clay: {
          DEFAULT: '#7BA369', // 抹茶绿(品牌主色)
          dark: '#5F8A4D',    // 深抹茶绿
          light: '#A8C28E',   // 浅抹茶绿
        },
        stamp: {
          red: { bg: '#FDF2F2', text: '#9B2C2C', border: '#F5C6C6' },
          green: { bg: '#F0F5F2', text: '#2F5D50', border: '#C2D6C8' },
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        handwriting: ['"Caveat"', '"Kalam"', 'cursive'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'paper': '0 2px 8px rgba(45,42,38,0.04)',
        'paper-md': '0 4px 16px rgba(45,42,38,0.06)',
        'pencil': '3px 3px 0px 0px #2B2927',
      },
    },
  },
  plugins: [],
};
