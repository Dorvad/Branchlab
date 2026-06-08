-- recordTokenUse() previously did a read-modify-write (`use_count: tokenRow.use_count + 1`)
-- from the gate resolver, so concurrent plays via the same share link could
-- lose increments (last writer wins). Replace with an atomic, single-statement
-- increment performed entirely in Postgres.
--
-- After applying, regenerate src/lib/supabase/types.ts (or add this function
-- to its `Functions` map) so `sb.rpc('increment_share_token_use', ...)` is
-- fully typed — gate.ts currently casts around the missing entry.

create or replace function public.increment_share_token_use(p_token_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.scenario_share_tokens
  set use_count = use_count + 1,
      last_used_at = now()
  where id = p_token_id;
$$;

grant execute on function public.increment_share_token_use(uuid) to anon, authenticated, service_role;
