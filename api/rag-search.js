import {
  embedTexts,
  fetchRagFallbackRows,
  getRagEnv,
  scoreKeywordFallback,
} from "./ragShared.js";

/** Vercel serverless: embed query text and search support plan RAG chunks. */
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
          "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です。RAG 検索を有効にするには Vercel 環境変数を設定してください。",
      },
    });
    return;
  }

  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const query = String(body.query ?? "").trim();
  const userId = String(body.userId ?? "").trim() || null;
  const matchCount = Math.min(Math.max(Number(body.matchCount) || 4, 1), 8);
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : "individual_support_plan";

  if (!query) {
    res.status(400).json({ error: { message: "query is required" } });
    return;
  }

  const fallbackSearch = async (mode) => {
    const rows = await fetchRagFallbackRows(supabaseUrl, serviceRoleKey, {
      category,
      userId,
      matchCount,
    });
    if (!rows.length) return null;
    const scored = scoreKeywordFallback(rows, query, matchCount);
    return { chunks: scored, mode };
  };

  if (!openaiKey) {
    const fb = await fallbackSearch("content_fallback");
    if (fb) {
      res.status(200).json(fb);
      return;
    }
    res.status(503).json({
      error: { message: "OPENAI_API_KEY が未設定です。" },
    });
    return;
  }

  let embedding;
  try {
    [embedding] = await embedTexts(openaiKey, [query]);
  } catch (e) {
    const fb = await fallbackSearch("keyword_fallback");
    if (fb) {
      res.status(200).json(fb);
      return;
    }
    res.status(502).json({
      error: { message: e instanceof Error ? e.message : String(e) },
    });
    return;
  }

  if (!embedding?.length) {
    const fb = await fallbackSearch("content_fallback");
    res.status(200).json(fb ?? { chunks: [], mode: "empty" });
    return;
  }

  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_support_plan_rag`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_count: matchCount,
      filter_category: category,
      filter_user_id: userId,
    }),
  });

  const rpcRaw = await rpcRes.text();
  let chunks;
  try {
    chunks = JSON.parse(rpcRaw);
  } catch {
    const fb = await fallbackSearch("keyword_fallback");
    if (fb) {
      res.status(200).json(fb);
      return;
    }
    res.status(502).json({
      error: { message: rpcRaw.slice(0, 240) || "Supabase RPC error" },
    });
    return;
  }

  if (!rpcRes.ok) {
    const fb = await fallbackSearch("keyword_fallback");
    if (fb) {
      res.status(200).json(fb);
      return;
    }
    res.status(rpcRes.status).json({
      error: {
        message:
          (typeof chunks === "object" && chunks?.message) ||
          rpcRaw.slice(0, 240) ||
          "Supabase RPC error",
      },
    });
    return;
  }

  const hasVectorHits = Array.isArray(chunks) && chunks.length > 0;
  if (!hasVectorHits) {
    const fb = await fallbackSearch("content_fallback");
    res.status(200).json(fb ?? { chunks: [], mode: "empty" });
    return;
  }

  res.status(200).json({
    chunks,
    mode: "vector",
  });
}
