/** Vercel serverless: forwards audio to OpenAI Whisper (avoids browser CORS). */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = req.headers.authorization;
  const bearer =
    typeof auth === "string" && auth.startsWith("Bearer ")
      ? auth
      : Array.isArray(auth) && auth[0]?.startsWith("Bearer ")
        ? auth[0]
        : "";
  if (!bearer) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  const raw =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const audioBase64 = raw.audioBase64;
  const mimeType = typeof raw.mimeType === "string" ? raw.mimeType : "";

  if (!audioBase64 || typeof audioBase64 !== "string") {
    res.status(400).json({ error: "Missing audio" });
    return;
  }

  let buf;
  try {
    buf = Buffer.from(audioBase64, "base64");
  } catch {
    res.status(400).json({ error: "Invalid audio" });
    return;
  }

  const ext =
    mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : mimeType.includes("ogg")
        ? "ogg"
        : "webm";
  const filename = `audio.${ext}`;

  const form = new FormData();
  form.append(
    "file",
    new Blob([buf], { type: mimeType || "application/octet-stream" }),
    filename,
  );
  form.append("model", "whisper-1");
  form.append("language", "ja");

  const upstream = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: bearer },
      body: form,
    },
  );

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json";
  res.status(upstream.status).setHeader("Content-Type", ct).send(text);
}
