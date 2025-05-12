create table if not exists resource_predictions (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  predicted_patients integer not null,
  recommended_doctors integer not null,
  recommended_nurses integer not null,
  recommended_support integer not null,
  peak_hours jsonb not null,
  required_beds integer not null,
  required_equipment jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table resource_predictions enable row level security;

-- Create policies
create policy "Staff can view all resource predictions"
  on resource_predictions for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert resource predictions"
  on resource_predictions for insert
  with check (auth.role() = 'authenticated');

-- Create updated_at trigger
create trigger handle_updated_at before update on resource_predictions
  for each row execute procedure moddatetime (updated_at); 