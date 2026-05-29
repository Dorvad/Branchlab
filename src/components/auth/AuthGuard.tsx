'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isSupabaseMode } from '@/lib/persistence/mode'
import { getUser } from '@/lib/supabase/auth'
import { BranchLabLoader } from '@/components/BranchLabLoader'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  // In local mode, never block — render children immediately.
  const [checking, setChecking] = useState(isSupabaseMode())
  const router = useRouter()

  useEffect(() => {
    if (!isSupabaseMode()) return
    getUser().then(user => {
      if (!user) {
        router.replace('/auth')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) {
    return <BranchLabLoader size={200} />
  }

  return <>{children}</>
}
