/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#185FA5', light: '#E6F1FB', dark: '#0C447C' },
        success: { DEFAULT: '#1D9E75', light: '#EAF3DE' },
        warning: { DEFAULT: '#BA7517', light: '#FAEEDA' },
        danger:  { DEFAULT: '#A32D2D', light: '#FCEBEB' },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
