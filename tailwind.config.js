/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563EB', // blue-600
          dark: '#1E40AF',
          light: '#3B82F6',
        },
      },
    },
  },
  plugins: [],
}; 