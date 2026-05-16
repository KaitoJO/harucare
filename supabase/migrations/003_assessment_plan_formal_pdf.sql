-- アセスメント項目（計画書と連携）
alter table public.children
  add column if not exists birth_date text default '',
  add column if not exists family_life_intentions text default '',
  add column if not exists standard_support_provision text default '',
  add column if not exists manager_name text default '';

-- 保存済み計画書：AI出力から整形した様式フィールドを保持（再PDF用）
alter table public.saved_programs
  add column if not exists title text,
  add column if not exists mapped_plan jsonb;
