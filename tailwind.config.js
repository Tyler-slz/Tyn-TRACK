/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#F9F8F4',
          card: '#FFFFFF',
          subtle: '#F2F0EB',
          sage: '#E6ECE5',
          'sage-light': '#EFF4ED',
        },
        brand: {
          DEFAULT: '#274E3C', // Deep forest green
          dark: '#1D3B2E',
          light: '#35634E',
          muted: '#8B9B90',
        },
        sage: {
          50: '#F5F8F4',
          100: '#E9EFE8',
          200: '#D5E1D3',
          300: '#B4C9B1',
          400: '#8EAA8A',
          500: '#698B65',
          600: '#4D6B4A',
          700: '#3A5238',
          800: '#274E3C',
          900: '#1B3529',
        },
        charcoal: {
          DEFAULT: '#1B221E',
          muted: '#7A857D',
          light: '#A0ABA3',
        }
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.03), 0 1px 3px -1px rgba(0, 0, 0, 0.02)',
        'soft': '0 6px 20px -4px rgba(39, 78, 60, 0.05), 0 2px 6px -2px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
};

