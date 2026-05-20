import crypto from "node:crypto";
import { parseAbsenceMessage } from "./absence-parse.js";
import {
  fetchAbsenceRecords,
  fetchChildren,
  fetchLineLinks,
  getLineEnv,
  insertAbsenceViaServiceRole,
  lineReply,
  verifyLineSignature,
} from "./line-shared.js";

const ABSENCE_SUPPORT_MONTHLY_LIMIT = 4;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function yearMonthFromDateStr(dateStr) {
  return String(dateStr ?? "").slice(0, 7);
}

function countBillableInMonth(records, childId, ym) {
  return records.filter(
    (r) =>
      String(r.child_id) === String(childId) &&
      yearMonthFromDateStr(r.absence_date) === ym &&
      r.billable,
  ).length;
}

function matchChild(parsedName, children, linkChildId) {
  if (linkChildId) {
    const linked = children.find((c) => String(c.id) === String(linkChildId));
    if (linked) return linked;
  }
  const hint = String(parsedName ?? "").trim();
  if (!hint) return null;
  const exact = children.find((c) => c.name === hint);
  if (exact) return exact;
  return (
    children.find((c) => c.name.includes(hint) || hint.includes(c.name)) ??
    null
  );
}

function buildAbsenceId() {
  return `abs-${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;
}

async function processTextMessage(env, lineUserId, messageText, replyToken) {
  const { supabaseUrl, serviceRoleKey, workspaceUserId, channelAccessToken } =
    env;

  const children = await fetchChildren(
    supabaseUrl,
    serviceRoleKey,
    workspaceUserId,
  );
  const childNames = children.map((c) => c.name);

  const links = await fetchLineLinks(
    supabaseUrl,
    serviceRoleKey,
    workspaceUserId,
    lineUserId,
  );
  const defaultChildName = links[0]?.child_name ?? "";
  const linkChildId = links[0]?.child_id ?? null;

  const parsed = await parseAbsenceMessage(
    messageText,
    childNames,
    defaultChildName,
  );

  const child = matchChild(parsed.childName, children, linkChildId);

  if (!child) {
    await lineReply(channelAccessToken, replyToken, [
      {
        type: "text",
        text:
          "児童名を特定できませんでした。\n\n例：\n「田中太郎 明日 発熱のため欠席します」\n\n事業所に児童名とLINEの紐付け設定を依頼してください。",
      },
    ]);
    return;
  }

  const existing = await fetchAbsenceRecords(
    supabaseUrl,
    serviceRoleKey,
    workspaceUserId,
  );
  const ym = yearMonthFromDateStr(parsed.absenceDate);
  const used = countBillableInMonth(existing, child.id, ym);
  const billable = used < ABSENCE_SUPPORT_MONTHLY_LIMIT;
  const billableNote = billable
    ? ""
    : `月上限（${ABSENCE_SUPPORT_MONTHLY_LIMIT}回）のため算定対象外`;

  const now = new Date().toISOString();
  const row = {
    id: buildAbsenceId(),
    user_id: workspaceUserId,
    child_id: child.id,
    child_name: child.name,
    absence_date: parsed.absenceDate,
    reason: parsed.reason,
    source: "line",
    line_user_id: lineUserId,
    line_message: messageText,
    ai_parsed: parsed,
    contacted_at: null,
    contacted_by: "",
    billable: billable,
    billable_note: billableNote,
    created_at: now,
    updated_at: now,
  };

  await insertAbsenceViaServiceRole(supabaseUrl, serviceRoleKey, row);

  const dateJa = parsed.absenceDate.replace(/-/g, "/");
  let reply = `欠席連絡を受け付けました。\n\n児童：${child.name}\n日付：${dateJa}\n理由：${parsed.reason}\n\n日程表に反映しました。`;
  if (billable) {
    reply += `\n\n欠席時対応加算の対象として記録します（今月${used + 1}/${ABSENCE_SUPPORT_MONTHLY_LIMIT}回目）。`;
  } else {
    reply += `\n\n※今月の加算上限に達しているため、算定対象外として記録します。`;
  }
  reply += "\n\n事業所から確認の連絡があります。";

  await lineReply(channelAccessToken, replyToken, [
    { type: "text", text: reply },
  ]);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ ok: true, service: "harucare-line-webhook" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const env = getLineEnv();
  const missing = [];
  if (!env.channelSecret) missing.push("LINE_CHANNEL_SECRET");
  if (!env.channelAccessToken) missing.push("LINE_CHANNEL_ACCESS_TOKEN");
  if (!env.workspaceUserId) missing.push("HARUCARE_LINE_USER_ID");
  if (!env.supabaseUrl || !env.serviceRoleKey) {
    missing.push("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length) {
    res.status(503).json({
      error: `未設定: ${missing.join(", ")}`,
    });
    return;
  }

  let bodyRaw;
  try {
    bodyRaw = await readRawBody(req);
  } catch {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const signature = req.headers["x-line-signature"];
  if (!verifyLineSignature(bodyRaw, signature, env.channelSecret)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(bodyRaw.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  res.status(200).json({ ok: true });

  const events = payload.events ?? [];
  for (const event of events) {
    try {
      if (event.type === "follow") {
        await lineReply(env.channelAccessToken, event.replyToken, [
          {
            type: "text",
            text:
              "HaruCare欠席連絡を受け付けます。\n\n児童名・日付・理由を含めて送信してください。\n\n例：\n「山田花子 明日 発熱のため欠席します」",
          },
        ]);
        continue;
      }

      if (event.type !== "message" || event.message?.type !== "text") {
        continue;
      }

      await processTextMessage(
        env,
        event.source?.userId ?? "",
        event.message.text ?? "",
        event.replyToken,
      );
    } catch (e) {
      console.error("LINE event error:", e);
      if (event.replyToken) {
        try {
          await lineReply(env.channelAccessToken, event.replyToken, [
            {
              type: "text",
              text: "受付中にエラーが発生しました。事業所へ直接ご連絡ください。",
            },
          ]);
        } catch {
          /* ignore */
        }
      }
    }
  }
}
