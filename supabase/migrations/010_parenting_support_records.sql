-- 子育てサポート加算の記録
create table public.parenting_support_records (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  child_name text not null default '',
  conducted_at timestamptz not null,
  staff_name text not null default '',
  duration_minutes integer not null default 0,
  billable boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  ai_consultation_record text not null default '',
  ai_child_characteristics text not null default '',
  ai_parent_advice text not null default '',
  ai_home_practice text not null default '',
  created_at timestamptz not null default now()
);

create index parenting_support_records_user_id_idx on public.parenting_support_records (user_id);
create index parenting_support_records_conducted_at_idx on public.parenting_support_records (conducted_at desc);
create index parenting_support_records_child_month_idx on public.parenting_support_records (user_id, child_id, conducted_at desc);

alter table public.parenting_support_records enable row level security;

create policy "parenting_support_select_own" on public.parenting_support_records for select using (auth.uid() = user_id);
create policy "parenting_support_insert_own" on public.parenting_support_records for insert with check (auth.uid() = user_id);
create policy "parenting_support_update_own" on public.parenting_support_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parenting_support_delete_own" on public.parenting_support_records for delete using (auth.uid() = user_id);
