/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#9B59C6',
        'primary-hover': '#8e44ad',
        'primary-deep': '#6c3483',
        flash: '#c084fc',
        'flash-dark': '#8e44ad',
        brand: '#9B59C6',
        'brand-dark': '#8e44ad',
        accent: '#ffa502',
        ink: '#1f2937',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
    },
  },
}
