/** Vercel serverless: OpenAI Whisper へ音声を転送（API キーはサーバー側のみ） */

function getOpenAiKey() {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.VITE_OPENAI_API_KEY?.trim() ||
    ""
  );
}

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

  const openaiKey = getOpenAiKey();
  if (!openaiKey) {
    res.status(503).json({
      error: {
        message:
          "OPENAI_API_KEY が未設定です。.env または Vercel 環境変数を確認してください。",
      },
    });
    return;
  }

  const raw =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
  const audioBase64 = raw.audioBase64;
  const mimeType = typeof raw.mimeType === "string" ? raw.mimeType : "";

  if (!audioBase64 || typeof audioBase64 !== "string") {
    res.status(400).json({ error: { message: "音声データがありません" } });
    return;
  }

  let buf;
  try {
    buf = Buffer.from(audioBase64, "base64");
  } catch {
    res.status(400).json({ error: { message: "音声データの形式が不正です" } });
    return;
  }

  if (buf.length < 100) {
    res.status(400).json({
      error: { message: "録音が短すぎます。もう少し話してから停止してください" },
    });
    return;
  }

  const ext =
    mimeType.includes("mp4") || mimeType.includes("m4a")
      ? "m4a"
      : mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("wav")
          ? "wav"
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
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    },
  );

  const text = await upstream.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    res.status(502).json({
      error: { message: text.slice(0, 240) || "Whisper API error" },
    });
    return;
  }

  if (!upstream.ok) {
    res.status(upstream.status).json({
      error: {
        message:
          payload?.error?.message ||
          text.slice(0, 240) ||
          "Whisper API error",
      },
    });
    return;
  }

  res.status(200).json({
    text: typeof payload.text === "string" ? payload.text : "",
  });
}
