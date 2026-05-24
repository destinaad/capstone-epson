/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#121212',
          surface: '#1a1a1a',
          elevated: '#1e1e1e',
        },
        electric: {
          DEFAULT: '#00a8ff',
          dim: '#0090d6',
        },
        qc: {
          ok: '#10b981',
          ng: '#dc2626',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
