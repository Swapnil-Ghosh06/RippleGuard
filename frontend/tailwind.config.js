export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    extend: {
      colors: {
        void:             '#191615',
        surface:          '#242220',
        'surface-raised': '#2d2a27',
        border:           '#383430',
        muted:            '#484638',
        dim:              '#6C6B5A',
        text:             '#e8e0d5',
        accent:           '#AD9D87',
        danger:           '#c0614a',
        safe:             '#6b8f6b',
        gold:             '#c4a96b',
      },
    },
  },
  plugins: [],
}
