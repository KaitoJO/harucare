export function appendVoiceTranscript(prev, addition) {
  const a = String(addition ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!a) return prev ?? "";
  const p = prev ?? "";
  if (!p) return a;
  const sep = /\s$/.test(p) || p.endsWith("\n") ? "" : " ";
  return `${p}${sep}${a}`;
}

export function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function pickMediaRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function getVoiceInputMode() {
  if (getSpeechRecognitionCtor()) return "webspeech";
  if (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  ) {
    return "whisper";
  }
  return "none";
}

export function isVoiceInputSupported() {
  return getVoiceInputMode() !== "none";
}

export function mapSpeechRecognitionError(code) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "マイクまたは音声認識の使用が許可されていません";
    case "no-speech":
      return "音声が聞き取れませんでした。もう一度お試しください";
    case "audio-capture":
      return "マイクを使用できません";
    case "network":
      return "音声認識にネットワーク接続が必要です";
    case "aborted":
      return "";
    default:
      return "音声認識に失敗しました";
  }
}

/**
 * ブラウザ標準の SpeechRecognition（API キー不要）
 * @param {{ onInterim?: (text: string) => void, onError?: (message: string) => void }} handlers
 */
export function startWebSpeechRecognition(handlers = {}) {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    throw new Error("このブラウザは音声認識に対応していません");
  }

  const recognition = new Ctor();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const finals = [];
  let lastInterim = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        if (transcript.trim()) finals.push(transcript.trim());
      } else {
        interim += transcript;
      }
    }
    lastInterim = interim.trim();
    handlers.onInterim?.(lastInterim);
  };

  recognition.onerror = (event) => {
    const message = mapSpeechRecognitionError(event.error);
    if (message) handlers.onError?.(message);
  };

  recognition.start();

  return {
    recognition,
    stop() {
      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          const text = finals.join(" ").trim() || lastInterim;
          resolve(text);
        };

        recognition.onend = finish;
        recognition.onerror = (event) => {
          const message = mapSpeechRecognitionError(event.error);
          if (message && !finals.length) handlers.onError?.(message);
          finish();
        };

        try {
          recognition.stop();
        } catch {
          finish();
        }

        window.setTimeout(finish, 1500);
      });
    },
    abort() {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },
  };
}

async function transcribeAudioWithOpenAI(blob) {
  const base64 = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    fr.onerror = () => reject(new Error("音声の読み込みに失敗しました"));
    fr.readAsDataURL(blob);
  });

  const res = await fetch("/api/whisper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: blob.type || "audio/webm",
    }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
        (typeof data?.error === "string" ? data.error : "") ||
        `音声認識に失敗しました（${res.status}）`,
    );
  }

  return typeof data.text === "string" ? data.text : "";
}

/**
 * MediaRecorder + Whisper（Web Speech 非対応時のフォールバック）
 */
export async function recordAndTranscribeWithWhisper(handlers = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks = [];

  const mimeType = pickMediaRecorderMimeType();
  const rec = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  const usedMime = rec.mimeType || mimeType || "audio/webm";

  rec.ondataavailable = (e) => {
    if (e.data?.size > 0) chunks.push(e.data);
  };

  return {
    recorder: rec,
    stream,
    stop() {
      return new Promise((resolve, reject) => {
        rec.onstop = async () => {
          stream.getTracks().forEach((tr) => tr.stop());
          const blob = new Blob(chunks, { type: usedMime });
          if (blob.size === 0) {
            reject(new Error("録音データがありません。もう一度お試しください"));
            return;
          }
          handlers.onTranscribing?.();
          try {
            const text = await transcribeAudioWithOpenAI(blob);
            resolve(text);
          } catch (e) {
            reject(e);
          }
        };

        try {
          if (rec.state === "recording") rec.requestData?.();
          rec.stop();
        } catch (e) {
          stream.getTracks().forEach((tr) => tr.stop());
          reject(e);
        }
      });
    },
    start() {
      rec.start(250);
    },
    abort() {
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((tr) => tr.stop());
    },
  };
}
