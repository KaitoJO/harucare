/**
 * 保存データ → RAG チャンク変換・匿名化・Vector DB 投入
 */

const MIN_CHUNK_LEN = 40;

export function anonymizeForRag(text, names = []) {
  let out = String(text ?? "");
  const uniqueNames = [...new Set(names.map((n) => String(n ?? "").trim()).filter((n) => n.length >= 2))];
  for (const name of uniqueNames.sort((a, b) => b.length - a.length)) {
    out = out.split(name).join("（児童）");
  }
  out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "（連絡先）");
  out = out.replace(/\b0\d{1,4}-?\d{1,4}-?\d{3,4}\b/g, "（電話番号）");
  return out.trim();
}

function ragChunkId(userId, sourceType, sourceId, sectionKey) {
  const safeSection = String(sectionKey ?? "body")
    .replace(/[^a-zA-Z0-9\u3040-\u30ff\u4e00-\u9fff_-]/g, "_")
    .slice(0, 48);
  return `rag:${userId}:${sourceType}:${sourceId}:${safeSection}`;
}

function pushChunk(list, userId, sourceType, sourceId, section, category, content, names, extraMeta = {}) {
  const body = anonymizeForRag(content, names);
  if (body.length < MIN_CHUNK_LEN) return;
  list.push({
    id: ragChunkId(userId, sourceType, sourceId, section),
    section,
    category,
    content: body,
    sourceType,
    sourceId,
    metadata: {
      source: "auto_ingest",
      anonymized: true,
      ...extraMeta,
    },
  });
}

function extractH2Sections(markdown) {
  const sections = {};
  const md = String(markdown ?? "");
  const re = /^##\s+([^\r\n]+)[\t ]*$/gm;
  const hits = [...md.matchAll(re)];
  hits.forEach((hit, i) => {
    const title = hit[1]?.trim() ?? "";
    const start = (hit.index ?? 0) + hit[0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : md.length;
    sections[title] = md.slice(start, end).trim();
  });
  return sections;
}

function namesFromContext(ctx = {}) {
  return [
    ctx.childName,
    ctx.staffName,
    ctx.managerName,
    ctx.guardianName,
    ctx.facilityName,
    ...(ctx.extraNames ?? []),
  ];
}

export function buildSavedProgramRagChunks(userId, entry, child = null) {
  const names = namesFromContext({
    childName: entry.childName ?? child?.name,
    managerName: child?.managerName,
    facilityName: child?.facilityName,
  });
  const sourceId = entry.id;
  const chunks = [];
  const mapped = entry.mappedPlan ?? {};

  if (mapped.familyIntentions) {
    pushChunk(chunks, userId, "saved_program", sourceId, "利用児及びご家族の意向", "individual_support_plan", mapped.familyIntentions, names);
  }
  if (mapped.comprehensivePolicy) {
    pushChunk(chunks, userId, "saved_program", sourceId, "総合的な支援方針", "individual_support_plan", mapped.comprehensivePolicy, names);
  }
  if (mapped.longTermGoal?.content) {
    pushChunk(
      chunks,
      userId,
      "saved_program",
      sourceId,
      "総合支援目標（長期）",
      "individual_support_plan",
      `${mapped.longTermGoal.content}\n期間：${mapped.longTermGoal.period ?? ""}`,
      names,
    );
  }
  for (const [i, g] of (mapped.shortTermGoals ?? []).entries()) {
    if (!g?.content) continue;
    pushChunk(
      chunks,
      userId,
      "saved_program",
      sourceId,
      `短期目標${i + 1}`,
      "individual_support_plan",
      `${g.content}\n期間：${g.period ?? ""}`,
      names,
    );
  }
  for (const row of mapped.domainRows ?? []) {
    if (!row?.domain) continue;
    pushChunk(
      chunks,
      userId,
      "saved_program",
      sourceId,
      `支援内容：${row.domain}`,
      "individual_support_plan",
      `支援目標：${row.supportTarget ?? ""}\n内容：${row.supportContent ?? ""}\n期間：${row.period ?? ""}`,
      names,
    );
  }
  if (mapped.familySupportRow) {
    const r = mapped.familySupportRow;
    pushChunk(
      chunks,
      userId,
      "saved_program",
      sourceId,
      "家族支援",
      "individual_support_plan",
      `支援目標：${r.supportTarget ?? ""}\n内容：${r.supportContent ?? ""}\n期間：${r.period ?? ""}`,
      names,
    );
  }
  if (mapped.serviceTimeDetail) {
    pushChunk(chunks, userId, "saved_program", sourceId, "サービス提供時間", "individual_support_plan", mapped.serviceTimeDetail, names);
  }

  const sections = extractH2Sections(entry.programText);
  for (const [title, body] of Object.entries(sections)) {
    pushChunk(chunks, userId, "saved_program", sourceId, title, "individual_support_plan", body, names, { fromMarkdown: true });
  }

  if (!chunks.length && entry.programText) {
    pushChunk(chunks, userId, "saved_program", sourceId, "個別支援計画書", "individual_support_plan", entry.programText, names);
  }

  return chunks;
}

export function buildSpecializedPlanRagChunks(userId, entry) {
  const names = namesFromContext({ childName: entry.childName });
  const chunks = [];
  const mapped = entry.mappedPlan ?? {};

  if (entry.programText) {
    const sections = extractH2Sections(entry.programText);
    for (const [title, body] of Object.entries(sections)) {
      pushChunk(chunks, userId, "specialized_plan", entry.id, title, "specialized_support_plan", body, names);
    }
  }
  if (mapped.currentStatus) {
    pushChunk(chunks, userId, "specialized_plan", entry.id, "現在の状況", "specialized_support_plan", mapped.currentStatus, names);
  }
  for (const key of ["goal1", "goal2"]) {
    const g = mapped[key];
    if (!g) continue;
    pushChunk(
      chunks,
      userId,
      "specialized_plan",
      entry.id,
      `目標：${g.title ?? key}`,
      "specialized_support_plan",
      [g.aim, g.activityExamples, g.methods].filter(Boolean).join("\n"),
      names,
    );
  }

  if (!chunks.length && entry.programText) {
    pushChunk(chunks, userId, "specialized_plan", entry.id, "専門的支援計画書", "specialized_support_plan", entry.programText, names);
  }

  return chunks;
}

export function buildFamilySupportRagChunks(userId, entry) {
  const p = entry.payload ?? {};
  const names = namesFromContext({
    childName: entry.childName,
    staffName: entry.staffName,
    guardianName: p.guardianName,
  });
  const chunks = [];
  const body = [
    `相談内容：${p.consultationContent ?? ""}`,
    `記録文：${entry.aiRecordText ?? ""}`,
    `次回提案：${entry.aiNextSuggestion ?? ""}`,
  ].join("\n");
  pushChunk(chunks, userId, "family_support", entry.id, "家族支援加算記録", "family_support", body, names);
  return chunks;
}

export function buildParentingSupportRagChunks(userId, entry) {
  const p = entry.payload ?? {};
  const names = namesFromContext({
    childName: entry.childName,
    staffName: entry.staffName,
    guardianName: p.guardianName,
  });
  const chunks = [];

  pushChunk(
    chunks,
    userId,
    "parenting_support",
    entry.id,
    "実施内容",
    "parenting_support",
    [
      `支援場面：${p.supportSceneType ?? ""}`,
      `観察・参加内容：${p.observationContent ?? ""}`,
    ].join("\n"),
    names,
  );
  pushChunk(chunks, userId, "parenting_support", entry.id, "相談援助の記録", "parenting_support", entry.aiConsultationRecord ?? "", names);
  pushChunk(chunks, userId, "parenting_support", entry.id, "児童の特性に関する説明", "parenting_support", entry.aiChildCharacteristics ?? "", names);
  pushChunk(chunks, userId, "parenting_support", entry.id, "保護者へのアドバイス", "parenting_support", entry.aiParentAdvice ?? "", names);
  pushChunk(chunks, userId, "parenting_support", entry.id, "家庭での実践ポイント", "parenting_support", entry.aiHomePractice ?? "", names);

  return chunks;
}

function getRagIngestUrl() {
  return `${window.location.origin}/api/rag-ingest`;
}

function toRagRows(userId, sourceType, sourceId, chunks) {
  const now = new Date().toISOString();
  return chunks
    .map((c) => ({
      id: String(c.id ?? "").trim(),
      user_id: userId,
      section: String(c.section ?? "記録").trim(),
      category: String(c.category ?? "individual_support_plan").trim(),
      content: String(c.content ?? "").trim(),
      source_type: sourceType,
      source_id: sourceId,
      metadata: {
        ...(c.metadata && typeof c.metadata === "object" ? c.metadata : {}),
        ingestedAt: now,
      },
    }))
    .filter((row) => row.id && row.content.length >= 20);
}

async function upsertRagViaSupabase(supabase, rows) {
  const { error } = await supabase
    .from("support_plan_rag_chunks")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return rows.length;
}

async function upsertRagViaApi(userId, sourceType, sourceId, chunks) {
  const res = await fetch(getRagIngestUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, sourceType, sourceId, chunks }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 200));
  }
}

