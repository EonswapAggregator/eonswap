/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Uniswap-inspired palette
        uni: {
          pink: '#FF007A',
          'pink-light': '#FF68B5',
          'pink-dark': '#A30051',
          purple: '#5D17EB',
          bg: '#131313',
          surface: '#191919',
          'surface-2': '#1B1B1B',
          'surface-3': '#232323',
          border: '#2D2D2D',
        },
        // Legacy Eon colors (backwards compat)
        eon: {
          bg: '#131313',
          surface: 'rgba(25, 25, 25, 0.95)',
          blue: '#FF007A',
          cyan: '#FF68B5',
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
        glow: '0 0 24px rgba(255, 0, 122, 0.25)',
        'glow-sm': '0 0 12px rgba(255, 0, 122, 0.2)',
        'uni-card': '0px 4px 12px rgba(0, 0, 0, 0.32), 0px 0px 1px rgba(0, 0, 0, 0.1)',
      },
      backdropBlur: {
        glass: '20px',
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
