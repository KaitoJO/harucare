-- 療育の事例出し（職員間共有：同一ワークスペース user_id 単位）
create table public.therapy_case_examples (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  child_name text not null default '',
  child_mode text not null default 'select',
  disability text not null default '',
  age text not null default '',
  support_scene text not null default '',
  challenges text not null default '',
  ai_summary text not null default '',
  ai_effective_methods text not null default '',
  ai_staff_advice text not null default '',
  ai_handover text not null default '',
  author_name text not null default '',
  created_at timestamptz not null default now()
);

create index therapy_case_examples_user_id_idx on public.therapy_case_examples (user_id);
create index therapy_case_examples_created_at_idx on public.therapy_case_examples (created_at desc);
create index therapy_case_examples_disability_idx on public.therapy_case_examples (user_id, disability);

alter table public.therapy_case_examples enable row level security;

create policy "therapy_case_select_own" on public.therapy_case_examples for select using (auth.uid() = user_id);
create policy "therapy_case_insert_own" on public.therapy_case_examples for insert with check (auth.uid() = user_id);
create policy "therapy_case_update_own" on public.therapy_case_examples for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "therapy_case_delete_own" on public.therapy_case_examples for delete using (auth.uid() = user_id);
