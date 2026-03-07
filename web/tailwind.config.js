/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0a7ea4',
        background: '#ffffff',
        surface: '#f5f5f5',
        foreground: '#11181C',
        muted: '#687076',
        border: '#E5E7EB',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
