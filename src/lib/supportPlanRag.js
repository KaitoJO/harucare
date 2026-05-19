/**
 * 個別支援計画書生成用 RAG コンテキスト取得
 */

function getRagSearchUrl() {
  return `${window.location.origin}/api/rag-search`;
}

export function buildSupportPlanRagQuery(child, extraPlanPrompt = "") {
  return [
    child?.disability ? `障害種別：${child.disability}` : "",
    child?.currentIssues ? `現在の課題：${child.currentIssues}` : "",
    child?.goals ? `目標：${child.goals}` : "",
    child?.familyLifeIntentions
      ? `家族の意向：${child.familyLifeIntentions}`
      : "",
    child?.motorLevel ? `運動：${child.motorLevel}` : "",
    child?.communicationLevel ? `コミュニケーション：${child.communicationLevel}` : "",
    child?.socialLevel ? `社会性：${child.socialLevel}` : "",
    extraPlanPrompt.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * @param {object} child
 * @param {string} [extraPlanPrompt=""]
 * @param {number} [matchCount=4]
 * @returns {Promise<string>}
 */
export async function fetchSupportPlanRagContext(
  child,
  extraPlanPrompt = "",
  matchCount = 4,
  userId = "",
) {
  const query = buildSupportPlanRagQuery(child, extraPlanPrompt);
  if (!query.trim()) return "";

  try {
    const res = await fetch(getRagSearchUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        matchCount,
        userId: userId || undefined,
        category: "individual_support_plan",
      }),
    });
    if (!res.ok) return "";

    const data = await res.json();
    const chunks = data.chunks ?? [];
    if (!chunks.length) return "";

    const blocks = chunks.map(
      (c) => `【RAG参考：${c.section}】\n${String(c.content ?? "").trim()}`,
    );

    return `${blocks.join("\n\n")}

【RAG参照の使い方】
上記は匿名化済みの実計画書（自施設の蓄積データ＋参照サンプル）から抽出した事例です。文体・構成・粒度（支援目標／内容／支援のポイント／声かけ方針／期間／担当者の書き方）を真似し、本児の情報に合わせて新規作成してください。コピペは禁止。施設名・個人名は出力しないこと。`;
  } catch {
    return "";
  }
}
