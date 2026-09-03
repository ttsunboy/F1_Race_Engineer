/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
      },
      colors: {
        // F1 inspired colors
        'f1-red': '#E10600',
        'f1-dark': '#15151E',
        'f1-darker': '#0D0D14',
        'f1-gray': '#38383F',
        'f1-light': '#F0F0F0',
        'race-green': '#00D656',
        'race-yellow': '#FFD700',
        'race-red': '#FF3838',
      },
      fontFamily: {
        'mono': ['Monaco', 'Courier New', 'monospace'],
        'f1': ['Formula1', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
