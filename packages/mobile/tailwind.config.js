/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdffe4',
          100: '#f9ffc4',
          200: '#f1ff90',
          300: '#e2ff50',
          400: '#d7ff37',
          500: '#b2e600',
          600: '#8ab800',
          700: '#688b00',
          800: '#526d07',
          900: '#455c0b',
        },
      },
    },
  },
  plugins: [],
}
