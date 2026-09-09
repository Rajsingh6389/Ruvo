/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ruvo: {
          yellow: '#F4B400',
          'yellow-light': '#FFC72C',
          'yellow-dark': '#D99B00',
          'yellow-soft': '#FFF2C2',
          bg: '#FAF7F0',
          surface: '#FFFFFF',
          ink: '#171A1F',
          deep: '#202A3A',
          border: '#E7E0D5',
          text: '#171717',
          'text-secondary': '#77736B',
          accent: '#18A957',
          'accent-soft': '#E8F8EE',
          error: '#D94A4A',
          warning: '#E99A16',
          info: '#3478C8',
        },
      },
    },
  },
  plugins: [],
}
