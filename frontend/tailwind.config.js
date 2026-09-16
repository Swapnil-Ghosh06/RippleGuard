/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:        '#09090B',
        surface:     '#111115',
        surface2:    '#17171E',
        surface3:    '#1F1F27',
        border:      '#262630',
        borderGlow:  '#383846',
        muted:       '#71717A',
        dim:         '#A1A1AA',
        text:        '#F4F4F5',
        accent:      '#38BDF8',
        accentHover: '#7DD3FC',
        danger:      '#EF4444',
        safe:        '#10B981',
        warn:        '#F59E0B',
        gold:        '#FCD34D',
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
