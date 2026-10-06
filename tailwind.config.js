/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#e8edf4',
          100: '#cdd7e6',
          200: '#9bb0cc',
          300: '#6a88b3',
          400: '#395f99',
          500: '#1f3f72',
          600: '#0B1F3A',
          700: '#091a30',
          800: '#071425',
          900: '#050f1b',
        },
        accent: {
          50: '#f8f3e7',
          100: '#f0e6cc',
          200: '#e2ce97',
          300: '#d3b563',
          400: '#cfae56',
          500: '#C9A24A',
          600: '#b18e40',
          700: '#8e7233',
          800: '#6b5626',
          900: '#483b1a',
        },
        sidebar: '#0f172a',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'toast': 'toast 3.5s ease forwards',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        toast: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '10%, 80%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
