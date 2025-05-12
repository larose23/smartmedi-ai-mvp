-- Create status transitions table
create table if not exists status_transitions (
  id uuid default uuid_generate_v4() primary key,
  from_status text not null,
  to_status text not null,
  success boolean not null,
  timestamp timestamptz not null default now(),
  metadata jsonb
);

-- Create archives table
create table if not exists archives (
  id uuid default uuid_generate_v4() primary key,
  patient_id text not null,
  success boolean not null,
  timestamp timestamptz not null default now(),
  error_message text
);

-- Create indexes for better query performance
create index if not exists idx_status_transitions_timestamp 
  on status_transitions(timestamp);

create index if not exists idx_archives_timestamp 
  on archives(timestamp);

create index if not exists idx_archives_success 
  on archives(success);

-- Create RLS policies
alter table status_transitions enable row level security;
alter table archives enable row level security;

-- Create policy for status_transitions
create policy "Allow read access to status_transitions"
  on status_transitions for select
  using (true);

create policy "Allow insert access to status_transitions"
  on status_transitions for insert
  with check (true);

-- Create policy for archives
create policy "Allow read access to archives"
  on archives for select
  using (true);

create policy "Allow insert access to archives"
  on archives for insert
  with check (true); 