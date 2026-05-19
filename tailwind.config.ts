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
        'bg-0': '#08090d',
        'bg-1': '#0c0e14',
        'bg-2': '#11141c',
        'bg-3': '#171b26',
        'ink-0': '#f5f6fa',
        'ink-1': '#c9cdda',
        'ink-2': '#8a90a4',
        'ink-3': '#5c6273',
        'ink-4': '#3a3f4e',
        'neon-mint': '#5ef5a8',
        'neon-violet': '#a78bfa',
        'neon-amber': '#f5c76e',
        'neon-danger': '#f87171',
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
