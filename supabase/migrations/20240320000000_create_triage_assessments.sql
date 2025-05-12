create table if not exists triage_assessments (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references patients(id),
  symptoms text not null,
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  suggested_department text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table triage_assessments enable row level security;

-- Create policies
create policy "Staff can view all triage assessments"
  on triage_assessments for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert triage assessments"
  on triage_assessments for insert
  with check (auth.role() = 'authenticated');

-- Create updated_at trigger
create trigger handle_updated_at before update on triage_assessments
  for each row execute procedure moddatetime (updated_at); 