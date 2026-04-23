import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { exportSupportPlanPdf, supportPlanPdfFilename } from "./exportSupportPlanPdf.js";

const DISABILITY_TYPES = [
  "自閉スペクトラム症",
  "ダウン症",
  "脳性麻痺",
  "発達遅滞",
  "ADHD",
  "重症心身障害",
  "言語障害",
  "学習障害（LD）",
  "医療的ケア児",
  "その他",
];
const AGE_OPTIONS = ["1歳", "2歳", "3歳", "4歳", "5歳", "6歳"];
const LEVELS = ["低", "中", "高"];
const SEVERITY = ["軽度", "中度", "重度"];

function matchesListDisabilityFilter(disability, filterId) {
  if (filterId === "all") return true;
  if (filterId === "autism") return disability === "自閉スペクトラム症";
  if (filterId === "down") return disability === "ダウン症";
  if (filterId === "developmental") {
    return ["発達遅滞", "ADHD", "言語障害", "学習障害（LD）"].includes(disability);
  }
  if (filterId === "other") {
    const dev = ["発達遅滞", "ADHD", "言語障害", "学習障害（LD）"];
    return (
      disability !== "自閉スペクトラム症" &&
      disability !== "ダウン症" &&
      !dev.includes(disability)
    );
  }
  return true;
}

const REFERENCE_CASE = `【実際の支援事例】
障害：発達遅滞
課題の背景：体幹・姿勢保持の弱さ、注意機能の未成熟、視覚的見通し不足、手指協調運動の未発達
支援方針：粗大運動で身体安定性を高める→視覚的支援で見通し提示→手指操作の基礎づくり
効果的な活動：バランス遊び・トンネルくぐり・平均台（理由：体幹強化）、シール貼り・型はめ・パズル（理由：手指協調）
支援のポイント：動作を短く区切る、視覚提示は常に同じ位置・形式、短時間で完了できる課題から始める、成功したらすぐほめる`;

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const SAVED_PROGRAMS_STORAGE_KEY = "harucare:saved-programs:v1";
const SUPPORT_RECORDS_STORAGE_KEY = "harucare:support-records:v1";
const PLAN_FEEDBACK_STORAGE_KEY = "harucare:plan-feedback:v1";

function formatJaDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

function formatJaDate(yyyyMmDd) {
  try {
    const [y, m, d] = String(yyyyMmDd).split("-").map((v) => Number(v));
    if (!y || !m || !d) return String(yyyyMmDd);
    return new Date(y, m - 1, d).toLocaleDateString("ja-JP");
  } catch {
    return String(yyyyMmDd);
  }
}

function todayYyyyMmDd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadSavedPrograms() {
  try {
    const raw = localStorage.getItem(SAVED_PROGRAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.childName === "string" &&
        typeof p.createdAt === "string" &&
        typeof p.programText === "string",
    );
  } catch {
    return [];
  }
}

function persistSavedPrograms(programs) {
  try {
    localStorage.setItem(SAVED_PROGRAMS_STORAGE_KEY, JSON.stringify(programs));
  } catch {
    // localStorage が使えない/容量超過でもアプリ自体は動かす
  }
}

function loadSupportRecords() {
  try {
    const raw = localStorage.getItem(SUPPORT_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof r.id === "string" &&
        typeof r.childName === "string" &&
        typeof r.date === "string",
    );
  } catch {
    return [];
  }
}

function persistSupportRecords(records) {
  try {
    localStorage.setItem(SUPPORT_RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage が使えない/容量超過でもアプリ自体は動かす
  }
}

function loadPlanFeedbacks() {
  try {
    const raw = localStorage.getItem(PLAN_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f) =>
        f &&
        typeof f === "object" &&
        typeof f.programText === "string" &&
        (f.rating === "up" || f.rating === "down") &&
        typeof f.createdAt === "string" &&
        f.childId != null &&
        f.childId !== "",
    );
  } catch {
    return [];
  }
}

function persistPlanFeedbacks(items) {
  try {
    localStorage.setItem(PLAN_FEEDBACK_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function getLatestPlanFeedbackForProgram(feedbacks, childId, programText) {
  const cid = String(childId);
  for (let i = feedbacks.length - 1; i >= 0; i -= 1) {
    const f = feedbacks[i];
    if (String(f.childId) === cid && f.programText === programText) return f;
  }
  return null;
}

/** localStorage 用の子どもキー（id が無いデータ向けに名前フォールバック） */
function planFeedbackChildKey(child) {
  if (!child) return null;
  if (child.id != null && String(child.id) !== "") return child.id;
  const n = String(child.name ?? "").trim();
  return n ? `name:${n}` : null;
}

const selectLabelStyle = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "#7a8a7a",
  marginBottom: 6,
  textTransform: "uppercase",
};

function ProgramMarkdown({ text }) {
  return (
    <div className="program-md">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: ({ children }) => (
            <h1
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#2d5a3d",
                margin: "0 0 0.5em",
                lineHeight: 1.35,
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                fontSize: "1.08rem",
                fontWeight: 700,
                color: "#2d5a3d",
                margin: "1em 0 0.45em",
                lineHeight: 1.35,
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#3a5a45",
                margin: "0.85em 0 0.4em",
                lineHeight: 1.35,
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ margin: "0.65em 0 0", lineHeight: 1.85, color: "#2a3a2a" }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: "#1a2a1a" }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: "italic", color: "#3a4a3a" }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: "0.5em 0 0", color: "#2a3a2a" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "0.5em 0 0", color: "#2a3a2a" }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ lineHeight: 1.75 }}>{children}</li>
          ),
          hr: () => (
            <hr
              style={{
                border: "none",
                borderTop: "1px solid #e0eae0",
                margin: "1.1em 0",
              }}
            />
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin: "0.65em 0 0",
                padding: "0 0 0 12px",
                borderLeft: "3px solid #c8e0cc",
                color: "#4a5a4a",
                lineHeight: 1.75,
              }}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2d5a3d", textDecoration: "underline" }}
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const inline = !className;
            return inline ? (
              <code
                style={{
                  fontFamily: "ui-monospace, Consolas, monospace",
                  fontSize: "0.92em",
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#f4f3ec",
                  color: "#1a2a1a",
                }}
              >
                {children}
              </code>
            ) : (
              <code className={className} style={{ display: "block" }}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              style={{
                margin: "0.65em 0 0",
                padding: "12px 14px",
                borderRadius: 10,
                background: "#f8faf8",
                border: "1px solid #e0eae0",
                overflow: "auto",
                fontSize: "0.85em",
                lineHeight: 1.55,
              }}
            >
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** PDF 出力用（一時的に body にマウントして html2canvas する） */
function SupportPlanPdfMount({ name, age, disability, programText }) {
  return (
    <div
      className="support-plan-pdf-root"
      style={{
        width: 820,
        maxWidth: 820,
        boxSizing: "border-box",
        padding: "4px 2px 10px",
        background: "#fff",
        color: "#2a3a2a",
        fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
        fontSize: 12.5,
        lineHeight: 1.65,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#2d5a3d",
          marginBottom: 8,
        }}
      >
        {name}の個別支援プログラム
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#6a7a6a",
          marginBottom: 14,
        }}
      >
        {age} · {disability}
      </div>
      <ProgramMarkdown text={programText} />
    </div>
  );
}

