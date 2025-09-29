/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { 'bnb-yellow': '#f0b90b', 'terminal-bg': '#141414' },
    },
  },
  plugins: [],
};
