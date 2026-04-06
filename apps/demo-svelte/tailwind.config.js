/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts,js}'],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px #fbbf24, 0 0 10px #fbbf2440' },
          to:   { boxShadow: '0 0 15px #fbbf24, 0 0 30px #fbbf2460' },
        },
      },
    },
  },
  plugins: [],
};
