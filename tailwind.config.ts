import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./frontend/src/**/*.{ts,tsx,js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0A2540',
        'brand-primary': '#0066FF',
        'brand-accent': '#00D26A',
        surface: '#F8FAFC',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(0, 210, 106, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(0, 210, 106, 0)',
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
