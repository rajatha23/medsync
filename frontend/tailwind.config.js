/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          dark: '#0B132B',
          navy: '#1C2541',
          card: '#1E293B',
          border: '#334155',
          accent: '#0EA5E9',
          critical: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
          text: '#F8FAFC',
          muted: '#94A3B8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
