/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F2547',
          light: '#1E3A6F',
          dark: '#0A1A33',
        },
        accent: {
          DEFAULT: '#F5B800',
          dark: '#D9A300',
        },
        surface: '#F8F9FB',
        border: '#E5E7EB',
        text: {
          primary: '#0F2547',
          secondary: '#4B5563',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
      },
      boxShadow: {
        header: '0 1px 3px rgba(15, 37, 71, 0.06)',
        card: '0 1px 2px rgba(15, 37, 71, 0.04), 0 4px 12px rgba(15, 37, 71, 0.05)',
      },
    },
  },
  plugins: [],
};
