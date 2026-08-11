/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        raycast: {
          bg: '#0C0C0E',
          surface: '#131316',
          surface2: '#1A1A1F',
        },
        brand: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'raycast-card': '0 0 20px rgba(255,255,255,0.03)',
        'raycast-glow': '0 0 24px rgba(59,130,246,0.25)',
      },
    },
  },
  plugins: [],
};
