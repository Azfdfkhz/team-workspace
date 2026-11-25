import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#477967',
        'primary-light': '#edf4f0',
        canvas: '#f8f9f7',
        ink: '#26332d',
        muted: '#7d8982',
        line: '#e8ece8',
        ok: '#4f8a70',
        warn: '#b98545',
        bad: '#bd665c',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgb(25 38 31 / 0.04)',
      },
    },
  },
} satisfies Config;
