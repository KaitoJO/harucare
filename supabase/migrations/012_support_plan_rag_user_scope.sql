-- RAG チャンクに施設（ユーザー）スコープとソース追跡を追加
alter table public.support_plan_rag_chunks
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists source_type text,
  add column if not exists source_id text;

create index if not exists support_plan_rag_chunks_user_id_idx
  on public.support_plan_rag_chunks (user_id);

create index if not exists support_plan_rag_chunks_source_idx
  on public.support_plan_rag_chunks (user_id, source_type, source_id);

drop policy if exists "support_plan_rag_select_authenticated" on public.support_plan_rag_chunks;

create policy "support_plan_rag_select_own_or_global"
  on public.support_plan_rag_chunks
  for select
  to authenticated
  using (user_id is null or user_id = auth.uid());

drop function if exists public.match_support_plan_rag(vector, int, text);

create or replace function public.match_support_plan_rag(
  query_embedding vector(1536),
  match_count int default 4,
  filter_category text default null,
  filter_user_id uuid default null
)
returns table (
  id text,
  section text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.section,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.support_plan_rag_chunks c
  where c.embedding is not null
    and (filter_category is null or c.category = filter_category)
    and (
      filter_user_id is null
      or c.user_id is null
      or c.user_id = filter_user_id
    )
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_support_plan_rag(vector, int, text, uuid) to authenticated;
grant execute on function public.match_support_plan_rag(vector, int, text, uuid) to service_role;
