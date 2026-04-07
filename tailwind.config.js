/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        eon: {
          bg: '#0a0b1e',
          surface: 'rgba(20, 22, 45, 0.72)',
          blue: '#00d2ff',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 210, 255, 0.25)',
        'glow-sm': '0 0 12px rgba(0, 210, 255, 0.2)',
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
