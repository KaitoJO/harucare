export function getRagEnv() {
  const openaiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.VITE_OPENAI_API_KEY?.trim();
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return { openaiKey, supabaseUrl, serviceRoleKey };
}

export async function embedTexts(openaiKey, texts) {
  const input = texts.map((t) => String(t ?? "").trim()).filter(Boolean);
  if (!input.length) return [];

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input,
    }),
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(raw.slice(0, 240) || "Embedding API error");
  }
  if (!res.ok) {
    throw new Error(
      data.error?.message || `Embedding API error（${res.status}）`,
    );
  }

  const sorted = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
  return sorted.map((row) => row.embedding);
}

export async function upsertRagRows(supabaseUrl, serviceRoleKey, rows) {
  if (!rows.length) return { upserted: 0 };

  const res = await fetch(`${supabaseUrl}/rest/v1/support_plan_rag_chunks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText.slice(0, 400) || "RAG upsert failed");
  }

  return { upserted: rows.length };
}

export async function fetchRagFallbackRows(
  supabaseUrl,
  serviceRoleKey,
  { category, userId, matchCount },
) {
  const params = new URLSearchParams({
    select: "id,section,content,user_id,created_at",
    order: "created_at.desc",
    limit: String(Math.max(matchCount * 3, 12)),
  });
  if (category) params.set("category", `eq.${category}`);
  if (userId) {
    params.set("or", `(user_id.is.null,user_id.eq.${userId})`);
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/support_plan_rag_chunks?${params}`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export function scoreKeywordFallback(rows, query, matchCount) {
  const terms = String(query ?? "")
    .toLowerCase()
    .split(/[\s、。・]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  return rows
    .map((row) => {
      const hay = `${row.section}\n${row.content}`.toLowerCase();
      const score = terms.reduce(
        (acc, term) => acc + (hay.includes(term) ? 1 : 0),
        0,
      );
      return { ...row, similarity: score / Math.max(terms.length, 1) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}
