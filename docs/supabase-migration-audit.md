# Supabase Migration Audit

Status as of 2026-05-28. App is in a **partially-migrated** state:
scenarios and clips already use Supabase; a few player/preview paths and
several small utilities still read from localStorage.

---

## 1. Current Scenario Persistence Flow

### Active path (Supabase-backed)

| Operation | Entry point | Supabase table |
|---|---|---|
| List all scenarios | `scenario-store.getAllScenarios()` | `scenarios` |
| Load one scenario | `scenario-store.getScenario(id)` | `scenarios` |
| Create / update | `scenario-store.saveScenario()` | `scenarios` (upsert) |
| Delete | `scenario-store.deleteScenario(id)` | `scenarios` |
| Duplicate | `local-store.duplicateScenario()` then `saveScenario()` | `scenarios` |
| Publish | `scenario-store.publishScenario()` | `scenarios` + `scenario_versions` |
| Check slug | `scenario-store.isSlugAvailable()` | `scenario_versions` |

All callers go through `src/lib/scenario-store.ts`. The dashboard page,
editor shell, publish/republish modals, and `PreviewClient` all import
from this file.

### Residual localStorage path (still active)

| File | What it reads | Why still needed |
|---|---|---|
| `src/components/player/PlayPageClient.tsx` | `getPublishedBySlug(slug)` from `local-store` | Public `/play/[slug]` page uses synchronous `useState` init; has a server-provided `fallback` but prefers localStorage so newly published scenarios appear without a Next.js rebuild |
| `src/components/player/PreviewShell.tsx` | `getLocalScenario(id)` from `local-store` | `/preview/[id]` tries localStorage first, falls back to server prop `initialScenario` |
| `src/lib/scenario-store.ts` | re-exports `createScenario`, `createFromTemplate`, `duplicateScenario`, `slugify` from `local-store` | These are pure creation utilities with no I/O; they only generate in-memory objects |

### Other localStorage consumers (not scenario data)

| File | Key | Purpose |
|---|---|---|
| `src/lib/org-context.tsx` | `branchlab:active-org-id` | Remembers which org was last selected |
| `src/lib/analytics/track.ts` | `branchlab:visitor-id` | Stable anonymous analytics ID |
| `src/app/layout.tsx` | `branchlab-theme` | Theme preference (dark/light) |
| `src/components/editor/AssetLibrary.tsx` | `branchlab:asset-folders` | Client-side folder assignments for assets |
| `src/lib/checkpoint-storage.ts` | `branchlab:scenario:{id}:latestCheckpoint` | sessionStorage — player checkpoint per session |

---

## 2. Current Clip / Video Flow

### Active path (Supabase-backed)

All clip uploads go through `src/lib/supabase/clips.ts`:

1. **File validation** — MIME type + size checks.
2. **Duration probe** — `<video>` element reads metadata in-browser.
3. **Compression** — FFmpeg WASM reencodes to H.264, max 720 px wide, 20 MB target. Triggered for files ≥ 5 MB.
4. **Storage upload** — XHR to `supabase.storage` bucket `Assets` with progress tracking.
5. **Thumbnail generation** — Canvas frame capture, uploaded as JPEG alongside video.
6. **DB insert** — Row written to `clips` table with `url`, `thumbnail_url`, `storage_path`, `duration`, `size`.

Returned `Clip` objects carry a permanent HTTPS `url` (not an objectURL). The player and node cards use this URL directly — no session dependency.

### Orphaned local module

`src/lib/clip-store.ts` — module-level `Map<string, VideoClip>` using browser objectURLs. **No component currently imports it.** It is dead code from the pre-Supabase prototype. Safe to delete once confirmed.

`VideoClip` type in `src/types/index.ts` (lines 50–58) has an `objectUrl` field. This type is only referenced inside `clip-store.ts`. Safe to remove with it.

---

## 3. Risk Areas

| Risk | Location | Notes |
|---|---|---|
| `PlayPageClient` reads localStorage synchronously | `PlayPageClient.tsx:16–21` | If Supabase `getPublishedBySlug` is added server-side and passed as `fallback`, the localStorage read becomes a no-op and can be removed |
| `PreviewShell` reads localStorage synchronously | `PreviewShell.tsx:15–19` | Same pattern; `initialScenario` is already passed from the server route; localStorage fallback can be dropped |
| Asset folder assignments are localStorage-only | `AssetLibrary.tsx` + `branchlab:asset-folders` | These will be lost on new devices/browsers. Low priority for MVP but needs a `clips` table column (`folder_name`) before multi-device matters |
| Org selection is localStorage-only | `org-context.tsx` | Acceptable for now; becomes a problem if a user works across browsers |
| `local-store` still exported and re-imported | `scenario-store.ts:15` | The pure utility re-exports (`createScenario`, etc.) are safe, but the file is a potential confusion vector for future edits accidentally using the synchronous localStorage functions |

