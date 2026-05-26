create table if not exists youtube_assets (
  id uuid primary key default gen_random_uuid(),
  org_id text references organizations(id) on delete cascade,
  youtube_video_id text not null,
  original_url text not null,
  title text,
  thumbnail_url text,
  duration float,
  created_at timestamptz not null default now()
);

create index if not exists youtube_assets_org_id_idx on youtube_assets(org_id);

-- Prevent duplicate YouTube videos per org
create unique index if not exists youtube_assets_unique_per_org
  on youtube_assets(coalesce(org_id, ''), youtube_video_id);