/**
 * 保存後に RAG へ非同期投入（失敗しても保存処理は成功のまま）
 * @param {string} userId
 * @param {{ sourceType: string, sourceId: string, chunks: object[] }} payload
 * @param {import('@supabase/supabase-js').SupabaseClient | null} [supabase]
 */
export async function ingestRagChunks(userId, payload, supabase = null) {
  const { sourceType, sourceId, chunks } = payload;
  if (!userId || !sourceType || !sourceId || !chunks?.length) return;

  const rows = toRagRows(userId, sourceType, sourceId, chunks);
  if (!rows.length) return;

  try {
    if (supabase) {
      await upsertRagViaSupabase(supabase, rows);
    }
  } catch (e) {
    console.warn("[RAG ingest] supabase:", e instanceof Error ? e.message : String(e));
  }

  try {
    await upsertRagViaApi(userId, sourceType, sourceId, chunks);
  } catch (e) {
    if (!supabase) {
      console.warn("[RAG ingest]", e instanceof Error ? e.message : String(e));
    }
  }
}

export function ingestSavedProgramRag(userId, entry, child, supabase = null) {
  void ingestRagChunks(
    userId,
    {
      sourceType: "saved_program",
      sourceId: entry.id,
      chunks: buildSavedProgramRagChunks(userId, entry, child),
    },
    supabase,
  );
}

export function ingestSpecializedPlanRag(userId, entry, supabase = null) {
  void ingestRagChunks(
    userId,
    {
      sourceType: "specialized_plan",
      sourceId: entry.id,
      chunks: buildSpecializedPlanRagChunks(userId, entry),
    },
    supabase,
  );
}

export function ingestFamilySupportRag(userId, entry, supabase = null) {
  void ingestRagChunks(
    userId,
    {
      sourceType: "family_support",
      sourceId: entry.id,
      chunks: buildFamilySupportRagChunks(userId, entry),
    },
    supabase,
  );
}

export function ingestParentingSupportRag(userId, entry, supabase = null) {
  void ingestRagChunks(
    userId,
    {
      sourceType: "parenting_support",
      sourceId: entry.id,
      chunks: buildParentingSupportRagChunks(userId, entry),
    },
    supabase,
  );
}
