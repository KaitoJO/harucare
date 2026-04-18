import { useState } from "react";

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

const REFERENCE_CASE = `【実際の支援事例】
障害：発達遅滞
課題の背景：体幹・姿勢保持の弱さ、注意機能の未成熟、視覚的見通し不足、手指協調運動の未発達
支援方針：粗大運動で身体安定性を高める→視覚的支援で見通し提示→手指操作の基礎づくり
効果的な活動：バランス遊び・トンネルくぐり・平均台（理由：体幹強化）、シール貼り・型はめ・パズル（理由：手指協調）
支援のポイント：動作を短く区切る、視覚提示は常に同じ位置・形式、短時間で完了できる課題から始める、成功したらすぐほめる`;

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

const selectLabelStyle = {
  display: "block",
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "#7a8a7a",
  marginBottom: 6,
  textTransform: "uppercase",
};

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

function buildUserPrompt(child) {
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
出力は現場で使いやすいよう、見出し（■や##など）を付けた体裁にしてください。月ごとの目標・推奨活動・家庭連携の観点も含めてください。`;
}

function getAnthropicUrl() {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/anthropic-api/v1/messages`;
  }
  return `${window.location.origin}/api/anthropic`;
}

async function requestProgramFromClaude(child) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "APIキーが設定されていません。.env に VITE_ANTHROPIC_API_KEY を設定してください。",
    );
  }

  const model = import.meta.env.VITE_ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const userContent = `${REFERENCE_CASE}\n\n${buildUserPrompt(child)}`;

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
  const [generatedProgram, setGeneratedProgram] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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

  const saveChild = () => {
    if (!form.name) return;
    setChildren((c) => [
      ...c,
      {
        ...form,
        id: Date.now(),
        createdAt: new Date().toLocaleDateString("ja-JP"),
        programs: [],
      },
    ]);
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
    setScreen("list");
  };

  const handleGenerate = async () => {
    if (!selectedChild) return;
    setError(null);
    setGeneratedProgram("");
    setLoading(true);
    setScreen("program");
    try {
      const text = await requestProgramFromClaude(selectedChild);
      setGeneratedProgram(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScreen("detail");
    } finally {
      setLoading(false);
    }
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

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        {screen !== "list" && (
          <button
            type="button"
            onClick={() => {
              if (loading) return;
              setScreen(screen === "program" ? "detail" : "list");
              setGeneratedProgram("");
              setError(null);
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
          <button
            type="button"
            onClick={() => setScreen("add")}
            style={{
              marginLeft: "auto",
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
        )}
      </div>

      <div style={s.body}>
        {screen === "list" && (
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
                お子さま一覧
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>
                {children.length}名登録中
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
            ) : (
              children.map((child) => (
                <div
                  key={child.id}
                  role="button"
                  tabIndex={0}
                  style={{ ...s.card, cursor: "pointer" }}
                  onClick={() => {
                    setSelectedChild(child);
                    setScreen("detail");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedChild(child);
                      setScreen("detail");
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                    <div style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>
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
                お子さまを登録
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
                <textarea
                  value={form.currentIssues}
                  onChange={(e) => handleChange("currentIssues", e.target.value)}
                  placeholder="例：切り替えが難しい"
                  rows={3}
                  style={s.textarea}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>半年後の目標（任意）</label>
                <textarea
                  value={form.goals}
                  onChange={(e) => handleChange("goals", e.target.value)}
                  placeholder="例：友達と遊べるようになってほしい"
                  rows={3}
                  style={s.textarea}
                />
              </div>
              <div>
                <label style={s.label}>備考（任意）</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="例：感覚過敏あり"
                  rows={2}
                  style={s.textarea}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={saveChild}
              disabled={!form.name}
              style={{ ...s.btn, opacity: form.name ? 1 : 0.5 }}
            >
              登録する
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
              <div
                style={{
                  ...s.card,
                  fontSize: 13,
                  lineHeight: 2,
                  color: "#2a3a2a",
                  whiteSpace: "pre-wrap",
                }}
              >
                {generatedProgram}
              </div>
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
      </div>
    </div>
  );
}
