/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { 
        'chinese-red': '#E32E30',      // Main Chinese red (replaces bnb-yellow)
        'gold-accent': '#FFD700',      // Gold for special highlights
        'terminal-bg': '#0a0a0a',      // Darker black background
        'card-bg': '#1a1a1a',          // Slightly lighter for cards
      },
    },
  },
  plugins: [],
};