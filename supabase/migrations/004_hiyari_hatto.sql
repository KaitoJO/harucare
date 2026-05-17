-- ヒヤリハット記録
create table public.hiyari_hatto_records (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  child_name text not null default '',
  occurred_at timestamptz not null,
  location text not null default '',
  situation text not null default '',
  analysis_text text not null default '',
  created_at timestamptz not null default now()
);

create index hiyari_hatto_records_user_id_idx on public.hiyari_hatto_records (user_id);
create index hiyari_hatto_records_occurred_at_idx on public.hiyari_hatto_records (occurred_at desc);

alter table public.hiyari_hatto_records enable row level security;

create policy "hiyari_select_own" on public.hiyari_hatto_records for select using (auth.uid() = user_id);
create policy "hiyari_insert_own" on public.hiyari_hatto_records for insert with check (auth.uid() = user_id);
create policy "hiyari_update_own" on public.hiyari_hatto_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hiyari_delete_own" on public.hiyari_hatto_records for delete using (auth.uid() = user_id);
