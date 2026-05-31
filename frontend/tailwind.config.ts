import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Charcoal profond : 6 nuances pour gérer la profondeur
        ink: {
          950: '#0a0d12',
          900: '#0e131a',
          850: '#11171f',
          800: '#141b25',
          700: '#1e2733',
          600: '#2a3441',
          500: '#3a4654',
          400: '#566273',
        },
        // Amber accent unique
        accent: {
          DEFAULT: '#f5a623',
          soft: '#f7b955',
          deep: '#c8841a',
          dim: '#7a5210',
        },
        // Palette data-viz multicolore (variations subtiles)
        viz: {
          gold: '#f5a623',
          teal: '#14b8a6',
          coral: '#fb7185',
          violet: '#a78bfa',
          mint: '#34d399',
          sky: '#60a5fa',
          pink: '#f472b6',
          yellow: '#facc15',
          cyan: '#22d3ee',
          orange: '#fb923c',
        },
        // Sémantique (status)
        signal: {
          good: '#34d399',
          warn: '#f59e0b',
          bad: '#fb7185',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        widest: '0.2em',   // override pour la mono uppercase
        ultrawide: '0.32em',
      },
      boxShadow: {
        'inset-accent': 'inset 0 0 0 1px rgba(245, 166, 35, 0.3)',
        'lifted': '0 1px 0 0 rgba(255,255,255,0.03), 0 8px 24px -8px rgba(0,0,0,0.4)',
        'data': '0 1px 0 0 rgba(245,166,35,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
