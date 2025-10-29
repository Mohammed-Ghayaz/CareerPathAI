-- Create table to store careers to avoid per user
create table if not exists public.career_avoidances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  career_path text not null,
  reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Prevent duplicates per user/career path
create unique index if not exists career_avoidances_user_path_uniq
  on public.career_avoidances(user_id, career_path);

-- Enable RLS
alter table public.career_avoidances enable row level security;

-- Policies: users can manage their own rows
create policy if not exists "Allow select own avoidances"
  on public.career_avoidances for select
  using (auth.uid() = user_id);

create policy if not exists "Allow insert own avoidances"
  on public.career_avoidances for insert
  with check (auth.uid() = user_id);

create policy if not exists "Allow update own avoidances"
  on public.career_avoidances for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Allow delete own avoidances"
  on public.career_avoidances for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_career_avoidances_updated_at on public.career_avoidances;
create trigger set_career_avoidances_updated_at
before update on public.career_avoidances
for each row execute procedure public.set_updated_at();


