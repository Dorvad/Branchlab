import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-0': 'var(--bg-0)',
        'bg-1': 'var(--bg-1)',
        'bg-2': 'var(--bg-2)',
        'bg-3': 'var(--bg-3)',
        'ink-0': 'var(--fg-0)',
        'ink-1': 'var(--fg-1)',
        'ink-2': 'var(--fg-2)',
        'ink-3': 'var(--fg-3)',
        'ink-4': 'var(--fg-4)',
        'neon-mint': 'oklch(82% 0.18 165)',
        'neon-violet': 'oklch(78% 0.18 285)',
        'neon-amber': 'oklch(80% 0.16 60)',
        'neon-danger': 'oklch(70% 0.18 25)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      animation: {
        'progress': 'progress linear forwards',
      },
      keyframes: {
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}

export default config
