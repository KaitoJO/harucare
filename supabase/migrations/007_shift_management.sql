-- シフト管理（職員・シフトエントリ）
create table public.shift_staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#2d5a3d',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.shift_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  staff_id uuid not null references public.shift_staff (id) on delete cascade,
  shift_date date not null,
  shift_type text not null default 'work',
  start_time text not null default '',
  end_time text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (staff_id, shift_date)
);

create index shift_staff_user_id_idx on public.shift_staff (user_id);
create index shift_entries_user_id_idx on public.shift_entries (user_id);
create index shift_entries_shift_date_idx on public.shift_entries (shift_date);
create index shift_entries_user_month_idx on public.shift_entries (user_id, shift_date);

alter table public.shift_staff enable row level security;
alter table public.shift_entries enable row level security;

create policy "shift_staff_select_own" on public.shift_staff for select using (auth.uid() = user_id);
create policy "shift_staff_insert_own" on public.shift_staff for insert with check (auth.uid() = user_id);
create policy "shift_staff_update_own" on public.shift_staff for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shift_staff_delete_own" on public.shift_staff for delete using (auth.uid() = user_id);

create policy "shift_entries_select_own" on public.shift_entries for select using (auth.uid() = user_id);
create policy "shift_entries_insert_own" on public.shift_entries for insert with check (auth.uid() = user_id);
create policy "shift_entries_update_own" on public.shift_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shift_entries_delete_own" on public.shift_entries for delete using (auth.uid() = user_id);
