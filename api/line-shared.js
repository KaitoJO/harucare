import crypto from "node:crypto";
import { getRagEnv } from "./ragShared.js";

export function getLineEnv() {
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const workspaceUserId = process.env.HARUCARE_LINE_USER_ID?.trim();
  const { supabaseUrl, serviceRoleKey } = getRagEnv();
  return {
    channelSecret,
    channelAccessToken,
    workspaceUserId,
    supabaseUrl,
    serviceRoleKey,
  };
}

export function verifyLineSignature(bodyRaw, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(bodyRaw)
    .digest("base64");
  return hash === signature;
}

/** @param {string} accessToken @param {string} replyToken @param {object[]} messages */
export async function lineReply(accessToken, replyToken, messages) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 300) || "LINE reply failed");
  }
}

export async function supabaseRest(
  supabaseUrl,
  serviceRoleKey,
  path,
  { method = "GET", body, prefer } = {},
) {
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
  if (prefer) headers.prefer = prefer;

  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : String(text).slice(0, 400),
    );
  }
  return data;
}

export async function fetchChildren(supabaseUrl, serviceRoleKey, userId) {
  const rows = await supabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `children?user_id=eq.${userId}&select=id,name`,
  );
  return Array.isArray(rows) ? rows : [];
}

export async function fetchAbsenceRecords(supabaseUrl, serviceRoleKey, userId) {
  const rows = await supabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `absence_records?user_id=eq.${userId}&select=id,child_id,absence_date,billable,contacted_at&order=absence_date.desc`,
  );
  return Array.isArray(rows) ? rows : [];
}

export async function fetchLineLinks(
  supabaseUrl,
  serviceRoleKey,
  userId,
  lineUserId,
) {
  const rows = await supabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `line_guardian_links?user_id=eq.${userId}&line_user_id=eq.${encodeURIComponent(lineUserId)}&select=child_id,child_name`,
  );
  return Array.isArray(rows) ? rows : [];
}

export async function insertAbsenceViaServiceRole(
  supabaseUrl,
  serviceRoleKey,
  row,
) {
  await supabaseRest(supabaseUrl, serviceRoleKey, "absence_records", {
    method: "POST",
    body: row,
    prefer: "return=minimal",
  });
}
