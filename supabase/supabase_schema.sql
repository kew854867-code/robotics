-- Supabase PostgreSQL schema for the YouTube robot-content intelligence workflow.
-- Run in Supabase SQL Editor. The current n8n Supabase node can auto-map into content_items.

create extension if not exists pgcrypto;

create table if not exists public.content_items (
  content_id text primary key,
  platform text not null default 'YouTube',
  source text not null,
  source_url text,
  video_id text,
  title text not null,
  description text,
  author text,
  channel_id text,
  published_at timestamptz,
  thumbnail text,
  language text,
  content_type text,
  robotics_topic text,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  favorite_count bigint not null default 0,
  engagement jsonb not null default '{}'::jsonb,
  viral_score numeric(5,2),
  score_source text,
  ai_summary text,
  status text not null default 'discovered',
  is_robotics boolean,
  robotics_relevance numeric(5,2),
  category text,
  summary_zh text,
  summary_en text,
  key_facts jsonb not null default '[]'::jsonb,
  why_it_may_work text,
  hook text,
  target_audience jsonb not null default '[]'::jsonb,
  analyzed_content_type text,
  analyzed_language text,
  recommended_route text,
  priority text,
  keep boolean,
  analysis_confidence numeric(4,3),
  risk_flags jsonb not null default '[]'::jsonb,
  uncertainty jsonb not null default '[]'::jsonb,
  analysis_status text,
  final_route text,
  next_module text,
  raw_search_item jsonb not null default '{}'::jsonb,
  raw_statistics_item jsonb not null default '{}'::jsonb,
  raw_deepseek_item jsonb not null default '{}'::jsonb,
  collected_at timestamptz,
  analyzed_at timestamptz,
  route_decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_items_video_id_uq on public.content_items(video_id) where video_id is not null;
create index if not exists content_items_priority_idx on public.content_items(priority);
create index if not exists content_items_route_idx on public.content_items(final_route);
create index if not exists content_items_status_idx on public.content_items(status);
create index if not exists content_items_published_idx on public.content_items(published_at desc);
create index if not exists content_items_viral_idx on public.content_items(viral_score desc);

create table if not exists public.content_events (
  id uuid primary key default gen_random_uuid(),
  content_id text not null references public.content_items(content_id) on delete cascade,
  event_type text not null,
  event_status text,
  actor text default 'n8n',
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists content_events_content_idx on public.content_events(content_id, occurred_at desc);

create table if not exists public.content_production_tasks (
  task_id uuid primary key default gen_random_uuid(),
  content_id text not null references public.content_items(content_id) on delete cascade,
  route text not null,
  task_type text not null,
  status text not null default 'queued',
  owner text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists production_tasks_content_idx on public.content_production_tasks(content_id);
create index if not exists production_tasks_status_idx on public.content_production_tasks(status);

create table if not exists public.content_publications (
  publication_id uuid primary key default gen_random_uuid(),
  content_id text not null references public.content_items(content_id) on delete cascade,
  platform text not null,
  platform_post_id text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  post_url text,
  caption text,
  asset_url text,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists publications_content_idx on public.content_publications(content_id);
create index if not exists publications_status_idx on public.content_publications(status);

create table if not exists public.content_metrics (
  metric_id uuid primary key default gen_random_uuid(),
  content_id text not null references public.content_items(content_id) on delete cascade,
  publication_id uuid references public.content_publications(publication_id) on delete set null,
  platform text not null,
  measured_at timestamptz not null default now(),
  impressions bigint,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  watch_time_seconds numeric,
  click_through_rate numeric(8,5),
  conversion_count bigint,
  raw_payload jsonb not null default '{}'::jsonb
);
create index if not exists content_metrics_content_idx on public.content_metrics(content_id, measured_at desc);

alter table public.content_items enable row level security;
alter table public.content_events enable row level security;
alter table public.content_production_tasks enable row level security;
alter table public.content_publications enable row level security;
alter table public.content_metrics enable row level security;

-- Add project-specific RLS policies before exposing these tables to a frontend.
-- The n8n Supabase credential should use a server-side service role, not a browser key.
