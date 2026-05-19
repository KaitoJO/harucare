-- 専門的支援計画書（個別支援計画書 saved_programs と同構成）
create table public.saved_specialized_plans (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  child_name text not null,
  created_at timestamptz not null,
  created_at_label text,
  program_text text not null,
  title text,
  mapped_plan jsonb
);

create index saved_specialized_plans_user_id_idx on public.saved_specialized_plans (user_id);
create index saved_specialized_plans_child_id_idx on public.saved_specialized_plans (child_id);

alter table public.saved_specialized_plans enable row level security;

create policy "ssp_select_own" on public.saved_specialized_plans for select using (auth.uid() = user_id);
create policy "ssp_insert_own" on public.saved_specialized_plans for insert with check (auth.uid() = user_id);
create policy "ssp_update_own" on public.saved_specialized_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ssp_delete_own" on public.saved_specialized_plans for delete using (auth.uid() = user_id);
