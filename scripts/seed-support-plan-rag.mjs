/**
 * 個別支援計画書 RAG データを Supabase Vector DB に登録する。
 *
 * 必要な環境変数（.env）:
 * - OPENAI_API_KEY または VITE_OPENAI_API_KEY
 * - VITE_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/seed-support-plan-rag.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnvFile();

const { SUPPORT_PLAN_RAG_CHUNKS } = await import("../src/supportPlanRagData.js");

const openaiKey =
  process.env.OPENAI_API_KEY?.trim() ||
  process.env.VITE_OPENAI_API_KEY?.trim();
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!openaiKey) {
  console.error("OPENAI_API_KEY または VITE_OPENAI_API_KEY が必要です。");
  process.exit(1);
}

async function embedText(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Embedding failed (${res.status})`);
  }
  return data.data?.[0]?.embedding;
}

async function upsertChunk(chunk, embedding) {
  const row = {
    id: chunk.id,
    section: chunk.section,
    category: chunk.category,
    content: chunk.content,
    embedding,
    metadata: { source: "seed", anonymized: true },
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/support_plan_rag_chunks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${chunk.id}: ${errText.slice(0, 300)}`);
  }
}

function toVectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

async function writeSqlSeed(results) {
  const lines = [
    "-- Auto-generated RAG seed (run in Supabase SQL Editor if service role key unavailable)",
    "insert into public.support_plan_rag_chunks (id, section, category, content, embedding, metadata)",
    "values",
  ];

  const valueRows = results.map(({ chunk, embedding }, idx) => {
    const contentEsc = chunk.content.replace(/'/g, "''");
    const sectionEsc = chunk.section.replace(/'/g, "''");
    const comma = idx < results.length - 1 ? "," : "";
    return `  ('${chunk.id}', '${sectionEsc}', '${chunk.category}', '${contentEsc}', '${toVectorLiteral(embedding)}'::vector, '{"source":"seed","anonymized":true}'::jsonb)${comma}`;
  });

  lines.push(...valueRows);
  lines.push(
    "on conflict (id) do update set",
    "  section = excluded.section,",
    "  category = excluded.category,",
    "  content = excluded.content,",
    "  embedding = excluded.embedding,",
    "  metadata = excluded.metadata;",
  );

  const outPath = join(root, "supabase/seeds/support_plan_rag_seed.sql");
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(join(root, "supabase/seeds"), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`SQL seed written: ${outPath}`);
}

async function main() {
  console.log(`Embedding ${SUPPORT_PLAN_RAG_CHUNKS.length} chunks...`);
  const results = [];

  for (const chunk of SUPPORT_PLAN_RAG_CHUNKS) {
    const embedding = await embedText(`${chunk.section}\n${chunk.content}`);
    if (!embedding?.length) {
      throw new Error(`Empty embedding for ${chunk.id}`);
    }
    results.push({ chunk, embedding });
    console.log(`  ✓ ${chunk.id} (${embedding.length} dims)`);
  }

  await writeSqlSeed(results);

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY が未設定のため、SQL ファイルを Supabase SQL Editor で実行してください。",
    );
    return;
  }

  console.log("Upserting to Supabase...");
  for (const { chunk, embedding } of results) {
    await upsertChunk(chunk, embedding);
    console.log(`  ✓ upserted ${chunk.id}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
