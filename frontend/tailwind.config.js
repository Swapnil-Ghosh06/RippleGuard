/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void:        '#ffffff',
        surface:     '#ffffff',
        surface2:    '#fcfbf9',
        surface3:    '#f4f3ef',
        border:      '#e7e5e0',
        borderGlow:  '#d8d5ce',
        muted:       '#787571',
        dim:         '#44403c',
        text:        '#1c1917',
        accent:      '#1c1917',
        accentHover: '#44403c',
        danger:      '#e11d48',
        safe:        '#059669',
        warn:        '#d97706',
        gold:        '#ca8a04',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans:  ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
        hand:  ['Caveat', 'cursive'],
      },
    },
  },
  plugins: [],
}
