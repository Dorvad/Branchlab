'use client'
import { motion } from 'framer-motion'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
  sectionKey: string
}

export function SettingsSection({ title, subtitle, children, sectionKey }: Props) {
  return (
    <motion.section
      key={sectionKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-6">
        <h2 className="text-base font-semibold" style={{ color: 'var(--fg-0)' }}>{title}</h2>
        {subtitle && (
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--fg-4)' }}>{subtitle}</p>
        )}
      </div>
      <div className="space-y-0">{children}</div>
    </motion.section>
  )
}
