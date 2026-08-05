import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#080a0f',
          900: '#0f1117',
          800: '#1a1a1f',
          700: '#242429',
          600: '#33333a',
          500: '#54545c',
          400: '#7a7a84',
          300: '#a3a3ac',
          200: '#cfcfd6',
          100: '#eeeef1',
        },
        // Definido via CSS custom properties (default = verde da marca) para
        // que o painel e a agenda publica possam trocar o accent por nicho
        // em runtime (ver src/lib/niche-theme.ts), sem precisar de build por tenant.
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          dim: 'rgb(var(--accent-dim-rgb) / <alpha-value>)',
          bright: 'rgb(var(--accent-bright-rgb) / <alpha-value>)',
          contrast: 'rgb(var(--accent-contrast-rgb) / <alpha-value>)',
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
