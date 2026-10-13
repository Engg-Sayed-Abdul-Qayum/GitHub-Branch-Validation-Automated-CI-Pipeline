// Tailwind CDN configuration — loaded right after the Tailwind script in index.html
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'wa-green': '#00a884',
        'wa-lightbg': '#d1d7db',
        'wa-darkbg': '#0b141a',
        'wa-panel': '#111b21',
        'wa-header': '#202c33',
        'wa-input': '#2a3942',
        'wa-border': '#222d34',
        'wa-hover': '#2a3942',
        'wa-out': '#005c4b',
        'wa-outlight': '#d9fdd3',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
};