import {
  embedTexts,
  getRagEnv,
  upsertRagRows,
} from "./ragShared.js";

/** Vercel serverless: 保存データを RAG Vector DB に蓄積 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const { openaiKey, supabaseUrl, serviceRoleKey } = getRagEnv();
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(503).json({
      error: {
        message:
          "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。",
      },
    });
    return;
  }

  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const userId = String(body.userId ?? "").trim();
  const sourceType = String(body.sourceType ?? "").trim();
  const sourceId = String(body.sourceId ?? "").trim();
  const chunks = Array.isArray(body.chunks) ? body.chunks : [];

  if (!userId || !sourceType || !sourceId) {
    res.status(400).json({ error: { message: "userId, sourceType, sourceId are required" } });
    return;
  }

  const validChunks = chunks
    .map((c) => ({
      id: String(c.id ?? "").trim(),
      section: String(c.section ?? "記録").trim(),
      category: String(c.category ?? "individual_support_plan").trim(),
      content: String(c.content ?? "").trim(),
      metadata: c.metadata && typeof c.metadata === "object" ? c.metadata : {},
    }))
    .filter((c) => c.id && c.content.length >= 20);

  if (!validChunks.length) {
    res.status(200).json({ upserted: 0, embedded: 0, skipped: true });
    return;
  }

  let embeddings = [];
  if (openaiKey) {
    try {
      const embedInputs = validChunks.map((c) => `${c.section}\n${c.content}`);
      embeddings = await embedTexts(openaiKey, embedInputs);
    } catch (e) {
      console.warn("[rag-ingest] embedding failed:", e.message);
    }
  }

  const now = new Date().toISOString();
  const rows = validChunks.map((c, i) => ({
    id: c.id,
    user_id: userId,
    section: c.section,
    category: c.category,
    content: c.content,
    embedding: embeddings[i]?.length ? embeddings[i] : null,
    source_type: sourceType,
    source_id: sourceId,
    metadata: {
      ...c.metadata,
      ingestedAt: now,
    },
  }));

  try {
    const result = await upsertRagRows(supabaseUrl, serviceRoleKey, rows);
    res.status(200).json({
      ...result,
      embedded: embeddings.filter(Boolean).length,
    });
  } catch (e) {
    res.status(502).json({
      error: { message: e instanceof Error ? e.message : String(e) },
    });
  }
}
