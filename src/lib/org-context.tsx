'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getUserOrgs } from '@/lib/supabase/orgs'
import type { OrgWithRole } from '@/types'

const STORAGE_KEY = 'branchlab_active_org_id'

interface OrgContextValue {
  orgs: OrgWithRole[]
  activeOrg: OrgWithRole | null  // null = Personal workspace
  setActiveOrg: (org: OrgWithRole | null) => void
  refetchOrgs: () => Promise<void>
  orgsLoading: boolean
}

const OrgContext = createContext<OrgContextValue>({
  orgs: [],
  activeOrg: null,
  setActiveOrg: () => {},
  refetchOrgs: async () => {},
  orgsLoading: true,
})

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<OrgWithRole[]>([])
  const [activeOrg, setActiveOrgState] = useState<OrgWithRole | null>(null)
  const [orgsLoading, setOrgsLoading] = useState(true)
  const initialized = useRef(false)

  const fetchOrgs = useCallback(async () => {
    try {
      const list = await getUserOrgs()
      setOrgs(list)

      // Restore persisted active org, or clear if no longer a member
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      if (savedId) {
        const found = list.find(o => o.id === savedId)
        setActiveOrgState(found ?? null)
        if (!found && typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Not signed in yet — orgs stay empty
    } finally {
      setOrgsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    void fetchOrgs()
  }, [fetchOrgs])

  const setActiveOrg = useCallback((org: OrgWithRole | null) => {
    setActiveOrgState(org)
    if (typeof window !== 'undefined') {
      if (org) localStorage.setItem(STORAGE_KEY, org.id)
      else localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <OrgContext.Provider value={{ orgs, activeOrg, setActiveOrg, refetchOrgs: fetchOrgs, orgsLoading }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext)
}
