-- 個別支援計画書 RAG（pgvector）
create extension if not exists vector;

create table public.support_plan_rag_chunks (
  id text primary key,
  section text not null,
  category text not null default 'individual_support_plan',
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index support_plan_rag_chunks_category_idx on public.support_plan_rag_chunks (category);

create or replace function public.match_support_plan_rag(
  query_embedding vector(1536),
  match_count int default 4,
  filter_category text default 'individual_support_plan'
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
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.support_plan_rag_chunks enable row level security;

create policy "support_plan_rag_select_authenticated"
  on public.support_plan_rag_chunks
  for select
  to authenticated
  using (true);

grant execute on function public.match_support_plan_rag(vector, int, text) to authenticated;
grant execute on function public.match_support_plan_rag(vector, int, text) to service_role;
