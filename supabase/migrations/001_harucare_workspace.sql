-- HaruCare: 施設アカウント単位のワークスペース（RLS で本人のみアクセス）
-- Supabase SQL Editor に貼り付けて実行するか、CLI で migration として適用してください。

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  age text default '4歳',
  disability text default '自閉スペクトラム症',
  severity text default '中度',
  motor_level text default '中',
  communication_level text default '低',
  social_level text default '低',
  current_issues text default '',
  goals text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

create index children_user_id_idx on public.children (user_id);

-- ---------------------------------------------------------------------------
-- saved_programs
-- ---------------------------------------------------------------------------
create table public.saved_programs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  child_name text not null,
  created_at timestamptz not null,
  created_at_label text,
  program_text text not null
);

create index saved_programs_user_id_idx on public.saved_programs (user_id);
create index saved_programs_child_id_idx on public.saved_programs (child_id);

-- ---------------------------------------------------------------------------
-- support_records（簡易記録）
-- ---------------------------------------------------------------------------
create table public.support_records (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  child_name text not null,
  date text not null,
  created_at timestamptz,
  mood text default '',
  success text default '',
  challenges text default '',
  handover text default ''
);

create index support_records_user_id_idx on public.support_records (user_id);

-- ---------------------------------------------------------------------------
-- saved_support_diaries（AI 支援日誌の保存）
-- ---------------------------------------------------------------------------
create table public.saved_support_diaries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  child_name text not null,
  created_at timestamptz not null,
  created_at_label text,
  program_text text not null,
  source_inputs jsonb
);

create index saved_support_diaries_user_id_idx on public.saved_support_diaries (user_id);

-- ---------------------------------------------------------------------------
-- saved_parent_contacts（AI 保護者連絡帳の保存）
-- ---------------------------------------------------------------------------
create table public.saved_parent_contacts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  child_name text not null,
  created_at timestamptz not null,
  created_at_label text,
  program_text text not null,
  source_inputs jsonb
);

create index saved_parent_contacts_user_id_idx on public.saved_parent_contacts (user_id);

-- ---------------------------------------------------------------------------
-- plan_feedbacks（計画書への評価）
-- child_id はアプリの planFeedbackChildKey（UUID 文字列など）
-- ---------------------------------------------------------------------------
create table public.plan_feedbacks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  child_id text not null,
  program_text text not null,
  rating text not null check (rating in ('up', 'down')),
  created_at timestamptz not null
);

create index plan_feedbacks_user_id_idx on public.plan_feedbacks (user_id);

-- ---------------------------------------------------------------------------
-- program_edit_feedback（編集フィードバック収集）
-- ---------------------------------------------------------------------------
create table public.program_edit_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original text not null,
  edited text not null,
  child_name text not null,
  created_at timestamptz not null default now()
);

create index program_edit_feedback_user_id_idx on public.program_edit_feedback (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.children enable row level security;
alter table public.saved_programs enable row level security;
alter table public.support_records enable row level security;
alter table public.saved_support_diaries enable row level security;
alter table public.saved_parent_contacts enable row level security;
alter table public.plan_feedbacks enable row level security;
alter table public.program_edit_feedback enable row level security;

-- children
create policy "children_select_own" on public.children for select using (auth.uid() = user_id);
create policy "children_insert_own" on public.children for insert with check (auth.uid() = user_id);
create policy "children_update_own" on public.children for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "children_delete_own" on public.children for delete using (auth.uid() = user_id);

-- saved_programs
create policy "saved_programs_select_own" on public.saved_programs for select using (auth.uid() = user_id);
create policy "saved_programs_insert_own" on public.saved_programs for insert with check (auth.uid() = user_id);
create policy "saved_programs_update_own" on public.saved_programs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saved_programs_delete_own" on public.saved_programs for delete using (auth.uid() = user_id);

-- support_records
create policy "support_records_select_own" on public.support_records for select using (auth.uid() = user_id);
create policy "support_records_insert_own" on public.support_records for insert with check (auth.uid() = user_id);
create policy "support_records_update_own" on public.support_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "support_records_delete_own" on public.support_records for delete using (auth.uid() = user_id);

-- saved_support_diaries
create policy "ssd_select_own" on public.saved_support_diaries for select using (auth.uid() = user_id);
create policy "ssd_insert_own" on public.saved_support_diaries for insert with check (auth.uid() = user_id);
create policy "ssd_update_own" on public.saved_support_diaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ssd_delete_own" on public.saved_support_diaries for delete using (auth.uid() = user_id);

-- saved_parent_contacts
create policy "spc_select_own" on public.saved_parent_contacts for select using (auth.uid() = user_id);
create policy "spc_insert_own" on public.saved_parent_contacts for insert with check (auth.uid() = user_id);
create policy "spc_update_own" on public.saved_parent_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spc_delete_own" on public.saved_parent_contacts for delete using (auth.uid() = user_id);

-- plan_feedbacks
create policy "pf_select_own" on public.plan_feedbacks for select using (auth.uid() = user_id);
create policy "pf_insert_own" on public.plan_feedbacks for insert with check (auth.uid() = user_id);
create policy "pf_update_own" on public.plan_feedbacks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pf_delete_own" on public.plan_feedbacks for delete using (auth.uid() = user_id);

-- program_edit_feedback
create policy "pef_select_own" on public.program_edit_feedback for select using (auth.uid() = user_id);
create policy "pef_insert_own" on public.program_edit_feedback for insert with check (auth.uid() = user_id);
create policy "pef_delete_own" on public.program_edit_feedback for delete using (auth.uid() = user_id);
