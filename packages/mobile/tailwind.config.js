const {
  primary,
  secondary,
  accent,
  success,
  warning,
  danger,
  info,
  gray,
} = require('@volleykit/shared/styles/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './App.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary,
        secondary,
        accent,
        success,
        warning,
        danger,
        info,
        gray,
      },
    },
  },
  plugins: [],
}
