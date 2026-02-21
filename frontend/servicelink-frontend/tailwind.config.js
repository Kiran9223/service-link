/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#9333ea',
          blue: '#2563eb',
          pink: '#db2777',
        },
      },
      backgroundImage: {
        'brand-primary': 'linear-gradient(to right, #9333ea, #2563eb)',
        'brand-secondary': 'linear-gradient(to right, #2563eb, #db2777)',
        'brand-accent': 'linear-gradient(to right, #db2777, #9333ea)',
        'brand-surface': 'linear-gradient(to bottom right, #faf5ff, #eff6ff, #fdf2f8)',
        'brand-diagonal': 'linear-gradient(135deg, #9333ea, #2563eb)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        typingBounce: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed-2': 'float 6s ease-in-out 2s infinite',
        'float-delayed-4': 'float 6s ease-in-out 4s infinite',
        gradientShift: 'gradientShift 15s ease infinite',
        fadeInUp: 'fadeInUp 0.8s ease-out forwards',
        'fadeInUp-delayed': 'fadeInUp 0.8s ease-out 0.2s forwards',
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        slideInRight: 'slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        slideOutRight: 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pulseRing: 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing-1': 'typingBounce 1.4s ease-in-out infinite',
        'typing-2': 'typingBounce 1.4s ease-in-out 0.2s infinite',
        'typing-3': 'typingBounce 1.4s ease-in-out 0.4s infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      boxShadow: {
        'card-hover': '0 20px 40px rgba(0,0,0,0.15)',
        'glass': '0 8px 32px rgba(0,0,0,0.1)',
        'fab': '0 8px 25px rgba(147, 51, 234, 0.4)',
      },
    },
  },
  plugins: [],
}

