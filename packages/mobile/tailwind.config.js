const { primary, success, warning, danger } = require('@volleykit/shared/styles/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary,
        success,
        warning,
        danger,
      },
    },
  },
  plugins: [],
}
