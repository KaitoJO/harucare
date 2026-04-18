/** Vercel serverless: forwards POST body to Anthropic (avoids browser CORS). */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-key, anthropic-version",
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  const anthropicVersion =
    req.headers["anthropic-version"] || "2023-06-01";

  const MODEL = "claude-haiku-4-5-20251001";
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? { ...req.body, model: MODEL }
      : req.body;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Array.isArray(apiKey) ? apiKey[0] : apiKey,
      "anthropic-version": Array.isArray(anthropicVersion)
        ? anthropicVersion[0]
        : anthropicVersion,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json";
  res.status(upstream.status).setHeader("Content-Type", ct).send(text);
}
