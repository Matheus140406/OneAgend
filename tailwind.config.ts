import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0a0a0c',
          900: '#121215',
          800: '#1a1a1f',
          700: '#242429',
          600: '#33333a',
          500: '#54545c',
          400: '#7a7a84',
          300: '#a3a3ac',
          200: '#cfcfd6',
          100: '#eeeef1',
        },
        accent: {
          DEFAULT: '#22d3a5',
          dim: '#17a884',
          bright: '#5cf0c8',
          contrast: '#062018',
        },
        danger: '#ef5b5b',
        warn: '#e0a83c',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

export default config;