---

## 4. Proposed Migration Sequence

### Phase 1 — Remove dead local clip code *(no user impact)*
- Delete `src/lib/clip-store.ts`
- Delete `VideoClip` interface from `src/types/index.ts`
- Confirm nothing else imports either

### Phase 2 — Fix PlayPageClient and PreviewShell *(low risk)*
- `PlayPageClient`: replace `getPublishedBySlug` from `local-store` with the `fallback` prop alone. The server route already fetches from Supabase and passes it down. Remove the `local-store` import.
- `PreviewShell`: replace `getLocalScenario` with `getScenario` from `scenario-store` (async). Since `initialScenario` is already passed as a prop from the server, the simplest fix is to just use that prop directly and remove the localStorage read.
- After these two changes, `PlayPageClient` and `PreviewShell` no longer import from `local-store`.

### Phase 3 — Audit remaining local-store imports *(low risk)*
- Verify nothing outside `scenario-store.ts` still imports from `local-store`.
- The re-exported utilities (`slugify`, `createScenario`, etc.) can stay in `local-store` as pure helpers, or be moved to a `src/lib/scenario-utils.ts` file to make the boundary clearer.
- `local-store`'s actual localStorage functions (`readDrafts`, `writeDrafts`, `readPublished`, `writePublished`) become dead code and can be deleted.

### Phase 4 — Persist asset folders in Supabase *(schema change required)*
- Add `folder_name TEXT` column to `clips` table (migration).
- Update `AssetLibrary` to call a `moveClipToFolder(id, name)` function in `supabase/clips.ts` instead of writing to localStorage.
- `branchlab:asset-folders` localStorage key can then be removed.

### Phase 5 — (Optional) Org selection *(low priority)*
- The `branchlab:active-org-id` localStorage key could be replaced with a user preference stored in a `user_preferences` Supabase table row. Not needed until multi-device collaboration is a priority.

---

## 5. Testing Checklist

### Phase 1 (clip-store removal)
- [ ] `npm run build` — no TypeScript errors
- [ ] Upload a video via Asset Library — clip appears with thumbnail
- [ ] Attach clip to a node — player shows video

### Phase 2 (PlayPageClient / PreviewShell)
- [ ] `/play/[slug]` loads a published scenario without localStorage data present (incognito or cleared storage)
- [ ] `/preview/[id]` shows the correct scenario without localStorage data present
- [ ] Publish a scenario, open `/play/[slug]` — correct version shown (not stale)
- [ ] Republish with changes — `/play/[slug]` reflects new version

### Phase 3 (local-store cleanup)
- [ ] `npm run build` — no TypeScript errors
- [ ] Create a new blank scenario from dashboard — saves to Supabase
- [ ] Create from template — saves to Supabase
- [ ] Duplicate scenario — copy appears in dashboard
- [ ] Slugify used in PublishModal — slug preview formats correctly

### Phase 4 (folder persistence)
- [ ] Move a clip to a folder — reloading the editor still shows the folder assignment
- [ ] Different browser/incognito — folder assignments visible (proves it's in DB not localStorage)
- [ ] Delete a clip — folder entry removed from `clips` table

---

## Key Files Reference

```
src/lib/scenario-store.ts     — Supabase CRUD for scenarios (active)
src/lib/local-store/index.ts  — localStorage CRUD + pure utilities (partially active)
src/lib/clip-store.ts         — In-memory + objectURL clips (DEAD CODE)
src/lib/supabase/clips.ts     — Supabase upload/delete for clips (active)
src/lib/checkpoint-storage.ts — sessionStorage for player checkpoints (intentional; ephemeral)
src/lib/org-context.tsx       — localStorage for active org (acceptable for MVP)
src/components/player/PlayPageClient.tsx   — reads localStorage (Phase 2 target)
src/components/player/PreviewShell.tsx     — reads localStorage (Phase 2 target)
src/components/editor/AssetLibrary.tsx     — asset folder map in localStorage (Phase 4 target)
```
