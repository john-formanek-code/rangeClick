/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: '#161618',
        primary: '#3b82f6',
        success: '#22c55e',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}
