-- 事故報告書（東京都・放課後等デイサービス向け。payload で様式拡張）
create table public.accident_reports (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  child_name text not null default '',
  occurred_at timestamptz not null,
  report_date date not null,
  facility_name text not null default '',
  author_name text not null default '',
  location text not null default '',
  payload jsonb not null default '{}'::jsonb,
  major_death boolean not null default false,
  major_fracture boolean not null default false,
  major_abuse boolean not null default false,
  ai_cause_analysis text not null default '',
  ai_prevention text not null default '',
  ai_manager_comment text not null default '',
  created_at timestamptz not null default now()
);

create index accident_reports_user_id_idx on public.accident_reports (user_id);
create index accident_reports_occurred_at_idx on public.accident_reports (occurred_at desc);

alter table public.accident_reports enable row level security;

create policy "accident_select_own" on public.accident_reports for select using (auth.uid() = user_id);
create policy "accident_insert_own" on public.accident_reports for insert with check (auth.uid() = user_id);
create policy "accident_update_own" on public.accident_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accident_delete_own" on public.accident_reports for delete using (auth.uid() = user_id);