async function mountAndExportSupportPlanPdf({
  name,
  age,
  disability,
  programText,
  filenameStem,
}) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:820px;opacity:0.01;pointer-events:none;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <SupportPlanPdfMount
      name={name}
      age={age}
      disability={disability}
      programText={programText}
    />,
  );
  try {
    await new Promise((r) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(r);
      });
    });
    await document.fonts.ready;
    const inner = host.querySelector(".support-plan-pdf-root");
    if (!inner) throw new Error("PDF root missing");
    await exportSupportPlanPdf(
      inner,
      supportPlanPdfFilename(filenameStem),
    );
  } finally {
    root.unmount();
    host.remove();
  }
}

function appendVoiceTranscript(prev, addition) {
  const a = String(addition ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!a) return prev ?? "";
  const p = prev ?? "";
  if (!p) return a;
  const sep = /\s$/.test(p) || p.endsWith("\n") ? "" : " ";
  return `${p}${sep}${a}`;
}

/** VoiceAppendTextarea 用（App 内の s.textarea と同等） */
const sTextareaBase = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "2px solid #e0eae0",
  fontSize: 13,
  color: "#2a3a2a",
  background: "#fafcfa",
  outline: "none",
  resize: "none",
  fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif",
  lineHeight: 1.6,
};

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

function isWhisperVoiceSupported() {
  return (
    typeof window !== "undefined" &&
    !!import.meta.env.VITE_OPENAI_API_KEY &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

async function transcribeAudioWithOpenAI(blob, apiKey) {
  if (import.meta.env.DEV) {
    const fd = new FormData();
    const type = blob.type || "audio/webm";
    const ext =
      type.includes("mp4") || type.includes("m4a")
        ? "m4a"
        : type.includes("ogg")
          ? "ogg"
          : "webm";
    fd.append("file", blob, `recording.${ext}`);
    fd.append("model", "whisper-1");
    fd.append("language", "ja");

    const res = await fetch("/openai-api/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) detail = errJson.error.message;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    const data = await res.json();
    return typeof data.text === "string" ? data.text : "";
  }

  const base64 = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(blob);
  });

  const res = await fetch("/api/whisper", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: blob.type || "audio/webm",
    }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) detail = errJson.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return typeof data.text === "string" ? data.text : "";
}

/**
 * テキストエリア右下にマイク。MediaRecorder で録音し OpenAI Whisper に送信。結果は既存テキストに追記。
 * API キー未設定または非対応環境ではマイク非表示。
 */
