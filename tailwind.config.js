/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070a12',
          900: '#0b0f1a',
          850: '#0f1422',
          800: '#141a2b',
          700: '#1c2438',
          600: '#273049',
          500: '#3a4663',
        },
        brand: {
          50: '#eafff5',
          100: '#cfffe8',
          200: '#9fffd1',
          300: '#5fffb0',
          400: '#22f590',
          500: '#06d974',
          600: '#03a85b',
          700: '#048049',
          800: '#0a5f3a',
          900: '#0a4a30',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(6,217,116,0.15), 0 8px 30px -8px rgba(6,217,116,0.25)',
      },
    },
  },
  plugins: [],
}
