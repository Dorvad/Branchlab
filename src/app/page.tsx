'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Play, GitBranch, Eye, Globe } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-0 overflow-hidden">
      {/* Background radials */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(900px 500px at 90% -5%, oklch(78% 0.18 285 / 0.10) 0%, transparent 60%),
            radial-gradient(700px 400px at -5% 100%, oklch(82% 0.18 165 / 0.08) 0%, transparent 60%)
          `,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <BranchLabLogo />
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm text-ink-2 hover:text-ink-0 transition-colors">
            Dashboard
          </Link>
          <Link
            href="/play/balcony-at-the-party"
            className="text-sm text-ink-2 hover:text-ink-0 transition-colors"
          >
            Demo
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'var(--neon-mint)',
              color: '#052916',
              boxShadow: 'var(--glow-mint)',
            }}
          >
            Start creating
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div className="space-y-8">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase border"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#8a90a4' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--neon-mint)', boxShadow: 'var(--glow-mint)' }}
            />
            v0.1 · Local prototype
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-[64px] font-semibold leading-[0.95] tracking-[-0.03em]"
          >
            Turn video clips into{' '}
            <span
              className="italic font-medium"
              style={{ color: 'var(--neon-mint)' }}
            >
              branching
            </span>{' '}
            simulations.
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-lg text-ink-2 leading-relaxed max-w-lg"
          >
            A node-based studio for interactive video. Upload clips, wire up choices, preview every path, and publish to a shareable URL.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex items-center gap-4"
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{
                background: 'var(--neon-mint)',
                color: '#052916',
                boxShadow: 'var(--glow-mint)',
              }}
            >
              Open Studio
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/play/balcony-at-the-party"
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all hover:bg-[var(--tint-3)]"
              style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#c9cdda' }}
            >
              <Play size={14} />
              Play the demo
            </Link>
          </motion.div>
        </div>

        {/* Right: mini node map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block"
        >
          <MiniNodeMap />
        </motion.div>
      </main>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <GitBranch size={20} />,
              title: 'Build',
              description: 'Wire video nodes together with choices. Branch paths, set endings, and structure any scenario as a visual graph.',
              accent: 'var(--neon-mint)',
            },
            {
              icon: <Eye size={20} />,
              title: 'Preview',
              description: "Step through your scenario exactly as a player would. Catch dead ends and missing choices before you publish.",
              accent: 'var(--neon-violet)',
            },
            {
              icon: <Globe size={20} />,
              title: 'Publish',
              description: 'Lock your scenario and share a public URL. Players navigate choices independently, no login required.',
              accent: 'var(--neon-amber)',
            },
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              custom={i + 4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="p-6 rounded-2xl border"
              style={{
                background: 'rgba(20,24,34,0.5)',
                borderColor: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${feat.accent}18`, color: feat.accent }}
              >
                {feat.icon}
              </div>
              <h3 className="font-semibold text-ink-0 mb-2">{feat.title}</h3>
              <p className="text-sm text-ink-2 leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

function BranchLabLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <circle cx="10" cy="22" r="5" fill="oklch(82% 0.18 165)" />
        <circle cx="34" cy="10" r="4" fill="oklch(78% 0.18 285)" />
        <circle cx="34" cy="34" r="4" fill="oklch(80% 0.16 60)" />
        <path d="M14 22 L30 12 M14 22 L30 32" stroke="white" strokeOpacity="0.45" strokeWidth="1.5" />
      </svg>
      <span className="font-semibold text-lg tracking-[-0.01em]">BranchLab</span>
    </div>
  )
}

function MiniNodeMap() {
  return (
    <div
      className="rounded-2xl border p-6 relative overflow-hidden"
      style={{
        background: 'rgba(20,24,34,0.7)',
        borderColor: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
      }}
    >
      <p className="font-mono text-[11px] text-ink-3 tracking-widest uppercase mb-4">
        // scenario · the balcony at the party
      </p>
      <svg viewBox="0 0 520 680" className="w-full" style={{ maxHeight: 440 }}>
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>
        {/* edges */}
        <g stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" markerEnd="url(#ah)">
          <path d="M260,84 C260,140 150,150 150,196" />
          <path d="M260,84 C260,140 370,150 370,196" />
          <path d="M150,264 C150,320 80,330 80,376" />
          <path d="M150,264 C150,320 220,330 220,376" />
          <path d="M370,264 C370,320 310,330 310,376" />
          <path d="M370,264 C370,320 440,330 440,376" />
          <path d="M80,444 C80,500 170,530 200,560" />
          <path d="M220,444 C220,500 210,530 210,560" />
          <path d="M310,444 C310,500 260,530 240,560" />
        </g>
        {/* start node */}
        <rect x="200" y="40" width="120" height="44" rx="10" fill="oklch(82% 0.18 165 / 0.15)" stroke="oklch(82% 0.18 165 / 0.7)" strokeWidth="1.5" />
        <text x="260" y="67" textAnchor="middle" fill="oklch(82% 0.18 165)" fontFamily="monospace" fontSize="11" letterSpacing="2">START</text>
        {/* scene nodes */}
        {[
          { x: 90, y: 196, label: 'Walk Over', sub: '2 choices' },
          { x: 310, y: 196, label: 'Hang Back', sub: '2 choices' },
          { x: 30, y: 376, label: 'Bold Joke', sub: '1 choice' },
          { x: 160, y: 376, label: 'The View', sub: '2 choices' },
          { x: 250, y: 376, label: 'Join Group', sub: '1 choice' },
        ].map((n) => (
          <g key={n.label}>
            <rect x={n.x} y={n.y} width="120" height="68" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
            <text x={n.x + 60} y={n.y + 26} textAnchor="middle" fill="#c9cdda" fontSize="12" fontWeight="600">{n.label}</text>
            <text x={n.x + 60} y={n.y + 44} textAnchor="middle" fill="#5c6273" fontFamily="monospace" fontSize="9">{n.sub}</text>
          </g>
        ))}
        {/* ending node */}
        <rect x="160" y="560" width="140" height="44" rx="10" fill="oklch(80% 0.16 60 / 0.14)" stroke="oklch(80% 0.16 60 / 0.6)" strokeWidth="1.5" />
        <text x="230" y="587" textAnchor="middle" fill="oklch(80% 0.16 60)" fontFamily="monospace" fontSize="11" letterSpacing="2">ENDING</text>
        {/* missed ending */}
        <rect x="380" y="376" width="120" height="68" rx="10" fill="oklch(70% 0.18 25 / 0.10)" stroke="oklch(70% 0.18 25 / 0.5)" strokeWidth="1" />
        <text x="440" y="402" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="600">Missed</text>
        <text x="440" y="420" textAnchor="middle" fill="#5c6273" fontFamily="monospace" fontSize="9">ENDING</text>
      </svg>
    </div>
  )
}