function VoiceAppendTextarea({ value, onValueChange, rows, placeholder }) {
  const supported = useMemo(() => isWhisperVoiceSupported(), []);
  const valueRef = useRef(value);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const showVoiceFailureMessage = useCallback(() => {
    setVoiceError(true);
    window.setTimeout(() => setVoiceError(false), 4000);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  useEffect(
    () => () => {
      try {
        recorderRef.current?.stop?.();
      } catch {
        /* ignore */
      }
      stopStream();
    },
    [stopStream],
  );

  const onMicClick = useCallback(async () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || transcribing) return;

    if (recording && recorderRef.current) {
      try {
        if (recorderRef.current.state === "recording") {
          recorderRef.current.requestData?.();
        }
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      recorderRef.current = null;
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMediaRecorderMimeType();
      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const usedMime = rec.mimeType || mimeType || "audio/webm";

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        stopStream();
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: usedMime });
        chunksRef.current = [];
        if (blob.size === 0) return;

        setTranscribing(true);
        setVoiceError(false);
        try {
          const text = await transcribeAudioWithOpenAI(blob, apiKey);
          const next = appendVoiceTranscript(valueRef.current, text);
          valueRef.current = next;
          onValueChange(next);
        } catch {
          showVoiceFailureMessage();
        } finally {
          setTranscribing(false);
        }
      };

      recorderRef.current = rec;
      rec.start(250);
      setRecording(true);
      setVoiceError(false);
    } catch {
      showVoiceFailureMessage();
    }
  }, [
    onValueChange,
    recording,
    showVoiceFailureMessage,
    stopStream,
    transcribing,
  ]);

  const busy = transcribing;
  const statusLabel = transcribing
    ? "認識中..."
    : voiceError
      ? "音声認識に失敗しました"
      : "";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{
          ...sTextareaBase,
          paddingRight: supported ? 52 : undefined,
          paddingBottom: supported ? 40 : undefined,
          boxSizing: "border-box",
        }}
      />
      {supported && (
        <>
          {statusLabel ? (
            <span
              style={{
                position: "absolute",
                right: 52,
                bottom: 16,
                fontSize: 11,
                color: voiceError ? "#b02020" : "#5a6a5a",
                fontWeight: 600,
                maxWidth: "calc(100% - 64px)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: "none",
              }}
            >
              {statusLabel}
            </span>
          ) : null}
          <button
            type="button"
            title={
              recording
                ? "録音を停止して認識"
                : busy
                  ? "認識中"
                  : "音声で入力"
            }
            disabled={busy}
            onClick={() => {
              void onMicClick();
            }}
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              width: 40,
              height: 40,
              borderRadius: 12,
              border: recording ? "2px solid #b02020" : "2px solid #c8e0cc",
              background: recording ? "#dc3545" : "#fff",
              color: recording ? "#fff" : "#2d5a3d",
              fontSize: 18,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.55 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: recording
                ? "0 2px 8px rgba(220, 53, 69, 0.35)"
                : "0 1px 4px rgba(0,0,0,0.08)",
              fontFamily: "inherit",
              lineHeight: 1,
              flexDirection: "column",
              gap: 0,
              padding: 0,
            }}
          >
            {recording ? (
              <span style={{ fontSize: 10, fontWeight: 800 }}>停止</span>
            ) : (
              <span aria-hidden>🎤</span>
            )}
          </button>
        </>
      )}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={selectLabelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              border:
                value === opt ? "2px solid #2d5a3d" : "2px solid #d8e4d8",
              background: value === opt ? "#2d5a3d" : "transparent",
              color: value === opt ? "#fff" : "#4a5a4a",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildUserPrompt(child, extraPlanPrompt = "") {
  const extra = extraPlanPrompt.trim()
    ? `\n\n【支援計画生成の追加プロンプト】\n${extraPlanPrompt.trim()}`
    : "";
  return `【お子さまの情報】
名前：${child.name}
年齢：${child.age}
障害種別：${child.disability}
重症度：${child.severity}
運動・身体能力のレベル：${child.motorLevel}
コミュニケーションのレベル：${child.communicationLevel}
社会性・対人関係のレベル：${child.socialLevel}
現在の主な課題：${child.currentIssues?.trim() || "（未入力）"}
半年後の目標：${child.goals?.trim() || "（未入力）"}
備考：${child.notes?.trim() || "（未入力）"}

【あなたへの依頼】
上記のお子さまの情報に合わせた、6ヶ月間の個別支援プログラムを日本語で作成してください。
参考として提示した「実際の支援事例」の構成（課題の背景・支援方針・効果的な活動と理由・支援のポイント）を踏まえつつ、入力された重症度・各領域のレベル・課題・目標・備考に沿って具体化してください。
出力は現場で使いやすいよう、見出し（■や##など）を付けた体裁にしてください。月ごとの目標・推奨活動・家庭連携の観点も含めてください。${extra}`;
}

function getAnthropicUrl() {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/anthropic-api/v1/messages`;
  }
  return `${window.location.origin}/api/anthropic`;
}

async function requestProgramFromClaude(child, extraPlanPrompt = "") {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "APIキーが設定されていません。.env に VITE_ANTHROPIC_API_KEY を設定してください。",
    );
  }

  const model = import.meta.env.VITE_ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const userContent = `${REFERENCE_CASE}\n\n${buildUserPrompt(child, extraPlanPrompt)}`;

  const body = {
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: userContent }],
  };

  const res = await fetch(getAnthropicUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(raw.slice(0, 240) || "APIから不正なレスポンスが返りました。");
  }

  if (!res.ok) {
    throw new Error(
      data.error?.message || `APIエラー（${res.status}）`,
    );
  }

  const textBlocks = (data.content ?? []).filter((b) => b.type === "text");
  const text = textBlocks.map((b) => b.text).join("\n").trim();
  if (!text) {
    throw new Error("生成テキストが空でした。モデル名やリクエストを確認してください。");
  }
  return text;
}

export default function App() {
  const [screen, setScreen] = useState("list");
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [editingChildId, setEditingChildId] = useState(null);
  const [editingOriginalName, setEditingOriginalName] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState("");
  const [generatedAtIso, setGeneratedAtIso] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedPrograms, setSavedPrograms] = useState(() => loadSavedPrograms());
  const [selectedSavedChildName, setSelectedSavedChildName] = useState(null);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [supportRecords, setSupportRecords] = useState(() => loadSupportRecords());
  const [recordForm, setRecordForm] = useState({
    date: todayYyyyMmDd(),
    mood: "",
    success: "",
    challenges: "",
    handover: "",
  });
  const [listSearch, setListSearch] = useState("");
  const [listFilter, setListFilter] = useState("all");
  /** 支援計画生成時に API へ渡す追加プロンプト（詳細画面） */
  const [planPromptExtra, setPlanPromptExtra] = useState("");
  const [planFeedbacks, setPlanFeedbacks] = useState(() => loadPlanFeedbacks());
  const [form, setForm] = useState({
    name: "",
    age: "4歳",
    disability: "自閉スペクトラム症",
    severity: "中度",
    motorLevel: "中",
    communicationLevel: "低",
    socialLevel: "低",
    currentIssues: "",
    goals: "",
    notes: "",
  });

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    persistSavedPrograms(savedPrograms);
  }, [savedPrograms]);

  useEffect(() => {
    persistSupportRecords(supportRecords);
  }, [supportRecords]);

  useEffect(() => {
    persistPlanFeedbacks(planFeedbacks);
  }, [planFeedbacks]);

  useEffect(() => {
    if (!printRequested) return;
    const t = setTimeout(() => {
      window.print();
      setPrintRequested(false);
    }, 50);
    return () => clearTimeout(t);
  }, [printRequested]);

  const savedCount = useMemo(() => savedPrograms.length, [savedPrograms.length]);

  const savedGroups = useMemo(() => {
    const groups = new Map();
    for (const p of savedPrograms) {
      const name = p.childName || "（名前なし）";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(p);
    }

    const result = Array.from(groups.entries()).map(([childName, items]) => {
      const sorted = [...items].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
      return {
        childName,
        items: sorted,
        count: sorted.length,
        latestAt: sorted[0]?.createdAt ?? null,
      };
    });

    // 最近保存されたグループ順
    result.sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt)));
    return result;
  }, [savedPrograms]);

  const selectedChildHistory = useMemo(() => {
    if (!selectedSavedChildName) return [];
    const group = savedGroups.find((g) => g.childName === selectedSavedChildName);
    return group?.items ?? [];
  }, [savedGroups, selectedSavedChildName]);

  const selectedSupportRecords = useMemo(() => {
    if (!selectedChild?.name) return [];
    return supportRecords
      .filter((r) => r.childName === selectedChild.name)
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [supportRecords, selectedChild]);

  const currentGenPlanFeedback = useMemo(() => {
    const ck = planFeedbackChildKey(selectedChild);
    if (ck == null || !generatedProgram.trim()) return null;
    return getLatestPlanFeedbackForProgram(
      planFeedbacks,
      ck,
      generatedProgram,
    );
  }, [planFeedbacks, selectedChild, generatedProgram]);

  const recordPlanFeedback = useCallback(
    (rating) => {
      if (!selectedChild || !generatedProgram.trim()) return;
      const ck = planFeedbackChildKey(selectedChild);
      if (ck == null) return;
      if (rating !== "up" && rating !== "down") return;
      const entry = {
        id: `${Date.now()}:${Math.random().toString(16).slice(2)}`,
        childId: ck,
        programText: generatedProgram,
        rating,
        createdAt: new Date().toISOString(),
      };
      setPlanFeedbacks((prev) => [...prev, entry]);
    },
    [selectedChild, generatedProgram],
  );

  const filteredChildren = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return children.filter((child) => {
      if (q && !String(child.name ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (!matchesListDisabilityFilter(child.disability, listFilter)) {
        return false;
      }
      return true;
    });
  }, [children, listSearch, listFilter]);

  const resetChildForm = () => {
    setForm({
      name: "",
      age: "4歳",
      disability: "自閉スペクトラム症",
      severity: "中度",
      motorLevel: "中",
      communicationLevel: "低",
      socialLevel: "低",
      currentIssues: "",
      goals: "",
      notes: "",
    });
    setEditingChildId(null);
    setEditingOriginalName(null);
  };

  const upsertChild = () => {
    if (!form.name) return;
    const nextName = form.name.trim();

    if (editingChildId) {
      const prevName = editingOriginalName;
      setChildren((c) =>
        c.map((child) =>
          child.id === editingChildId
            ? {
                ...child,
                ...form,
                name: nextName,
              }
            : child,
        ),
      );

      // 名前紐づけデータの整合性（保存済みプログラム/支援記録）
      if (prevName && prevName !== nextName) {
        setSavedPrograms((prev) =>
          prev.map((p) =>
            p.childName === prevName ? { ...p, childName: nextName } : p,
          ),
        );
        setSupportRecords((prev) =>
          prev.map((r) =>
            r.childName === prevName ? { ...r, childName: nextName } : r,
          ),
        );
        setSelectedSavedChildName((n) => (n === prevName ? nextName : n));
        setSelectedSaved((p) =>
          p && p.childName === prevName ? { ...p, childName: nextName } : p,
        );
      }

      setSelectedChild((c) =>
        c && c.id === editingChildId ? { ...c, ...form, name: nextName } : c,
      );
      resetChildForm();
      setScreen("detail");
      return;
    }

    setChildren((c) => [
      ...c,
      {
        ...form,
        name: nextName,
        id: Date.now(),
        createdAt: new Date().toLocaleDateString("ja-JP"),
        programs: [],
      },
    ]);
    resetChildForm();
    setScreen("list");
  };

  const handleGenerate = async () => {
    if (!selectedChild) return;
    setError(null);
    setGeneratedProgram("");
    setGeneratedAtIso(null);
    setLoading(true);
    setScreen("program");
    try {
      const text = await requestProgramFromClaude(selectedChild, planPromptExtra);
      setGeneratedProgram(text);
      setGeneratedAtIso(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScreen("detail");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = () => {
    if (!selectedChild) return;
    if (!generatedProgram.trim()) return;
    const createdAt = generatedAtIso || new Date().toISOString();
    const entry = {
      id: `${createdAt}:${Math.random().toString(16).slice(2)}`,
      childName: selectedChild.name,
      childId: selectedChild.id ?? null,
      createdAt,
      createdAtLabel: formatJaDateTime(createdAt),
      programText: generatedProgram,
    };
    setSavedPrograms((prev) => [entry, ...prev]);
  };

  const handleExportProgramPdf = useCallback(async () => {
    if (!selectedChild || !generatedProgram.trim()) return;
    setPdfBusy(true);
    try {
      await mountAndExportSupportPlanPdf({
        name: selectedChild.name,
        age: selectedChild.age,
        disability: selectedChild.disability,
        programText: generatedProgram,
        filenameStem: selectedChild.name,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPdfBusy(false);
    }
  }, [selectedChild, generatedProgram]);

  const handleExportSavedProgramPdf = useCallback(async () => {
    if (!selectedSaved?.programText?.trim()) return;
    setPdfBusy(true);
    try {
      const child =
        children.find((c) => String(c.id) === String(selectedSaved.childId)) ||
        children.find((c) => c.name === selectedSaved.childName);
      const name = selectedSaved.childName;
      await mountAndExportSupportPlanPdf({
        name,
        age: child?.age ?? "—",
        disability: child?.disability ?? "—",
        programText: selectedSaved.programText,
        filenameStem: name,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPdfBusy(false);
    }
  }, [selectedSaved, children]);

  const handlePrint = ({ childName, iso, programText }) => {
    if (!programText?.trim()) return;
    const createdAt = iso || new Date().toISOString();
    setPrintPayload({
      childName,
      dateLabel: formatJaDateTime(createdAt),
      programText,
    });
    setPrintRequested(true);
  };

  const goBack = () => {
    if (loading) return;
    setError(null);
    if (screen === "add") {
      resetChildForm();
      setScreen("list");
      return;
    }
    if (screen === "detail") {
      setScreen("list");
      return;
    }
    if (screen === "program") {
      setScreen("detail");
      return;
    }
    if (screen === "recordAdd") {
      setScreen("detail");
      return;
    }
    if (screen === "savedList") {
      setScreen("list");
      return;
    }
    if (screen === "savedChildHistory") {
      setScreen("savedList");
      return;
    }
    if (screen === "savedProgram") {
      setScreen("savedChildHistory");
      return;
    }
    setScreen("list");
  };

  const s = {
    wrap: {
      minHeight: "100vh",
      background: "#f4f7f4",
      fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif",
    },
    header: {
      background: "#fff",
      borderBottom: "1px solid #e0eae0",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    body: { maxWidth: 560, margin: "0 auto", padding: "20px 16px 60px" },
    card: {
      background: "#fff",
      borderRadius: 14,
      padding: 18,
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      marginBottom: 12,
    },
    label: {
      display: "block",
      fontSize: 10,
      letterSpacing: "0.12em",
      color: "#7a8a7a",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "2px solid #e0eae0",
      fontSize: 14,
      color: "#2a3a2a",
      background: "#fafcfa",
      outline: "none",
      boxSizing: "border-box",
      fontFamily: "inherit",
    },
    textarea: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "2px solid #e0eae0",
      fontSize: 13,
      color: "#2a3a2a",
      background: "#fafcfa",
      outline: "none",
      resize: "none",
      boxSizing: "border-box",
      fontFamily: "inherit",
      lineHeight: 1.6,
    },
    btn: {
      width: "100%",
      padding: "14px",
      borderRadius: 12,
      background: "#2d5a3d",
      color: "#fff",
      border: "none",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "inherit",
    },
    btnGold: {
      width: "100%",
      padding: "14px",
      borderRadius: 12,
      background: "#c4972a",
      color: "#fff",
      border: "none",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "inherit",
    },
    tag: (c) => ({
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background:
        c === "green" ? "#e8f2eb" : c === "gold" ? "#fdf3dc" : "#f0f0f0",
      color: c === "green" ? "#2d5a3d" : c === "gold" ? "#c4972a" : "#666",
    }),
  };

  const supportPlanPrintRow = {
    display: "flex",
    flexFlow: "row wrap",
    gap: 10,
    marginTop: 10,
    alignItems: "stretch",
  };
  const supportPlanRowBtn = (overrides = {}) => ({
    ...s.btn,
    width: "auto",
    flex: "1 1 140px",
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 12,
    background: "transparent",
    color: "#2d5a3d",
    border: "2px solid #c8e0cc",
    boxSizing: "border-box",
    WebkitTapHighlightColor: "transparent",
    ...overrides,
  });

  return (
    <div style={s.wrap} className="app-root">
      <div style={s.header}>
        {screen !== "list" && (
          <button
            type="button"
            onClick={() => {
              goBack();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 18,
              color: "#4a5a4a",
              marginRight: 4,
              opacity: loading ? 0.4 : 1,
            }}
          >
            ←
          </button>
        )}
        <div
          style={{
            width: 32,
            height: 32,
            background: "#2d5a3d",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          🌱
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2a3a2a" }}>
            HaruCare AI
          </div>
          <div style={{ fontSize: 10, color: "#8a9a8a" }}>
            個別発達支援プログラム管理
          </div>
        </div>
        {screen === "list" && (
          <>
            <button
              type="button"
              onClick={() => setScreen("savedList")}
              style={{
                marginLeft: "auto",
                padding: "8px 14px",
                borderRadius: 20,
                background: "transparent",
                color: "#2d5a3d",
                border: "2px solid #c8e0cc",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              保存済み一覧 ({savedCount})
            </button>
            <button
              type="button"
              onClick={() => setScreen("add")}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                background: "#2d5a3d",
                color: "#fff",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ＋ 追加
            </button>
          </>
        )}
      </div>

      <div style={s.body}>
        {screen === "list" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 4,
                }}
              >
                お子さま一覧
              </div>
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="名前で検索"
                style={{ ...s.input, marginBottom: 10 }}
                autoComplete="off"
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  gap: 6,
                  overflowX: "auto",
                  marginBottom: 12,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <button
                  type="button"
                  onClick={() => setListFilter("all")}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 14px",
                    borderRadius: 20,
                    border:
                      listFilter === "all" ? "2px solid #2d5a3d" : "2px solid #d8e4d8",
                    background: listFilter === "all" ? "#2d5a3d" : "#fafcfa",
                    color: listFilter === "all" ? "#fff" : "#4a5a4a",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    boxShadow:
                      listFilter === "all"
                        ? "0 2px 8px rgba(45, 90, 61, 0.25)"
                        : "none",
                  }}
                >
                  全て
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter("autism")}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 14px",
                    borderRadius: 20,
                    border:
                      listFilter === "autism"
                        ? "2px solid #2d5a3d"
                        : "2px solid #d8e4d8",
                    background: listFilter === "autism" ? "#2d5a3d" : "#fafcfa",
                    color: listFilter === "autism" ? "#fff" : "#4a5a4a",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    boxShadow:
                      listFilter === "autism"
                        ? "0 2px 8px rgba(45, 90, 61, 0.25)"
                        : "none",
                  }}
                >
                  自閉症
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter("down")}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 14px",
                    borderRadius: 20,
                    border:
                      listFilter === "down"
                        ? "2px solid #2d5a3d"
                        : "2px solid #d8e4d8",
                    background: listFilter === "down" ? "#2d5a3d" : "#fafcfa",
                    color: listFilter === "down" ? "#fff" : "#4a5a4a",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    boxShadow:
                      listFilter === "down"
                        ? "0 2px 8px rgba(45, 90, 61, 0.25)"
                        : "none",
                  }}
                >
                  ダウン症
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter("developmental")}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 14px",
                    borderRadius: 20,
                    border:
                      listFilter === "developmental"
                        ? "2px solid #2d5a3d"
                        : "2px solid #d8e4d8",
                    background:
                      listFilter === "developmental" ? "#2d5a3d" : "#fafcfa",
                    color: listFilter === "developmental" ? "#fff" : "#4a5a4a",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    boxShadow:
                      listFilter === "developmental"
                        ? "0 2px 8px rgba(45, 90, 61, 0.25)"
                        : "none",
                  }}
                >
                  発達障害
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter("other")}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 14px",
                    borderRadius: 20,
                    border:
                      listFilter === "other"
                        ? "2px solid #2d5a3d"
                        : "2px solid #d8e4d8",
                    background: listFilter === "other" ? "#2d5a3d" : "#fafcfa",
                    color: listFilter === "other" ? "#fff" : "#4a5a4a",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    boxShadow:
                      listFilter === "other"
                        ? "0 2px 8px rgba(45, 90, 61, 0.25)"
                        : "none",
                  }}
                >
                  その他
                </button>
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {children.length}名登録中
                {children.length > 0 &&
                  (listSearch.trim() || listFilter !== "all") && (
                    <>
                      {" "}
                      · {filteredChildren.length}名を表示
                    </>
                  )}
              </div>
            </div>

            {children.length === 0 ? (
              <div style={{ ...s.card, textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#2a3a2a",
                    marginBottom: 6,
                  }}
                >
                  まだ登録がありません
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#7a8a7a",
                    marginBottom: 20,
                  }}
                >
                  右上の「＋ 追加」から登録してください
                </div>
                <button
                  type="button"
                  onClick={() => setScreen("add")}
                  style={{ ...s.btn, width: "auto", padding: "10px 24px" }}
                >
                  登録する
                </button>
              </div>
            ) : filteredChildren.length === 0 ? (
              <div
                style={{
                  ...s.card,
                  textAlign: "center",
                  padding: "32px 20px",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2a3a2a" }}>
                  該当するお子さまが見つかりません
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#7a8a7a",
                    marginTop: 8,
                    lineHeight: 1.6,
                  }}
                >
                  検索語やフィルターを変えてお試しください
                </div>
              </div>
            ) : (
              filteredChildren.map((child) => (
                    <div
                      key={child.id}
                      role="button"
                      tabIndex={0}
                      style={{ ...s.card, cursor: "pointer" }}
                      onClick={() => {
                        setPlanPromptExtra("");
                        setSelectedChild(child);
                        setScreen("detail");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPlanPromptExtra("");
                          setSelectedChild(child);
                          setScreen("detail");
                        }
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12 }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "#e8f2eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                          }}
                        >
                          👦
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#2a3a2a",
                              marginBottom: 4,
                            }}
                          >
                            {child.name}
                          </div>
                          <div
                            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                          >
                            <span style={s.tag("green")}>{child.age}</span>
                            <span style={s.tag("default")}>{child.disability}</span>
                            <span style={s.tag("gold")}>{child.severity}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #f0f0f0",
                          display: "flex",
                          gap: 12,
                        }}
                      >
                        <div style={{ fontSize: 11, color: "#7a8a7a" }}>
                          運動{" "}
                          <span style={{ color: "#2a3a2a", fontWeight: 700 }}>
                            {child.motorLevel}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#7a8a7a" }}>
                          コミュ{" "}
                          <span style={{ color: "#2a3a2a", fontWeight: 700 }}>
                            {child.communicationLevel}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#7a8a7a" }}>
                          社会性{" "}
                          <span style={{ color: "#2a3a2a", fontWeight: 700 }}>
                            {child.socialLevel}
                          </span>
                        </div>
                        <div
                          style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}
                        >
                          {child.createdAt}
                        </div>
                      </div>
                    </div>
                  ))
            )}
          </div>
        )}

        {screen === "add" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 4,
                }}
              >
                {editingChildId ? "お子さま情報を編集" : "お子さまを登録"}
              </div>
            </div>
            <div style={s.card}>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>お子さまの呼び名 *</label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="例：たろうくん"
                  style={s.input}
                />
              </div>
              <SelectField
                label="年齢"
                value={form.age}
                options={AGE_OPTIONS}
                onChange={(v) => handleChange("age", v)}
              />
              <SelectField
                label="障害種別"
                value={form.disability}
                options={DISABILITY_TYPES}
                onChange={(v) => handleChange("disability", v)}
              />
              <SelectField
                label="重症度"
                value={form.severity}
                options={SEVERITY}
                onChange={(v) => handleChange("severity", v)}
              />
            </div>
            <div style={s.card}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#2d5a3d",
                  marginBottom: 14,
                }}
              >
                現在の発達レベル
              </div>
              <SelectField
                label="運動・身体能力"
                value={form.motorLevel}
                options={LEVELS}
                onChange={(v) => handleChange("motorLevel", v)}
              />
              <SelectField
                label="コミュニケーション"
                value={form.communicationLevel}
                options={LEVELS}
                onChange={(v) => handleChange("communicationLevel", v)}
              />
              <SelectField
                label="社会性・対人関係"
                value={form.socialLevel}
                options={LEVELS}
                onChange={(v) => handleChange("socialLevel", v)}
              />
            </div>
            <div style={s.card}>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>現在の主な課題（任意）</label>
                <VoiceAppendTextarea
                  value={form.currentIssues}
                  onValueChange={(next) =>
                    setForm((f) => ({ ...f, currentIssues: next }))
                  }
                  rows={3}
                  placeholder="例：切り替えが難しい"
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>半年後の目標（任意）</label>
                <VoiceAppendTextarea
                  value={form.goals}
                  onValueChange={(next) => setForm((f) => ({ ...f, goals: next }))}
                  rows={3}
                  placeholder="例：友達と遊べるようになってほしい"
                />
              </div>
              <div>
                <label style={s.label}>備考（任意）</label>
                <VoiceAppendTextarea
                  value={form.notes}
                  onValueChange={(next) => setForm((f) => ({ ...f, notes: next }))}
                  rows={2}
                  placeholder="例：感覚過敏あり"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={upsertChild}
              disabled={!form.name}
              style={{ ...s.btn, opacity: form.name ? 1 : 0.5 }}
            >
              {editingChildId ? "更新する" : "登録する"}
            </button>
          </div>
        )}

        {screen === "detail" && selectedChild && (
          <div>
            {error && (
              <div
                style={{
                  ...s.card,
                  background: "#fff5f5",
                  border: "1px solid #f0c0c0",
                  color: "#a03030",
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}
            <div style={{ ...s.card, background: "#2d5a3d", color: "#fff" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                  }}
                >
                  👦
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    {selectedChild.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 2,
                    }}
                  >
                    {selectedChild.age} · {selectedChild.disability} ·{" "}
                    {selectedChild.severity}
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChildId(selectedChild.id);
                      setEditingOriginalName(selectedChild.name);
                      setForm({
                        name: selectedChild.name || "",
                        age: selectedChild.age || "4歳",
                        disability: selectedChild.disability || "自閉スペクトラム症",
                        severity: selectedChild.severity || "中度",
                        motorLevel: selectedChild.motorLevel || "中",
                        communicationLevel:
                          selectedChild.communicationLevel || "低",
                        socialLevel: selectedChild.socialLevel || "低",
                        currentIssues: selectedChild.currentIssues || "",
                        goals: selectedChild.goals || "",
                        notes: selectedChild.notes || "",
                      });
                      setScreen("add");
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.25)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm(
                        `${selectedChild.name} を削除しますか？\n（保存済みプログラム・支援記録も一覧から除外されます）`,
                      );
                      if (!ok) return;
                      const nameToDelete = selectedChild.name;
                      const idToDelete = selectedChild.id;
                      setChildren((c) => c.filter((x) => x.id !== idToDelete));
                      setSavedPrograms((prev) =>
                        prev.filter((p) => p.childName !== nameToDelete),
                      );
                      setSupportRecords((prev) =>
                        prev.filter((r) => r.childName !== nameToDelete),
                      );
                      setSelectedSavedChildName((n) =>
                        n === nameToDelete ? null : n,
                      );
                      setSelectedSaved((p) =>
                        p && p.childName === nameToDelete ? null : p,
                      );
                      setSelectedChild(null);
                      resetChildForm();
                      setScreen("list");
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.25)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "12px 0",
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 2,
                    }}
                  >
                    運動
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {selectedChild.motorLevel}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 2,
                    }}
                  >
                    コミュ
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {selectedChild.communicationLevel}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 2,
                    }}
                  >
                    社会性
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {selectedChild.socialLevel}
                  </div>
                </div>
              </div>
            </div>
            {selectedChild.currentIssues && (
              <div style={s.card}>
                <label style={s.label}>現在の課題</label>
                <div style={{ fontSize: 13, color: "#2a3a2a", lineHeight: 1.6 }}>
                  {selectedChild.currentIssues}
                </div>
              </div>
            )}
            {selectedChild.goals && (
              <div style={s.card}>
                <label style={s.label}>半年後の目標</label>
                <div style={{ fontSize: 13, color: "#2a3a2a", lineHeight: 1.6 }}>
                  {selectedChild.goals}
                </div>
              </div>
            )}
            {selectedChild.notes && (
              <div style={s.card}>
                <label style={s.label}>備考</label>
                <div style={{ fontSize: 13, color: "#2a3a2a", lineHeight: 1.6 }}>
                  {selectedChild.notes}
                </div>
              </div>
            )}

            <div style={s.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#2d5a3d" }}>
                  支援記録
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecordForm({
                      date: todayYyyyMmDd(),
                      mood: "",
                      success: "",
                      challenges: "",
                      handover: "",
                    });
                    setScreen("recordAdd");
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "transparent",
                    color: "#2d5a3d",
                    border: "2px solid #c8e0cc",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  支援記録を追加
                </button>
              </div>

              {selectedSupportRecords.length === 0 ? (
                <div style={{ fontSize: 12, color: "#7a8a7a", lineHeight: 1.6 }}>
                  まだ記録がありません。右上の「支援記録を追加」から追加できます。
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedSupportRecords.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        border: "1px solid #e0eae0",
                        borderRadius: 12,
                        padding: "12px 12px",
                        background: "#fafcfa",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#2a3a2a" }}>
                        {formatJaDate(r.date)}
                      </div>
                      {r.mood && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#2a3a2a", lineHeight: 1.6 }}>
                          <span style={{ color: "#7a8a7a" }}>今日の様子：</span>
                          {r.mood}
                        </div>
                      )}
                      {r.success && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#2a3a2a", lineHeight: 1.6 }}>
                          <span style={{ color: "#7a8a7a" }}>できたこと：</span>
                          {r.success}
                        </div>
                      )}
                      {r.challenges && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#2a3a2a", lineHeight: 1.6 }}>
                          <span style={{ color: "#7a8a7a" }}>課題：</span>
                          {r.challenges}
                        </div>
                      )}
                      {r.handover && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#2a3a2a", lineHeight: 1.6 }}>
                          <span style={{ color: "#7a8a7a" }}>次回への申し送り：</span>
                          {r.handover}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.card}>
              <label style={s.label}>支援計画生成の追加プロンプト（任意）</label>
              <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 8, lineHeight: 1.5 }}>
                生成時に AI へ伝えたい指示や現場の文脈を追記できます（音声入力可）
              </div>
              <VoiceAppendTextarea
                value={planPromptExtra}
                onValueChange={setPlanPromptExtra}
                rows={4}
                placeholder="例：来年度の入園に向けて生活リズムを整えたい、など"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                ...s.btnGold,
                opacity: loading ? 0.65 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              🌿 6ヶ月プログラムを生成する
            </button>
          </div>
        )}

        {screen === "recordAdd" && selectedChild && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 4,
                }}
              >
                支援記録を追加
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {selectedChild.name}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>日付</label>
                <input
                  type="date"
                  value={recordForm.date}
                  onChange={(e) =>
                    setRecordForm((f) => ({ ...f, date: e.target.value }))
                  }
                  style={s.input}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>今日の様子</label>
                <textarea
                  value={recordForm.mood}
                  onChange={(e) =>
                    setRecordForm((f) => ({ ...f, mood: e.target.value }))
                  }
                  rows={3}
                  placeholder="例：落ち着いて参加できた／眠そうだった など"
                  style={s.textarea}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>できたこと</label>
                <textarea
                  value={recordForm.success}
                  onChange={(e) =>
                    setRecordForm((f) => ({ ...f, success: e.target.value }))
                  }
                  rows={3}
                  placeholder="例：平均台を最後まで渡れた など"
                  style={s.textarea}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>課題</label>
                <textarea
                  value={recordForm.challenges}
                  onChange={(e) =>
                    setRecordForm((f) => ({ ...f, challenges: e.target.value }))
                  }
                  rows={3}
                  placeholder="例：切り替えに時間がかかった など"
                  style={s.textarea}
                />
              </div>
              <div>
                <label style={s.label}>次回への申し送り</label>
                <textarea
                  value={recordForm.handover}
                  onChange={(e) =>
                    setRecordForm((f) => ({ ...f, handover: e.target.value }))
                  }
                  rows={3}
                  placeholder="例：視覚提示を同じ位置で統一する など"
                  style={s.textarea}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const date = recordForm.date || todayYyyyMmDd();
                const createdAt = new Date().toISOString();
                const entry = {
                  id: `${createdAt}:${Math.random().toString(16).slice(2)}`,
                  childName: selectedChild.name,
                  date,
                  createdAt,
                  mood: recordForm.mood.trim(),
                  success: recordForm.success.trim(),
                  challenges: recordForm.challenges.trim(),
                  handover: recordForm.handover.trim(),
                };
                setSupportRecords((prev) => [entry, ...prev]);
                setScreen("detail");
              }}
              style={s.btn}
            >
              保存する
            </button>
          </div>
        )}

        {screen === "program" && selectedChild && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 2,
                }}
              >
                {selectedChild.name}の個別支援プログラム
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {selectedChild.age} · {selectedChild.disability}
              </div>
            </div>
            {loading ? (
              <div
                style={{
                  ...s.card,
                  textAlign: "center",
                  padding: "48px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#2d5a3d",
                }}
              >
                プログラムを生成中...
              </div>
            ) : (
              <>
                <div style={{ ...s.card, fontSize: 13, color: "#2a3a2a" }}>
                  <ProgramMarkdown text={generatedProgram} />
                </div>
                <button
                  type="button"
                  onClick={handleSaveProgram}
                  disabled={!generatedProgram.trim()}
                  style={{
                    ...s.btn,
                    background: "#2d5a3d",
                    opacity: generatedProgram.trim() ? 1 : 0.5,
                    marginTop: 10,
                  }}
                >
                  保存する
                </button>
                <div style={supportPlanPrintRow}>
                  <button
                    type="button"
                    onClick={() =>
                      handlePrint({
                        childName: selectedChild.name,
                        iso: generatedAtIso,
                        programText: generatedProgram,
                      })
                    }
                    disabled={!generatedProgram.trim()}
                    style={supportPlanRowBtn({
                      opacity: generatedProgram.trim() ? 1 : 0.5,
                      cursor: !generatedProgram.trim()
                        ? "not-allowed"
                        : "pointer",
                    })}
                  >
                    印刷する
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleExportProgramPdf();
                    }}
                    disabled={!generatedProgram.trim() || pdfBusy}
                    aria-busy={pdfBusy}
                    style={supportPlanRowBtn({
                      opacity:
                        generatedProgram.trim() && !pdfBusy ? 1 : 0.5,
                      cursor:
                        !generatedProgram.trim() || pdfBusy
                          ? "not-allowed"
                          : "pointer",
                    })}
                  >
                    {pdfBusy ? "作成中…" : "PDFダウンロード"}
                  </button>
                </div>
                <div
                  style={{
                    ...s.card,
                    marginTop: 10,
                    paddingTop: 14,
                    paddingBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#2a3a2a",
                      marginBottom: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    この支援計画はいかがでしたか？
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexFlow: "row wrap",
                      gap: 10,
                      alignItems: "stretch",
                    }}
                  >
                    <button
                      type="button"
                      aria-label="役に立った"
                      aria-pressed={
                        currentGenPlanFeedback?.rating === "up"
                      }
                      disabled={!generatedProgram.trim()}
                      onClick={() => recordPlanFeedback("up")}
                      style={{
                        flex: "1 1 120px",
                        minHeight: 48,
                        borderRadius: 12,
                        border:
                          currentGenPlanFeedback?.rating === "up"
                            ? "2px solid #2d5a3d"
                            : "2px solid #d8e4d8",
                        background:
                          currentGenPlanFeedback?.rating === "up"
                            ? "#e8f2eb"
                            : "#fff",
                        cursor: generatedProgram.trim()
                          ? "pointer"
                          : "not-allowed",
                        opacity: generatedProgram.trim() ? 1 : 0.45,
                        fontFamily: "inherit",
                        fontSize: 26,
                        lineHeight: 1,
                        padding: "10px 12px",
                        boxShadow:
                          currentGenPlanFeedback?.rating === "up"
                            ? "0 2px 8px rgba(45, 90, 61, 0.2)"
                            : "0 1px 4px rgba(0,0,0,0.06)",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      aria-label="役に立たなかった"
                      aria-pressed={
                        currentGenPlanFeedback?.rating === "down"
                      }
                      disabled={!generatedProgram.trim()}
                      onClick={() => recordPlanFeedback("down")}
                      style={{
                        flex: "1 1 120px",
                        minHeight: 48,
                        borderRadius: 12,
                        border:
                          currentGenPlanFeedback?.rating === "down"
                            ? "2px solid #2d5a3d"
                            : "2px solid #d8e4d8",
                        background:
                          currentGenPlanFeedback?.rating === "down"
                            ? "#e8f2eb"
                            : "#fff",
                        cursor: generatedProgram.trim()
                          ? "pointer"
                          : "not-allowed",
                        opacity: generatedProgram.trim() ? 1 : 0.45,
                        fontFamily: "inherit",
                        fontSize: 26,
                        lineHeight: 1,
                        padding: "10px 12px",
                        boxShadow:
                          currentGenPlanFeedback?.rating === "down"
                            ? "0 2px 8px rgba(45, 90, 61, 0.2)"
                            : "0 1px 4px rgba(0,0,0,0.06)",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      👎
                    </button>
                  </div>
                  {currentGenPlanFeedback ? (
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#2d5a3d",
                        lineHeight: 1.55,
                      }}
                    >
                      {currentGenPlanFeedback.rating === "up"
                        ? "フィードバックありがとうございます！"
                        : "フィードバックありがとうございます！改善に活用します"}
                    </div>
                  ) : null}
                </div>
              </>
            )}
            {!loading && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "#f0f7f2",
                  border: "1px solid #c8e0cc",
                  fontSize: 12,
                  color: "#4a7a5a",
                  lineHeight: 1.6,
                  marginTop: 4,
                }}
              >
                ⚠️ このプログラムはAIによる提案です。専門家の判断を組み合わせてご活用ください。
              </div>
            )}
          </div>
        )}

        {screen === "savedList" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 4,
                }}
              >
                保存済み一覧
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {savedPrograms.length}件
              </div>
            </div>

            {savedPrograms.length === 0 ? (
              <div style={{ ...s.card, textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>📁</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#2a3a2a",
                    marginBottom: 6,
                  }}
                >
                  まだ保存がありません
                </div>
                <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                  生成後に「保存する」を押すと、ここから見返せます
                </div>
              </div>
            ) : (
              savedGroups.map((g) => (
                <div
                  key={g.childName}
                  role="button"
                  tabIndex={0}
                  style={{ ...s.card, cursor: "pointer" }}
                  onClick={() => {
                    setSelectedSavedChildName(g.childName);
                    setSelectedSaved(null);
                    setScreen("savedChildHistory");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSavedChildName(g.childName);
                      setSelectedSaved(null);
                      setScreen("savedChildHistory");
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: "#f0f7f2",
                        border: "1px solid #c8e0cc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      📄
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#2a3a2a" }}>
                        {g.childName}
                      </div>
                      <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 2 }}>
                        {g.latestAt ? `${formatJaDateTime(g.latestAt)} · ${g.count}件` : `${g.count}件`}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {screen === "savedChildHistory" && selectedSavedChildName && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 4,
                }}
              >
                {selectedSavedChildName}の履歴
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {selectedChildHistory.length}件（新しい順）
              </div>
            </div>

            {selectedChildHistory.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                style={{ ...s.card, cursor: "pointer" }}
                onClick={() => {
                  setSelectedSaved(p);
                  setScreen("savedProgram");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedSaved(p);
                    setScreen("savedProgram");
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "#f0f7f2",
                      border: "1px solid #c8e0cc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    🗓️
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2a3a2a" }}>
                      {p.createdAtLabel || formatJaDateTime(p.createdAt)}
                    </div>
                    <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 2 }}>
                      タップして詳細
                    </div>
                  </div>
                  <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "savedProgram" && selectedSaved && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#2a3a2a",
                  marginBottom: 2,
                }}
              >
                {selectedSaved.childName}の保存済みプログラム
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {selectedSaved.createdAtLabel || formatJaDateTime(selectedSaved.createdAt)}
              </div>
            </div>
            <div style={{ ...s.card, fontSize: 13, color: "#2a3a2a" }}>
              <ProgramMarkdown text={selectedSaved.programText} />
            </div>
            <div style={supportPlanPrintRow}>
              <button
                type="button"
                onClick={() =>
                  handlePrint({
                    childName: selectedSaved.childName,
                    iso: selectedSaved.createdAt,
                    programText: selectedSaved.programText,
                  })
                }
                style={supportPlanRowBtn()}
              >
                印刷する
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExportSavedProgramPdf();
                }}
                disabled={pdfBusy}
                aria-busy={pdfBusy}
                style={supportPlanRowBtn({
                  opacity: pdfBusy ? 0.5 : 1,
                  cursor: pdfBusy ? "not-allowed" : "pointer",
                })}
              >
                {pdfBusy ? "作成中…" : "PDFダウンロード"}
              </button>
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#f0f7f2",
                border: "1px solid #c8e0cc",
                fontSize: 12,
                color: "#4a7a5a",
                lineHeight: 1.6,
                marginTop: 4,
              }}
            >
              ⚠️ このプログラムはAIによる提案です。専門家の判断を組み合わせてご活用ください。
            </div>
          </div>
        )}
      </div>

      {/* 印刷専用（@media print でこの領域だけ表示） */}
      <div className="print-area" aria-hidden="true">
        {printPayload && (
          <div className="print-page">
            <div className="print-header">
              <div className="print-title">
                {printPayload.childName}の個別支援プログラム
              </div>
              <div className="print-sub">{printPayload.dateLabel}</div>
            </div>
            <div className="print-body">
              <ProgramMarkdown text={printPayload.programText} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
