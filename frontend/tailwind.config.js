/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        meesho: {
          pink: '#F43397',
          dark: '#1a1a2e',
          navy: '#16213e',
          card: '#0f3460',
          accent: '#e94560',
        },
      },
    },
  },
  plugins: [],
};
