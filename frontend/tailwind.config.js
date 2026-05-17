/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#0D9373',
        'primary-dark': '#085041',
        'accent': '#5DCAA5',
        'surface': '#1A1A18',
        'bg': '#0F0F0E',
        'text-muted': '#C2C0B6',
        'admin-dark': '#0C447C',
        'admin-accent': '#85B7EB',
        'warn': '#EF9F27',
        'danger': '#F09595',
      },
    },
  },
  plugins: [],
}
