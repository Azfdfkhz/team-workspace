import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#397FD1',
        'primary-light': '#EAF3FF',
        canvas: '#F7F9FC',
        ink: '#202938',
        muted: '#788596',
        line: '#E7ECF2',
        ok: '#269D70',
        warn: '#D99A36',
        bad: '#D85B5B',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
} satisfies Config;
