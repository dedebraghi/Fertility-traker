/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nature: {
          50: '#fbf9f6',
          100: '#f5f0eb',
          200: '#ebdcd0',
          300: '#dcbeab',
          400: '#ca9b82',
          500: '#bb7e62',
          600: '#ad6a50',
          700: '#90543f',
          800: '#754536',
          900: '#5f3a2e',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e5ece5',
          200: '#ccdccd',
          300: '#a7c3a9',
          400: '#7ea481',
          500: '#5f8763',
          600: '#4a6c4e',
          700: '#3c563f',
          800: '#324535',
          900: '#2b3a2e',
        },
        blush: {
          50: '#fdf7f7',
          100: '#fceeed',
          200: '#f9dedd',
          300: '#f3c1bf',
          400: '#e99a97',
          500: '#db7370',
          600: '#c55350',
          700: '#a6413f',
          800: '#893937',
          900: '#733332',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(187, 126, 98, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 12px 0 rgba(0, 0, 0, 0.04), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
