'use client'

import { getSupabaseClient } from './client'
import { slugify } from '@/lib/local-store'
import type { Organization, OrgWithRole, OrgMember, OrgInvite, OrgRole } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbError(err: any): Error {
  const msg = err?.message ?? err?.details ?? err?.hint ?? 'Database error'
  return new Error(msg)
}

async function requireUserId(): Promise<string> {
  const sb = getSupabaseClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToOrg(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdBy: row.created_by ?? '',
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMember(row: any): OrgMember {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    role: row.role as OrgRole,
    joinedAt: row.joined_at,
    email: row.email ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInvite(row: any): OrgInvite {
  return {
    id: row.id,
    orgId: row.org_id,
    email: row.email,
    role: row.role as OrgRole,
    token: row.token,
    invitedBy: row.invited_by ?? '',
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
    createdAt: row.created_at,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Returns all orgs the current user belongs to, with their role and member count. */
export async function getUserOrgs(): Promise<OrgWithRole[]> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()

  const { data, error } = await sb
    .from('organization_members')
    .select(`
      role,
      organizations (
        id, name, slug, created_by, avatar_url, created_at, updated_at
      )
    `)
    .eq('user_id', userId)

  if (error) throw dbError(error)

  const rows = (data ?? []) as Array<{
    role: OrgRole
    organizations: Record<string, unknown> | null
  }>

  // Fetch member counts in a separate query (Supabase doesn't support COUNT in nested select easily)
  const orgIds = rows.map(r => (r.organizations as Record<string, unknown>)?.id as string).filter(Boolean)
  let countMap: Record<string, number> = {}
  if (orgIds.length > 0) {
    const { data: counts } = await sb
      .from('organization_members')
      .select('org_id')
      .in('org_id', orgIds)
    if (counts) {
      for (const c of counts as Array<{ org_id: string }>) {
        countMap[c.org_id] = (countMap[c.org_id] ?? 0) + 1
      }
    }
  }

  return rows
    .filter(r => r.organizations)
    .map(r => ({
      ...rowToOrg(r.organizations as Record<string, unknown>),
      role: r.role,
      memberCount: countMap[(r.organizations as Record<string, unknown>).id as string] ?? 1,
    }))
}

/**
 * Creates a new organization and adds the creator as owner.
 * Derives a unique slug from the name.
 */
export async function createOrg(name: string): Promise<OrgWithRole> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()

  const baseSlug = slugify(name) || 'workspace'
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

  const { data: orgData, error: orgError } = await sb
    .from('organizations')
    .insert({ name, slug, created_by: userId })
    .select()
    .single()

  if (orgError) throw dbError(orgError)

  const { error: memberError } = await sb
    .from('organization_members')
    .insert({ org_id: orgData.id, user_id: userId, role: 'owner' })

  if (memberError) throw dbError(memberError)

  return { ...rowToOrg(orgData), role: 'owner', memberCount: 1 }
}

/** Updates an org's display name (admin+). */
export async function updateOrgName(orgId: string, name: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb
    .from('organizations')
    .update({ name })
    .eq('id', orgId)
  if (error) throw dbError(error)
}

/**
 * Returns all members of an org with their emails.
 * Uses a Supabase RPC or falls back to member rows only (email requires admin access to auth.users).
 */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('organization_members')
    .select('*')
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true })

  if (error) throw dbError(error)
  return (data ?? []).map(rowToMember)
}

/** Returns pending (not yet accepted, not expired) invites for an org. */
export async function getOrgInvites(orgId: string): Promise<OrgInvite[]> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('organization_invites')
    .select('*')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw dbError(error)
  return (data ?? []).map(rowToInvite)
}

/**
 * Creates an invite for the given email + role.
 * Returns the full accept URL to share with the invitee.
 */
export async function inviteMember(orgId: string, email: string, role: OrgRole): Promise<string> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()

  // Upsert: if the same email was already invited, refresh the invite
  const { data, error } = await sb
    .from('organization_invites')
    .upsert(
      { org_id: orgId, email, role, invited_by: userId, accepted_at: null },
      { onConflict: 'org_id,email' },
    )
    .select('token')
    .single()

  if (error) throw dbError(error)
  const token = (data as { token: string }).token
  return `${appUrl()}/accept-invite/${token}`
}

/**
 * Accepts an invite by token. Adds the current user to the org.
 * Throws if the invite is expired, already accepted, or not found.
 */
export async function acceptInvite(token: string): Promise<{ orgId: string; orgName: string }> {
  const userId = await requireUserId()
  const sb = getSupabaseClient()

  // Fetch invite
  const { data: invite, error: inviteError } = await sb
    .from('organization_invites')
    .select('*, organizations(name)')
    .eq('token', token)
    .single()

  if (inviteError || !invite) throw new Error('Invite not found or already used.')

  const row = invite as Record<string, unknown>
  if (row.accepted_at) throw new Error('This invite has already been accepted.')
  if (new Date(row.expires_at as string) < new Date()) throw new Error('This invite has expired.')

  // Add member (upsert in case they're already a member — update their role)
  const { error: memberError } = await sb
    .from('organization_members')
    .upsert(
      { org_id: row.org_id as string, user_id: userId, role: row.role as string },
      { onConflict: 'org_id,user_id' },
    )

  if (memberError) throw dbError(memberError)

  // Mark invite as accepted
  await sb
    .from('organization_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  const org = row.organizations as Record<string, unknown>
  return { orgId: row.org_id as string, orgName: org?.name as string ?? '' }
}

/** Looks up a pending invite by token without requiring auth (for the accept page preview). */
export async function getInviteByToken(token: string): Promise<(OrgInvite & { orgName: string }) | null> {
  const sb = getSupabaseClient()
  const { data, error } = await sb
    .from('organization_invites')
    .select('*, organizations(name)')
    .eq('token', token)
    .single()

  if (error || !data) return null
  const row = data as Record<string, unknown>
  const org = row.organizations as Record<string, unknown>
  return {
    ...rowToInvite(row),
    orgName: org?.name as string ?? '',
  }
}

/** Changes a member's role. Caller must be admin+. */
export async function updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb
    .from('organization_members')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw dbError(error)
}

/** Removes a member from an org. Caller must be admin+ (or the member removing themselves). */
export async function removeMember(orgId: string, userId: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw dbError(error)
}

/** Revokes a pending invite. */
export async function revokeInvite(inviteId: string): Promise<void> {
  const sb = getSupabaseClient()
  const { error } = await sb
    .from('organization_invites')
    .delete()
    .eq('id', inviteId)
  if (error) throw dbError(error)
}
