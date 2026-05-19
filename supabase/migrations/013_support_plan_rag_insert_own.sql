-- 認証ユーザーが自施設分の RAG チャンクを保存時に upsert できるようにする
create policy "support_plan_rag_insert_own"
  on public.support_plan_rag_chunks
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "support_plan_rag_update_own"
  on public.support_plan_rag_chunks
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant insert, update on public.support_plan_rag_chunks to authenticated;
