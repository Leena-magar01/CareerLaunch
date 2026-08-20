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
          primary: '#66A3BF',
          deep: '#4874A0',
          teal: '#C9DFDC',
          cream: '#F2EFE6',
          blueSoft: '#E9F3FD',
          surface: '#FCFCFC',
          textPrimary: '#243447',
          textSecondary: '#667085',
          border: '#D8E2E6',
          success: '#4F8A68',
          warning: '#C9963E',
          error: '#C95A5A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'modal': '14px',
      },
      boxShadow: {
        'subtle': '0 4px 14px rgba(36, 52, 71, 0.06)',
        'subtle-hover': '0 8px 20px rgba(36, 52, 71, 0.08)',
      }
    },
  },
  plugins: [],
}
