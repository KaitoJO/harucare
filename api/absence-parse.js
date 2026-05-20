const MODEL = "claude-sonnet-4-20250514";

/**
 * @param {string} messageText
 * @param {string[]} childNames
 * @param {string} [defaultChildName]
 */
export async function parseAbsenceMessage(
  messageText,
  childNames,
  defaultChildName = "",
) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return fallbackParse(messageText, childNames, defaultChildName);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const system = `あなたは児童発達支援事業所の欠席連絡を解析するアシスタントです。
保護者からのLINEメッセージから児童名・欠席日・理由を抽出し、JSONのみを返してください。

今日の日付: ${todayStr}
登録児童名一覧: ${childNames.length ? childNames.join("、") : "（なし）"}
${defaultChildName ? `この保護者の紐付け児童: ${defaultChildName}` : ""}

出力形式（JSONのみ）:
{
  "childName": "児童名（不明なら空文字）",
  "absenceDate": "YYYY-MM-DD（不明なら今日）",
  "reason": "欠席理由（短く）",
  "confidence": "high|medium|low"
}

ルール:
- 「明日」「来週月曜」等は今日基準で具体日付に変換
- 児童名が複数候補の場合は最も近い名前
- 理由が無ければ「記載なし」`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: messageText }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "Anthropic API error");
    }

    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      childName: String(parsed.childName ?? "").trim(),
      absenceDate: normalizeDate(parsed.absenceDate) || todayStr,
      reason: String(parsed.reason ?? "記載なし").trim() || "記載なし",
      confidence: String(parsed.confidence ?? "medium"),
      parser: "ai",
    };
  } catch {
    return fallbackParse(messageText, childNames, defaultChildName);
  }
}

function normalizeDate(raw) {
  const s = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

function fallbackParse(messageText, childNames, defaultChildName) {
  const text = String(messageText ?? "").trim();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let absenceDate = todayStr;
  if (/明後日/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    absenceDate = formatYmd(d);
  } else if (/明日/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    absenceDate = formatYmd(d);
  }

  let childName = defaultChildName;
  for (const name of childNames) {
    if (text.includes(name)) {
      childName = name;
      break;
    }
  }

  const reason = text.slice(0, 200) || "記載なし";

  return {
    childName,
    absenceDate,
    reason,
    confidence: childName ? "medium" : "low",
    parser: "fallback",
  };
}

function formatYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
