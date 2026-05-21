/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'primary':      '#00E676',
        'primary-dim':  '#00C853',
        'primary-dark': '#003D1A',
        'surface':      '#111C12',
        'surface-2':    '#192E1A',
        'bg':           '#09120A',
        'text-base':    '#F1FFF4',
        'text-muted':   '#7DAE8A',
        'text-dim':     '#3D6644',
        'border-soft':  'rgba(0,230,118,0.10)',
        'border-mid':   'rgba(0,230,118,0.25)',
        'admin-dark':   '#1E3A5F',
        'admin-accent': '#42A5F5',
        'warn':         '#FFB74D',
        'danger':       '#EF5350',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans:    ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(0,230,118,0.15)',
        'glow':    '0 0 24px rgba(0,230,118,0.20)',
        'glow-lg': '0 0 40px rgba(0,230,118,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.4s ease both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        shimmer:      'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
