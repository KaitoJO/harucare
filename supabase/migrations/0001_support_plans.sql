-- 学習ループ Phase 0: 編集差分の最小キャプチャ
-- 5/15 60人放デイ施設トライアル開始日にあわせて、support_plans への AI 出力 / 編集差分の
-- 蓄積を始めるためのスキーマ。集計・パターン抽出は Phase 1 以降。
--
-- 配置先（親エージェントが移動すること）:
--   /tmp/harucare-fv/supabase/migrations/0001_support_plans.sql
--
-- 参考: /Users/joririka/ai-team/harucare_learning_loop_spec.md  Section 3 / Section 7
--
-- 注意:
--   * 既存スキーマ (001_harucare_workspace.sql) では auth.users.id を user_id として使い
--     RLS は auth.uid() = user_id で分離している。
--     spec では facility_id によるテナント分離が将来的に必要となるため、
--     ここでは facility_id カラムを必須で持たせつつ、当面は user_id (= facility_id) として
--     アプリ側から同値を投入する運用（1 施設 1 アカウント想定の Phase 0）。
--   * RLS は auth.jwt() ->> 'facility_id' を見る spec 案と、現行 auth.uid() ベースの両方
--     をカバーできるよう "facility_id = auth.uid() OR ..." を採用。

create extension if not exists "pgcrypto";

create table if not exists public.support_plans (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null,
    user_id uuid references auth.users(id) on delete set null,
    disability text,
    severity text,
    age text,
    motor_level text,
    communication_level text,
    social_level text,
    input_payload jsonb not null,
    ai_output text not null,
    final_output text,
    edited boolean default false,
    created_at timestamptz not null default now(),
    edited_at timestamptz
);

create index if not exists idx_support_plans_disability on public.support_plans(disability);
create index if not exists idx_support_plans_facility on public.support_plans(facility_id);
create index if not exists idx_support_plans_created on public.support_plans(created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   * Phase 0 では 1 施設 = 1 ユーザー想定で facility_id に auth.uid() を入れて運用
--   * 将来マルチユーザー化したら auth.jwt() ->> 'facility_id' の custom claim へ切替
-- ---------------------------------------------------------------------------
alter table public.support_plans enable row level security;

drop policy if exists support_plans_facility_isolation on public.support_plans;
create policy support_plans_facility_isolation on public.support_plans
    for all
    using (
        facility_id = auth.uid()
        or (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'facility_id')::uuid = facility_id
        or auth.role() = 'service_role'
    )
    with check (
        facility_id = auth.uid()
        or (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'facility_id')::uuid = facility_id
        or auth.role() = 'service_role'
    );
