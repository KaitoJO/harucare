-- 支援日誌を日付でグループ化するための列（既存行はアプリ側で created_at から補完可能）
alter table public.saved_support_diaries
  add column if not exists entry_date text;

comment on column public.saved_support_diaries.entry_date is '記録日 YYYY-MM-DD（一覧の日付グループ用）';
