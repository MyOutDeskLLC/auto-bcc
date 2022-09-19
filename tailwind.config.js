/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "index.html",
    "./src/**/*.{vue,js}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8ed',
          100: '#ffeed4',
          200: '#ffdca8',
          300: '#ffc671',
          400: '#ffb74d',
          500: '#fe9e11',
          600: '#ef9107',
          700: '#c67908',
          800: '#9d640f',
          900: '#7e5210',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
