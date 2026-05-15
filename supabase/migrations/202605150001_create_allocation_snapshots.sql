create extension if not exists pgcrypto;

create table if not exists public.allocation_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  budget numeric(14, 2) not null,
  allocated numeric(14, 2) not null,
  entry_count integer not null default 0,
  snapshot jsonb not null
);

alter table public.allocation_snapshots enable row level security;

grant all on table public.allocation_snapshots to service_role;
