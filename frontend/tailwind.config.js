/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:        '#191615',
        surface:     '#201e1b',
        surface2:    '#2a2720',
        border:      '#3a3530',
        muted:       '#6C6B5A',
        dim:         '#AD9D87',
        text:        '#F0EBE3',
        accent:      '#AD9D87',
        accentHover: '#C4B49A',
        danger:      '#C0392B',
        safe:        '#6B8F71',
        warn:        '#C49A3C',
        gold:        '#D4A843',
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
        head:  ['Montserrat', 'sans-serif'],
        sora:  ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
