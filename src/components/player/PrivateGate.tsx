'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ScenarioPlayer } from './ScenarioPlayer'
import { PlayGateScreen } from './PlayGateScreen'
import type { ScenarioVersion, ScenarioNode, ScenarioEdge } from '@/types'

interface PrivateGateProps {
  slug: string
  embed: boolean
}

type State =
  | { phase: 'checking' }
  | { phase: 'denied' }
  | { phase: 'allowed'; version: ScenarioVersion }

// Server components can't see the visitor's Supabase session (it lives in the
// browser, not cookies), so for `private` scenarios we let the browser prove
// ownership itself: read the user's own session, then query scenario_versions
// directly. RLS only returns the row when auth.uid() = user_id (migration 013)
// — a non-owner's query resolves to nothing, and no scenario JSON ever leaves
// the server for them.
export function PrivateGate({ slug, embed }: PrivateGateProps) {
  const [state, setState] = useState<State>({ phase: 'checking' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const sb = getSupabaseClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        if (!cancelled) setState({ phase: 'denied' })
        return
      }

      const { data, error } = await sb
        .from('scenario_versions')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled) return
      if (error || !data) {
        setState({ phase: 'denied' })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = data as any
      setState({
        phase: 'allowed',
        version: {
          id: row.id,
          scenarioId: row.scenario_id,
          version: row.version,
          title: row.title,
          nodes: ((row.nodes as ScenarioNode[]) ?? []).map((n) => ({ ...n, choices: n.choices ?? [] })),
          edges: (row.edges as ScenarioEdge[]) ?? [],
          startNodeId: row.start_node_id,
          publishedAt: row.published_at,
          slug: row.slug,
          orientation: row.orientation ?? undefined,
          visibility: row.visibility ?? undefined,
          accessEnabled: row.access_enabled ?? undefined,
        },
      })
    }
    run()
    return () => { cancelled = true }
  }, [slug])

  if (state.phase === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#0a0b10' }}>
        <Loader2 size={18} className="animate-spin" style={{ color: '#5c6273' }} />
      </div>
    )
  }

  if (state.phase === 'denied') {
    return <PlayGateScreen kind="private" />
  }

  return <ScenarioPlayer scenario={state.version} mode="play" embed={embed} />
}
