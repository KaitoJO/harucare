-- 欠席管理・LINE連携・利用日程
create table public.child_service_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  child_name text not null default '',
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time text not null default '',
  end_time text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index child_service_schedules_user_child_idx
  on public.child_service_schedules (user_id, child_id);

create table public.absence_records (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  child_name text not null default '',
  absence_date date not null,
  reason text not null default '',
  source text not null default 'staff',
  line_user_id text not null default '',
  line_message text not null default '',
  ai_parsed jsonb not null default '{}'::jsonb,
  contacted_at timestamptz,
  contacted_by text not null default '',
  billable boolean not null default false,
  billable_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index absence_records_user_id_idx on public.absence_records (user_id);
create index absence_records_absence_date_idx on public.absence_records (absence_date desc);
create index absence_records_child_month_idx
  on public.absence_records (user_id, child_id, absence_date desc);

create table public.line_guardian_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  line_user_id text not null,
  child_id uuid not null references public.children (id) on delete cascade,
  child_name text not null default '',
  guardian_label text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, line_user_id, child_id)
);

create index line_guardian_links_line_user_idx
  on public.line_guardian_links (user_id, line_user_id);

alter table public.child_service_schedules enable row level security;
alter table public.absence_records enable row level security;
alter table public.line_guardian_links enable row level security;

create policy "child_service_schedules_select_own"
  on public.child_service_schedules for select using (auth.uid() = user_id);
create policy "child_service_schedules_insert_own"
  on public.child_service_schedules for insert with check (auth.uid() = user_id);
create policy "child_service_schedules_update_own"
  on public.child_service_schedules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "child_service_schedules_delete_own"
  on public.child_service_schedules for delete using (auth.uid() = user_id);

create policy "absence_records_select_own"
  on public.absence_records for select using (auth.uid() = user_id);
create policy "absence_records_insert_own"
  on public.absence_records for insert with check (auth.uid() = user_id);
create policy "absence_records_update_own"
  on public.absence_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "absence_records_delete_own"
  on public.absence_records for delete using (auth.uid() = user_id);

create policy "line_guardian_links_select_own"
  on public.line_guardian_links for select using (auth.uid() = user_id);
create policy "line_guardian_links_insert_own"
  on public.line_guardian_links for insert with check (auth.uid() = user_id);
create policy "line_guardian_links_update_own"
  on public.line_guardian_links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "line_guardian_links_delete_own"
  on public.line_guardian_links for delete using (auth.uid() = user_id);
