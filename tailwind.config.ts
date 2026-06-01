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
        'bg-0':        'var(--bg-0)',
        'bg-1':        'var(--bg-1)',
        'bg-2':        'var(--bg-2)',
        'bg-3':        'var(--bg-3)',
        'bg-canvas':   'var(--bg-canvas)',
        'bg-thumbnail':'var(--bg-thumbnail)',
        'ink-0':       'var(--fg-0)',
        'ink-1':       'var(--fg-1)',
        'ink-2':       'var(--fg-2)',
        'ink-3':       'var(--fg-3)',
        'ink-4':       'var(--fg-4)',
        'neon-mint':   'var(--neon-mint)',
        'neon-violet': 'var(--neon-violet)',
        'neon-amber':  'var(--neon-amber)',
        'neon-danger': 'var(--neon-danger)',
        'mint-solid':  'var(--mint-solid)',
        'violet-solid':'var(--violet-solid)',
        'amber-solid': 'var(--amber-solid)',
        'on-mint':     'var(--on-mint)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'sm':   'var(--r-sm)',
        'md':   'var(--r-md)',
        'lg':   'var(--r-lg)',
        'xl':   'var(--r-xl)',
        '2xl':  'var(--r-2xl)',
        'full': 'var(--r-full)',
      },
      boxShadow: {
        'card':  'var(--shadow-card)',
        'float': 'var(--shadow-float)',
        'modal': 'var(--shadow-modal)',
        'glow-mint':   'var(--glow-mint)',
        'glow-violet': 'var(--glow-violet)',
        'glow-amber':  'var(--glow-amber)',
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
