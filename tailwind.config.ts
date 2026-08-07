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
          850: '#161922', // "secondary"/"muted" bg da referencia
          800: '#1a1a1f',
          700: '#242429',
          600: '#33333a',
          // 500/400 alinhados a --muted-foreground (#6B7280) e --sidebar-foreground (#9BA3B2)
          // da referencia visual — ja eram usados com esse mesmo papel semantico.
          500: '#6b7280',
          400: '#9ba3b2',
          300: '#a3a3ac',
          200: '#cfcfd6',
          100: '#eeeef1',
        },
        sidebar: '#0b0d12',
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
        niche: '0.75rem',
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        niche: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
