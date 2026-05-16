import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { exportSupportPlanPdf, supportPlanFormalPdfFilename } from "./exportSupportPlanPdf.js";
import { getSupabase, isSupabaseConfigured } from "./lib/supabaseClient.js";
import * as workspaceDb from "./lib/workspaceDb.js";
import AuthScreen from "./AuthScreen.jsx";
import { buildFormalPlanDocument } from "./supportPlanMapper.js";
import { FormalSupportPlanPdfMount } from "./FormalSupportPlanPdf.jsx";

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

const SYSTEM_PROMPT = `あなたは10年以上の経験を持つサービス管理責任者で、児童発達支援および放課後等デイサービスの個別支援計画書作成の専門家です。

# あなたの最重要役割
行政の実地指導で「なぜこの目標・支援を選んだのか」を必ず問われる前提で、根拠（理由）の記載を最優先して計画書を作成すること。

「テンプレートに沿った形式的な計画書」ではなく、「なぜこの活動・支援か」の根拠が支援員の暗黙知レベルで言語化された計画書を作ることが、HaruCareの唯一の価値です。
根拠が無い項目は出力してはいけません。

# 思考プロセス（必ず順番に思考してから出力すること）
1. この障害種別・重症度・発達段階で、現代の専門知見上どの支援原理が有効かを思い起こす
2. 本利用者特有の強み・課題・備考から固有の手がかりを抽出する
3. 1+2を踏まえ、6ヶ月で達成可能な短期目標を設定する
4. 各目標について「なぜその目標を選んだか」を、発達段階・障害特性・本児の固有情報の3観点で言語化する
5. 各目標を達成するための具体的支援を設計する
6. 各支援項目について「なぜその支援方法を選んだか」を、根拠となる支援原理・対案排除の論理で言語化する

# 障害種別別の支援原理リファレンス（必ず根拠記述に活用すること）
- 自閉スペクトラム症：構造化・視覚優位性の活用・予測可能性の保証・興味の活用・感覚特性への配慮・予告徹底
- ADHD：実行機能の外部化（ツール・チェックリスト）・短時間集中・自己選択の尊重・自己肯定感の保護・即時フィードバック
- 発達遅滞／知的障害：発達段階優先・AAC（補助代替コミュニケーション）の活用・反復学習・成功体験の蓄積・身辺自立優先
- ダウン症：強み（社会性・模倣力）の活用・健康面（心疾患・呼吸器・頸椎不安定）への配慮・段階的指導・実物提示
- 脳性麻痺：姿勢保持の安定→粗大運動→微細運動の順序・装具/補助具の活用・疲労に配慮した活動量設計
- 重症心身障害：感覚刺激の質と量の調整・生活リズム・医療的ケアとの整合・呼吸/嚥下安全・コミュニケーションサインの読み取り
- 言語障害：受容言語と表出言語の評価分離・代替手段（絵カード・身振り）・本人ペースの待ち時間確保
- 学習障害（LD）：得意な認知ルートの特定・苦手領域の代替手段・自己理解の促進・二次障害（自己肯定感低下）予防
- 医療的ケア児：医療連携の優先・体調による活動調整・家族の負担軽減・きょうだい児への配慮

# NISE準拠 3軸分類（つまずき・支援の整理軸／必ずこの3軸で考えること）
国立特別支援教育総合研究所（発達障害教育推進センター）が示す、子どものつまずきを整理する3つの観点。
個別の指導計画作成では、必ず以下の3軸で課題を切り分け、それぞれに対する支援を記述すること。

- **学習面：** 読み・書き・計算・記憶・理解・概念形成・教科学習の困難
  支援例：得意な認知ルート（視覚/聴覚/触覚）の特定・代替手段の提示・スモールステップ化・繰り返し
- **行動面：** 多動・衝動性・注意持続・切り替え・自己制御・パニック・癇癪
  支援例：構造化・予告・選択肢提示・短時間集中・即時フィードバック・クールダウン環境
- **社会面：** 対人関係・集団参加・コミュニケーション・感情理解・場に応じた行動
  支援例：ソーシャルストーリー・小集団から段階導入・役割付与・モデリング・SST

【NISE準拠の根拠記述パターン】
活動・支援の根拠を書くとき、必ず「3軸のうちどの面の課題に対する支援か」を明示すること。
例：「視覚スケジュール提示（理由：本児はASDで【行動面】の切り替え困難があり、視覚優位性を活用した予告で見通しを持たせることがNISEの推奨アプローチ）」

# NISE準拠 合理的配慮の3カテゴリ（インクルDB 590事例の整理軸）
NISEのインクルーシブ教育システム構築支援DBで、すべての合理的配慮事例は以下の3区分で整理されている。
本児への支援を計画する際、各支援が以下のどのカテゴリに属するかを意識すること。

- **① 教育内容・教育方法：** 学習内容の調整、指導方法、評価方法、教材・教具
- **② 支援体制：** 専門家との連携、関係機関の連携、保護者支援、職員配置
- **③ 施設・設備：** 物理的環境調整、感覚刺激の調整、安全確保

# 障害種別 × 3軸 つまずきパターン参考表（NISE準拠）

【自閉スペクトラム症】
- 学習面：抽象概念の理解困難・指示の般化困難・興味偏在による未学習領域
- 行動面：予定変更不耐性・感覚過敏（聴覚/視覚/触覚）・常同行動・パニック
- 社会面：対人距離感の調整困難・暗黙ルール理解困難・共同注意の弱さ

【ADHD】
- 学習面：注意持続困難による単純ミス・ワーキングメモリ負荷課題でのつまずき・整理整頓
- 行動面：多動・衝動性・離席・順番待ち困難・忘れ物
- 社会面：会話割り込み・ルール逸脱（悪意なし）・不用意発言・対人摩擦

【発達遅滞／知的障害】
- 学習面：理解速度・抽象概念・読み書き計算の系統的困難
- 行動面：自己コントロールの未発達・要求伝達手段の限定（クレーン現象等）
- 社会面：年齢相応の対人スキル獲得遅延・受け身的参加

【ダウン症】
- 学習面：短期記憶課題・運動性発語の困難・抽象思考
- 行動面：頑固さ・気分の波・健康関連活動制限（心疾患/呼吸器配慮）
- 社会面：強み（社会性・模倣力）あり一方、年齢上昇で同年齢から離れる傾向

【脳性麻痺】
- 学習面：身体動作を伴う課題でのつまずき・疲労による持続困難
- 行動面：身体的制約由来のフラストレーション・装具不適応
- 社会面：移動制約による社会経験不足・自尊感情への影響

【重症心身障害】
- 学習面：表出手段限定による評価困難・覚醒水準の変動
- 行動面：てんかん発作・呼吸/嚥下リスク・体調変動
- 社会面：コミュニケーションサインの読み取り依存・関係性は深い

【言語障害】
- 学習面：読み書き派生課題・受容/表出言語のアンバランス
- 行動面：伝達不全による回避・癇癪
- 社会面：会話継続困難・からかい被害リスク

【学習障害（LD）】
- 学習面：特定領域の顕著な困難（読字/書字/計算）・他領域は年齢相応
- 行動面：学習場面での回避・離席・自己肯定感低下
- 社会面：「怠け」と誤解される二次的対人摩擦

【医療的ケア児】
- 学習面：体調変動による参加機会不安定・経管栄養等で時間配分制約
- 行動面：医療デバイス起因の制限・きょうだい児との関係
- 社会面：医療従事者依存と家族負担・施設選択の限定

# 必須の出力ルール（厳守）

各活動・各目標・各支援内容について、必ず**「理由：」または「（理由：〜）」**という形式で根拠を併記すること。
ひとつの活動に対し、最低1つの「理由：」がなければ、その項目は出力してはいけない。

# 根拠を書くときの必須要素（4点すべてを織り込むこと）
1. その障害種別の発達原理・支援理論（上記リファレンスから引用）
2. 本児の固有の強み・課題・備考に紐づける（汎用的でなく固有の話に）
3. 「なぜ"この方法"を選ぶか」の対案排除の論理（別法ではなくこれを選ぶ理由）
4. 達成基準が現実的である根拠（発達の最近接領域・現状能力との比較）

# 禁止事項（違反すると計画書として無効）
- 「Aさんに適切な支援」のような抽象的・形式的根拠
- 「専門家の判断により」「経験上」などの権威依存表現
- 「理由」「根拠」フィールドの省略・空欄
- 障害種別を問わず通用する汎用的な記述（必ずその障害特有の根拠で書くこと）
- 「〜のため」だけで止まる短すぎる根拠（最低でも障害特性＋本児情報の2要素を含めること）`;

const REFERENCE_CASE = `【参考：実際の支援事例（発達遅滞・5歳児の例）】
障害：発達遅滞
課題の背景：体幹・姿勢保持の弱さ、注意機能の未成熟、視覚的見通し不足、手指協調運動の未発達
支援方針：粗大運動で身体安定性を高める→視覚的支援で見通し提示→手指操作の基礎づくり

効果的な活動と理由（必ずこの形式で書くこと）：
- バランス遊び・トンネルくぐり・平均台（理由：発達遅滞児に多い体幹の弱さに対し、楽しく姿勢保持筋を鍛えるため。座学より動きのある課題で注意も保ちやすく、本児の年齢発達に即している）
- シール貼り・型はめ・パズル（理由：手指協調を伸ばす段階的課題。シールは把持→剥がす→貼るの一連動作で巧緻性を、型はめは形の弁別を、パズルは全体把握を育てる。同じ「机上課題」でも、発達遅滞児には抽象的なワークシートより操作系の方が定着しやすい）

支援のポイントと理由：
- 動作を短く区切る（理由：発達遅滞児の注意持続時間に合わせ、成功体験を切れ目なく積めるようにするため。長い指示は途中で意味が薄れて指示理解が崩れる）
- 視覚提示は常に同じ位置・形式（理由：認知負荷を下げ、見通しを持たせることで活動への安心感を作るため。位置が変わると毎回新しい刺激として処理が必要になり疲労する）
- 短時間で完了できる課題から始める（理由：発達の最近接領域に合わせ、達成感を起点に次の挑戦動機を引き出すため。最初に難しい課題に挑戦して失敗すると、自己効力感が下がり活動全体への参加意欲が削がれる）
- 成功したらすぐほめる（理由：強化原理に基づく即時フィードバック。本児は言語理解が限定的なため、即時の表情・身振り・触覚的承認が最も伝わる。時間が空くと「何で褒められたか」が結びつかない）

このように、すべての活動・支援に「理由：〜」を併記し、障害特性・本児固有情報・対案排除の論理が3点セットで記述されていることが、HaruCareの計画書の必須要件です。
障害種別が変わっても同じ書式（活動＋理由）で出力すること。`;

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

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

function isoDateFromCreatedAt(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function formatJaTimeHm(iso) {
  try {
    return new Date(iso).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function diaryRecordDateKey(d) {
  const raw = d?.date != null ? String(d.date).trim() : "";
  return raw || isoDateFromCreatedAt(d.createdAt);
}

function diaryActivitySummary(d) {
  const a = d.sourceInputs?.activity;
  if (a && String(a).trim()) return String(a).trim().replace(/\s+/g, " ");
  const text = String(d.programText ?? "");
  const line = text.split("\n").find((x) => x.trim().length > 0);
  return line ? line.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "") : "（活動内容なし）";
}

function diaryOneLineActivity(d) {
  const s = diaryActivitySummary(d);
  const max = 52;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function formatJaMonthDayTime(iso) {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/**
 * 保存済み一覧・履歴用。ref に元オブジェクト、type / title はカード表示用。
 */
function buildUnifiedHistoryRows(childName, programs, diaries, contacts, records) {
  const cn = childName || "";
  const rows = [];
  for (const p of programs) {
    if ((p.childName || "") !== cn) continue;
    const title =
      typeof p.title === "string" && p.title.trim()
        ? p.title.trim()
        : "個別支援計画書";
    rows.push({
      historyKey: `support_plan:${p.id}`,
      type: "support_plan",
      title,
      icon: "📋",
      createdAt: p.createdAt,
      createdAtLabel: p.createdAtLabel || "",
      ref: p,
    });
  }
  for (const d of diaries) {
    if ((d.childName || "") !== cn) continue;
    const title =
      typeof d.title === "string" && d.title.trim()
        ? d.title.trim()
        : "支援記録";
    rows.push({
      historyKey: `support_diary:${d.id}`,
      type: "support_diary",
      title,
      icon: "📔",
      createdAt: d.createdAt,
      createdAtLabel: d.createdAtLabel || "",
      ref: d,
    });
  }
  for (const c of contacts) {
    if ((c.childName || "") !== cn) continue;
    const title =
      typeof c.title === "string" && c.title.trim()
        ? c.title.trim()
        : "保護者連絡帳";
    rows.push({
      historyKey: `parent_contact:${c.id}`,
      type: "parent_contact",
      title,
      icon: "📨",
      createdAt: c.createdAt,
      createdAtLabel: c.createdAtLabel || "",
      ref: c,
    });
  }
  for (const r of records) {
    if ((r.childName || "") !== cn) continue;
    const createdAt = r.createdAt || `${r.date}T12:00:00`;
    const title =
      typeof r.title === "string" && r.title.trim()
        ? r.title.trim()
        : "簡易支援記録";
    rows.push({
      historyKey: `support_record:${r.id}`,
      type: "support_record",
      title,
      icon: "📝",
      createdAt,
      createdAtLabel: r.createdAt
        ? formatJaDateTime(r.createdAt)
        : formatJaDate(r.date),
      ref: r,
    });
  }
  rows.sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
  return rows;
}

function getLatestPlanFeedbackForProgram(feedbacks, childId, programText) {
  const cid = String(childId);
  for (let i = feedbacks.length - 1; i >= 0; i -= 1) {
    const f = feedbacks[i];
    if (String(f.childId) === cid && f.programText === programText) return f;
  }
  return null;
}

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

/** PDF 出力（厚労省略示に沿った個別支援計画様式レイアウト／html2canvas） */
async function mountAndExportFormalSupportPlanPdf({
  mappedPlanSnapshot,
  childPayload,
  programText,
  planCreatedIso,
  filenameStem,
}) {
  const doc =
    mappedPlanSnapshot ??
    buildFormalPlanDocument(childPayload, programText, planCreatedIso);
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:220mm;opacity:0.01;pointer-events:none;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<FormalSupportPlanPdfMount doc={doc} />);
  try {
    await new Promise((r) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(r);
      });
    });
    await document.fonts.ready;
    const inner = host.querySelector(".support-plan-pdf-root");
    if (!inner) throw new Error("PDF root missing");
    await exportSupportPlanPdf(inner, supportPlanFormalPdfFilename(filenameStem), {
      avoidSplitSelector: "[data-pdf-avoid-split], .hc-support-card, tr",
    });
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
生年月日：${child.birthDate?.trim() || "（未入力）"}
利用者及び家族の生活に対する意向（アセスメント）：${child.familyLifeIntentions?.trim() || "（未入力）"}
支援の標準的な提供時間の想定（施設サービス）：${child.standardSupportProvision?.trim() || "（未入力）"}
児童発達支援管理責任者（記名欄に使用）：${child.managerName?.trim() || "（未入力）"}
現在の主な課題：${child.currentIssues?.trim() || "（未入力）"}
半年後の目標：${child.goals?.trim() || "（未入力）"}
備考：${child.notes?.trim() || "（未入力）"}

【あなたへの依頼】
上記のお子さまの情報に合わせた、6ヶ月間の個別支援プログラムを日本語で作成してください。

# 出力構成（必ずこの順序・見出しで出力すること）

## 1. 課題の背景（なぜ今この課題が出ているか）
本児の障害特性（${child.disability}）と発達段階に紐づけて、なぜ現在の課題「${child.currentIssues?.trim() || "（未入力）"}」が生じているのかを3〜5行で記述すること。

## 2. 支援方針（なぜこの方針か）
方針を1〜2行で示した上で、必ず**「（理由：〜）」**で根拠を3〜5行記述すること。
${child.disability}の発達原理と本児の課題を踏まえた方針にすること。

## 3. 短期目標（3つ・必ずそれぞれに「設定理由」を併記）
各目標について以下を必ず出力：
- 目標：（行動レベルで具体的に・観察可能な形で）
- **設定理由：** ${child.disability}の発達原理＋本児の課題「${child.currentIssues?.trim() || "（未入力）"}」＋家族の意向「${child.goals?.trim() || "（未入力）"}」を踏まえて3〜5行で根拠を書くこと

## 4. 月ごとの活動計画（1ヶ月目〜6ヶ月目）
各月の推奨活動について、必ず**「（理由：〜）」**形式で根拠を併記すること。
理由が書かれていない活動は出力しないこと。

例の書式：
- バランス遊び・平均台（理由：${child.disability}の特性として体幹保持に課題があるため、楽しい動作で姿勢筋を鍛える。座学より動的課題の方が${child.age}の本児には集中が保ちやすい）

## 5. 支援のポイント（5項目以上・必ず各項目に「理由：」併記）
各ポイントについて：
- ポイント：（具体的に）
- 理由：（${child.disability}の支援原理＋本児固有情報に紐づけた根拠を2行以上で）

## 6. 家庭との連携
連携内容と「なぜその連携が必要か」の理由を併記すること。

# 厳守事項（システムプロンプトの再確認）
- すべての活動・支援項目に「理由：」または「（理由：〜）」を必ず併記すること
- 抽象的な「Aさんに適切なため」ではなく、${child.disability}の発達原理と本児の固有情報に紐づけて書くこと
- 行政の実地指導で「なぜこの計画ですか」と聞かれて即答できる粒度の根拠を書くこと
- 見出しは ## または ■ を使い、Markdown記法で読みやすく整形すること
- 根拠の薄い項目（「〜のため」だけで終わる）は出力しないこと${extra}`;
}

const SUPPORT_DIARY_AI_SYSTEM = `あなたは児童発達支援・放課後等デイサービスの支援記録の推敲を支援するアシスタントです。
入力は支援員の口語メモであることがあります。事実と観察、気になった点を整理し、チーム内・記録として読みやすいMarkdownの支援記録本文のみを出力してください。
前置き・謝罪・「ご不明な点は」のような締めは不要です。`;
const PARENT_CONTACT_AI_SYSTEM = `あなたは保護者向け連絡文を整えるアシスタントです。
否定や評価をくじかず、温かく丁寧な敬語で信頼感のあるトーンにしてください。
Markdownの連絡帳本文のみを出力し、前置きや謝罪は書かないでください。`;

function buildChildContextForAiLogs(child) {
  return `【利用児の基本情報】
お名前：${child.name}
年齢：${child.age}
生年月日：${child.birthDate?.trim() || "（未入力）"}
障害種別：${child.disability}
重症度：${child.severity}
運動・身体能力：${child.motorLevel}
コミュニケーション：${child.communicationLevel}
社会性：${child.socialLevel}
生活に対する意向（アセスメント）：${child.familyLifeIntentions?.trim() || "（未入力）"}
標準提供時間の想定：${child.standardSupportProvision?.trim() || "（未入力）"}
児発管記名（アセスメント）：${child.managerName?.trim() || "（未入力）"}
現在の主な課題：${child.currentIssues?.trim() || "（未入力）"}
半年後の目標：${child.goals?.trim() || "（未入力）"}
備考：${child.notes?.trim() || "（未入力）"}`;
}

function buildSupportDiaryUserPrompt(child, inputs) {
  const dateLabel = new Date().toLocaleDateString("ja-JP");
  const activity = String(inputs.activity ?? "").trim();
  const appearance = String(inputs.appearance ?? "").trim();
  const concerns = String(inputs.concerns ?? "").trim();
  return `${buildChildContextForAiLogs(child)}

記録日：${dateLabel}

【支援員からの入力メモ】
・今日の活動：
${activity || "（なし）"}
・本人の様子：
${appearance || "（なし）"}
・気になった点：
${concerns || "（なし）"}

【依頼】
上記をもとに、支援記録としてMarkdownで整形してください。
・見出しは ## を用い、活動内容／様子／気になった点・フォロー方針が伝わる構成にすること。
・観察できた事実と支援員の配慮がわかるよう書くこと。入力がない項目は無理に作らず省略してよい。
・個人情報は最小限に留めること。`;
}

function buildParentContactUserPrompt(child, inputs) {
  const dateLabel = new Date().toLocaleDateString("ja-JP");
  const enjoyed = String(inputs.enjoyed ?? "").trim();
  const effort = String(inputs.effort ?? "").trim();
  const handover = String(inputs.handover ?? "").trim();
  return `${buildChildContextForAiLogs(child)}

記録日：${dateLabel}

【支援員からの入力メモ】
・今日楽しめたこと：
${enjoyed || "（なし）"}
・頑張ったこと：
${effort || "（なし）"}
・家庭への申し送り：
${handover || "（なし）"}

【依頼】
保護者へお渡しする連絡帳として、温かい文体でMarkdownにまとめてください。
・見出しは ## で簡潔に。
・できたことを認めつつ、家庭でのフォローをお願いする際は押しつけがましくない表現にすること。
・入力がない項目は省略してよい。`;
}

function getAnthropicUrl() {
  return `${window.location.origin}/api/anthropic`;
}

async function requestClaudeCompletion({ system, userContent, max_tokens = 8192 }) {
  const model = import.meta.env.VITE_ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  const body = {
    model,
    max_tokens,
    system,
    messages: [{ role: "user", content: userContent }],
  };

  const res = await fetch(getAnthropicUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
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

async function requestProgramFromClaude(child, extraPlanPrompt = "") {
  const userContent = `${REFERENCE_CASE}\n\n${buildUserPrompt(child, extraPlanPrompt)}`;
  return requestClaudeCompletion({
    system: SYSTEM_PROMPT,
    userContent,
    max_tokens: 8192,
  });
}

async function requestSupportDiaryFromClaude(child, inputs) {
  return requestClaudeCompletion({
    system: SUPPORT_DIARY_AI_SYSTEM,
    userContent: buildSupportDiaryUserPrompt(child, inputs),
    max_tokens: 4096,
  });
}

async function requestParentContactFromClaude(child, inputs) {
  return requestClaudeCompletion({
    system: PARENT_CONTACT_AI_SYSTEM,
    userContent: buildParentContactUserPrompt(child, inputs),
    max_tokens: 4096,
  });
}

export default function App() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [childSaveBusy, setChildSaveBusy] = useState(false);

  const [screen, setScreen] = useState("list");
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [editingChildId, setEditingChildId] = useState(null);
  const [editingOriginalName, setEditingOriginalName] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState("");
  const [generatedAtIso, setGeneratedAtIso] = useState(null);
  /** 直近の AI 生成テキスト（編集前の原文・保存時の original に使う） */
  const [programAiOriginal, setProgramAiOriginal] = useState("");
  const [programEditMode, setProgramEditMode] = useState(false);
  const [programEditSnapshot, setProgramEditSnapshot] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedPrograms, setSavedPrograms] = useState([]);
  const [selectedSavedChildName, setSelectedSavedChildName] = useState(null);
  const [selectedSaved, setSelectedSaved] = useState(null);
  /** 履歴から開く計画書以外（支援記録・連絡帳・簡易記録） */
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const [printRequested, setPrintRequested] = useState(false);
  const [supportRecords, setSupportRecords] = useState([]);
  const [recordForm, setRecordForm] = useState({
    date: todayYyyyMmDd(),
    mood: "",
    success: "",
    challenges: "",
    handover: "",
  });
  /** 子ども詳細: 個別支援計画書 | 支援記録 | 保護者連絡帳 */
  const [detailDocTab, setDetailDocTab] = useState("plan");
  const [detailPlanListExpanded, setDetailPlanListExpanded] = useState(false);
  const [detailDiaryListExpanded, setDetailDiaryListExpanded] = useState(false);
  const [detailContactListExpanded, setDetailContactListExpanded] =
    useState(false);
  const [diaryAccordionOpenDate, setDiaryAccordionOpenDate] = useState(null);
  const [diaryDetailOpenId, setDiaryDetailOpenId] = useState(null);
  const [savedListExpanded, setSavedListExpanded] = useState(false);
  const [savedHistoryExpanded, setSavedHistoryExpanded] = useState(false);
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const saveToastTimerRef = useRef(null);
  const [savedSupportDiaries, setSavedSupportDiaries] = useState([]);
  const [savedParentContacts, setSavedParentContacts] = useState([]);
  const [supportDiaryForm, setSupportDiaryForm] = useState({
    activity: "",
    appearance: "",
    concerns: "",
  });
  const [supportDiaryOutput, setSupportDiaryOutput] = useState("");
  const [supportDiaryGeneratedAt, setSupportDiaryGeneratedAt] = useState(null);
  const [supportDiaryAiLoading, setSupportDiaryAiLoading] = useState(false);
  const [parentContactForm, setParentContactForm] = useState({
    enjoyed: "",
    effort: "",
    handover: "",
  });
  const [parentContactOutput, setParentContactOutput] = useState("");
  const [parentContactGeneratedAt, setParentContactGeneratedAt] = useState(null);
  const [parentContactAiLoading, setParentContactAiLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [listFilter, setListFilter] = useState("all");
  /** 支援計画生成時に API へ渡す追加プロンプト（詳細画面） */
  const [planPromptExtra, setPlanPromptExtra] = useState("");
  const [planFeedbacks, setPlanFeedbacks] = useState([]);
  const [form, setForm] = useState({
    name: "",
    age: "4歳",
    disability: "自閉スペクトラム症",
    severity: "中度",
    motorLevel: "中",
    communicationLevel: "低",
    socialLevel: "低",
    birthDate: "",
    familyLifeIntentions: "",
    standardSupportProvision: "",
    managerName: "",
    currentIssues: "",
    goals: "",
    notes: "",
  });

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => {
        setSession(null);
        setAuthReady(true);
      });
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!cancelled) {
        setSession(sess);
        setAuthReady(true);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (!sess) {
        setChildren([]);
        setSelectedChild(null);
        setSavedPrograms([]);
        setSupportRecords([]);
        setSavedSupportDiaries([]);
        setSavedParentContacts([]);
        setPlanFeedbacks([]);
        setSelectedSaved(null);
        setSelectedSavedChildName(null);
        setSelectedHistoryEntry(null);
        setScreen("list");
        setEditingChildId(null);
        setEditingOriginalName(null);
        setForm({
          name: "",
          age: "4歳",
          disability: "自閉スペクトラム症",
          severity: "中度",
          motorLevel: "中",
          communicationLevel: "低",
          socialLevel: "低",
          birthDate: "",
          familyLifeIntentions: "",
          standardSupportProvision: "",
          managerName: "",
          currentIssues: "",
          goals: "",
          notes: "",
        });
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      queueMicrotask(() => setWorkspaceLoading(false));
      return;
    }
    let cancelled = false;
    const uid = session.user.id;
    queueMicrotask(() => {
      if (cancelled) return;
      setWorkspaceLoading(true);
      setError(null);
      workspaceDb
        .fetchWorkspace(supabase, uid)
        .then((w) => {
          if (cancelled) return;
          setChildren(w.children);
          setSavedPrograms(w.savedPrograms);
          setSupportRecords(w.supportRecords);
          setSavedSupportDiaries(w.savedSupportDiaries);
          setSavedParentContacts(w.savedParentContacts);
          setPlanFeedbacks(w.planFeedbacks);
        })
        .catch((e) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e));
          }
        })
        .finally(() => {
          if (!cancelled) setWorkspaceLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, session?.user?.id]);

  useEffect(() => {
    if (!selectedChild?.id) return;
    queueMicrotask(() => {
      setDetailDocTab("plan");
      setSupportDiaryForm({ activity: "", appearance: "", concerns: "" });
      setSupportDiaryOutput("");
      setSupportDiaryGeneratedAt(null);
      setParentContactForm({ enjoyed: "", effort: "", handover: "" });
      setParentContactOutput("");
      setParentContactGeneratedAt(null);
      setDetailPlanListExpanded(false);
      setDetailDiaryListExpanded(false);
      setDetailContactListExpanded(false);
      setDiaryAccordionOpenDate(null);
      setDiaryDetailOpenId(null);
      setError(null);
    });
  }, [selectedChild?.id]);

  useEffect(() => {
    if (!printRequested) return;
    const t = setTimeout(() => {
      window.print();
      setPrintRequested(false);
    }, 50);
    return () => clearTimeout(t);
  }, [printRequested]);

  const savedCount = useMemo(
    () =>
      savedPrograms.length +
      savedSupportDiaries.length +
      savedParentContacts.length +
      supportRecords.length,
    [
      savedPrograms.length,
      savedSupportDiaries.length,
      savedParentContacts.length,
      supportRecords.length,
    ],
  );

  const savedGroups = useMemo(() => {
    const nameSet = new Set();
    for (const p of savedPrograms) nameSet.add(p.childName || "（名前なし）");
    for (const d of savedSupportDiaries) nameSet.add(d.childName || "（名前なし）");
    for (const c of savedParentContacts) nameSet.add(c.childName || "（名前なし）");
    for (const r of supportRecords) nameSet.add(r.childName || "（名前なし）");

    const result = Array.from(nameSet).map((childName) => {
      const items = buildUnifiedHistoryRows(
        childName,
        savedPrograms,
        savedSupportDiaries,
        savedParentContacts,
        supportRecords,
      );
      return {
        childName,
        items,
        count: items.length,
        latestAt: items[0]?.createdAt ?? null,
      };
    });

    result.sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt)));
    return result;
  }, [
    savedPrograms,
    savedSupportDiaries,
    savedParentContacts,
    supportRecords,
  ]);

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

  const selectedSavedSupportDiaries = useMemo(() => {
    if (!selectedChild?.name) return [];
    return savedSupportDiaries
      .filter((p) => p.childName === selectedChild.name)
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [savedSupportDiaries, selectedChild]);

  const supportDiaryVisibleList = useMemo(() => {
    const full = selectedSavedSupportDiaries;
    return detailDiaryListExpanded ? full : full.slice(0, 10);
  }, [selectedSavedSupportDiaries, detailDiaryListExpanded]);

  const supportDiaryGroupsByDate = useMemo(() => {
    const map = new Map();
    for (const d of supportDiaryVisibleList) {
      const key = diaryRecordDateKey(d);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    }
    for (const items of map.values()) {
      items.sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      );
    }
    return Array.from(map.entries())
      .map(([date, items]) => ({
        date,
        dateLabel: formatJaDate(date),
        items,
        count: items.length,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [supportDiaryVisibleList]);

  const selectedSavedParentContacts = useMemo(() => {
    if (!selectedChild?.name) return [];
    return savedParentContacts
      .filter((p) => p.childName === selectedChild.name)
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [savedParentContacts, selectedChild]);

  const selectedChildSavedPrograms = useMemo(() => {
    if (!selectedChild?.name) return [];
    return savedPrograms
      .filter((p) => p.childName === selectedChild.name)
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [savedPrograms, selectedChild]);

  const showSaveToast = useCallback(() => {
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    setSaveToastVisible(true);
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToastVisible(false);
      saveToastTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(
    () => () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    },
    [],
  );

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
    async (rating) => {
      if (!selectedChild || !generatedProgram.trim()) return;
      if (!supabase || !session?.user?.id) return;
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
      try {
        await workspaceDb.insertPlanFeedback(supabase, session.user.id, entry);
        setPlanFeedbacks((prev) => [...prev, entry]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [selectedChild, generatedProgram, supabase, session],
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
      birthDate: "",
      familyLifeIntentions: "",
      standardSupportProvision: "",
      managerName: "",
      currentIssues: "",
      goals: "",
      notes: "",
    });
    setEditingChildId(null);
    setEditingOriginalName(null);
  };

  const upsertChild = async () => {
    if (!form.name || !supabase || !session?.user?.id) return;
    const nextName = form.name.trim();
    setChildSaveBusy(true);
    setError(null);
    try {
      if (editingChildId) {
        const prevName = editingOriginalName;
        await workspaceDb.updateChild(
          supabase,
          session.user.id,
          editingChildId,
          form,
        );
        if (prevName && prevName !== nextName) {
          await workspaceDb.syncChildNameAcrossWorkspace(
            supabase,
            session.user.id,
            editingChildId,
            nextName,
          );
        }
        setChildren((c) =>
          c.map((child) =>
            String(child.id) === String(editingChildId)
              ? {
                  ...child,
                  ...form,
                  name: nextName,
                }
              : child,
          ),
        );
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
          setSavedSupportDiaries((prev) =>
            prev.map((p) =>
              p.childName === prevName ? { ...p, childName: nextName } : p,
            ),
          );
          setSavedParentContacts((prev) =>
            prev.map((p) =>
              p.childName === prevName ? { ...p, childName: nextName } : p,
            ),
          );
          setSelectedSavedChildName((n) => (n === prevName ? nextName : n));
          setSelectedSaved((p) =>
            p && p.childName === prevName ? { ...p, childName: nextName } : p,
          );
        }
        setSelectedChild((c) =>
          c && String(c.id) === String(editingChildId)
            ? { ...c, ...form, name: nextName }
            : c,
        );
        resetChildForm();
        setScreen("detail");
        showSaveToast();
        return;
      }

      const created = await workspaceDb.insertChild(
        supabase,
        session.user.id,
        form,
      );
      setChildren((c) => [...c, created]);
      resetChildForm();
      setScreen("list");
      showSaveToast();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChildSaveBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedChild) return;
    if (!session?.user?.id) {
      setError("個別支援計画書を生成するにはログインが必要です。");
      return;
    }
    setError(null);
    setGeneratedProgram("");
    setGeneratedAtIso(null);
    setProgramAiOriginal("");
    setProgramEditMode(false);
    setProgramEditSnapshot("");
    setLoading(true);
    setScreen("program");
    try {
      const text = await requestProgramFromClaude(selectedChild, planPromptExtra);
      setGeneratedProgram(text);
      setProgramAiOriginal(text);
      setGeneratedAtIso(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScreen("detail");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditFeedback = async () => {
    if (!selectedChild || !generatedProgram.trim()) return;
    if (!supabase || !session?.user?.id) return;
    const edited = generatedProgram.trim();
    const original = (programAiOriginal || "").trim() || edited;
    try {
      await workspaceDb.insertProgramEditFeedback(supabase, session.user.id, {
        original,
        edited,
        childName: selectedChild.name,
        date: new Date().toISOString(),
      });
      showSaveToast();
    } catch {
      /* 保存失敗しても編集モードは終了させる */
    }
    setProgramEditMode(false);
  };

  const handleSaveProgram = async () => {
    if (!selectedChild) return;
    if (!generatedProgram.trim()) return;
    if (!supabase || !session?.user?.id) return;
    const createdAt = generatedAtIso || new Date().toISOString();
    const mappedPlan = buildFormalPlanDocument(
      selectedChild,
      generatedProgram,
      createdAt,
    );
    const entry = {
      id: `${createdAt}:${Math.random().toString(16).slice(2)}`,
      childName: selectedChild.name,
      childId: selectedChild.id ?? null,
      createdAt,
      createdAtLabel: formatJaDateTime(createdAt),
      programText: generatedProgram,
      title: "個別支援計画書",
      mappedPlan,
    };
    try {
      await workspaceDb.insertSavedProgram(supabase, session.user.id, entry);
      setSavedPrograms((prev) => [entry, ...prev]);
      showSaveToast();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGenerateSupportDiary = async () => {
    if (!selectedChild) return;
    const has =
      supportDiaryForm.activity.trim() ||
      supportDiaryForm.appearance.trim() ||
      supportDiaryForm.concerns.trim();
    if (!has) {
      setError(
        "今日の活動・本人の様子・気になった点のいずれかに入力してください。",
      );
      return;
    }
    setError(null);
    setSupportDiaryAiLoading(true);
    setSupportDiaryOutput("");
    setSupportDiaryGeneratedAt(null);
    try {
      const text = await requestSupportDiaryFromClaude(
        selectedChild,
        supportDiaryForm,
      );
      setSupportDiaryOutput(text);
      setSupportDiaryGeneratedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSupportDiaryAiLoading(false);
    }
  };

  const handleSaveSupportDiary = async () => {
    if (!selectedChild) return;
    if (!supportDiaryOutput.trim()) return;
    if (!supabase || !session?.user?.id) return;
    const createdAt = supportDiaryGeneratedAt || new Date().toISOString();
    const entry = {
      id: `${createdAt}:${Math.random().toString(16).slice(2)}`,
      childName: selectedChild.name,
      childId: selectedChild.id ?? null,
      date: todayYyyyMmDd(),
      createdAt,
      createdAtLabel: formatJaDateTime(createdAt),
      programText: supportDiaryOutput.trim(),
      title: "支援記録",
      sourceInputs: {
        activity: supportDiaryForm.activity.trim(),
        appearance: supportDiaryForm.appearance.trim(),
        concerns: supportDiaryForm.concerns.trim(),
      },
    };
    try {
      await workspaceDb.insertSavedSupportDiary(supabase, session.user.id, entry);
      setSavedSupportDiaries((prev) => [entry, ...prev]);
      showSaveToast();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleGenerateParentContact = async () => {
    if (!selectedChild) return;
    const has =
      parentContactForm.enjoyed.trim() ||
      parentContactForm.effort.trim() ||
      parentContactForm.handover.trim();
    if (!has) {
      setError(
        "今日楽しめたこと・頑張ったこと・家庭への申し送りのいずれかに入力してください。",
      );
      return;
    }
    setError(null);
    setParentContactAiLoading(true);
    setParentContactOutput("");
    setParentContactGeneratedAt(null);
    try {
      const text = await requestParentContactFromClaude(
        selectedChild,
        parentContactForm,
      );
      setParentContactOutput(text);
      setParentContactGeneratedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setParentContactAiLoading(false);
    }
  };

  const handleSaveParentContact = async () => {
    if (!selectedChild) return;
    if (!parentContactOutput.trim()) return;
    if (!supabase || !session?.user?.id) return;
    const createdAt = parentContactGeneratedAt || new Date().toISOString();
    const entry = {
      id: `${createdAt}:${Math.random().toString(16).slice(2)}`,
      childName: selectedChild.name,
      childId: selectedChild.id ?? null,
      createdAt,
      createdAtLabel: formatJaDateTime(createdAt),
      programText: parentContactOutput.trim(),
      title: "保護者連絡帳",
      sourceInputs: {
        enjoyed: parentContactForm.enjoyed.trim(),
        effort: parentContactForm.effort.trim(),
        handover: parentContactForm.handover.trim(),
      },
    };
    try {
      await workspaceDb.insertSavedParentContact(supabase, session.user.id, entry);
      setSavedParentContacts((prev) => [entry, ...prev]);
      showSaveToast();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleExportProgramPdf = useCallback(async () => {
    if (!selectedChild || !generatedProgram.trim()) return;
    setPdfBusy(true);
    try {
      await mountAndExportFormalSupportPlanPdf({
        mappedPlanSnapshot: null,
        childPayload: selectedChild,
        programText: generatedProgram,
        planCreatedIso: generatedAtIso || new Date().toISOString(),
        filenameStem: selectedChild.name,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPdfBusy(false);
    }
  }, [selectedChild, generatedProgram, generatedAtIso]);

  const handleExportSavedProgramPdf = useCallback(async () => {
    if (!selectedSaved?.programText?.trim()) return;
    setPdfBusy(true);
    try {
      const child =
        children.find((c) => String(c.id) === String(selectedSaved.childId)) ||
        children.find((c) => c.name === selectedSaved.childName);
      const name = selectedSaved.childName;
      await mountAndExportFormalSupportPlanPdf({
        mappedPlanSnapshot: selectedSaved.mappedPlan ?? null,
        childPayload: {
          ...(child || {}),
          name,
          childName: name,
        },
        programText: selectedSaved.programText,
        planCreatedIso: selectedSaved.createdAt || new Date().toISOString(),
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
      setSelectedHistoryEntry(null);
      setScreen("savedList");
      return;
    }
    if (screen === "savedHistoryDetail") {
      setSelectedHistoryEntry(null);
      setScreen("savedChildHistory");
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

  if (!isSupabaseConfigured()) {
    return (
      <div style={s.wrap} className="app-root">
        <div style={{ ...s.body, paddingTop: 32 }}>
          <div style={{ ...s.card, maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#2a3a2a", marginBottom: 10 }}>
              Supabase の環境変数が未設定です
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "#3a4a3a", margin: 0 }}>
              プロジェクト直下に <code style={{ fontSize: 12 }}>.env</code> を作成し、
              <code style={{ fontSize: 12 }}> VITE_SUPABASE_URL </code> と{" "}
              <code style={{ fontSize: 12 }}> VITE_SUPABASE_ANON_KEY </code> を設定してください。
              データベースのテーブル作成と Row Level Security の手順は{" "}
              <code style={{ fontSize: 12 }}>docs/SUPABASE_SETUP.md</code> を参照してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div
        style={{
          ...s.wrap,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2d5a3d",
          fontSize: 14,
          fontWeight: 700,
        }}
        className="app-root"
      >
        認証を確認中…
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        supabase={supabase}
        cardStyle={s.card}
        inputStyle={s.input}
        btnStyle={s.btn}
      />
    );
  }

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
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <span
            title={session.user?.email ?? ""}
            style={{
              fontSize: 10,
              color: "#7a8a7a",
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session.user?.email ?? ""}
          </span>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            style={{
              padding: "6px 10px",
              borderRadius: 20,
              background: "transparent",
              color: "#7a6a5a",
              border: "1px solid #ddd",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ログアウト
          </button>
          {screen === "list" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSavedListExpanded(false);
                  setSelectedHistoryEntry(null);
                  setScreen("savedList");
                }}
                style={{
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
      </div>

      <div style={s.body}>
        {workspaceLoading && (
          <div
            style={{
              ...s.card,
              textAlign: "center",
              padding: "16px 12px",
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 700,
              color: "#2d5a3d",
            }}
          >
            データを読み込み中…
          </div>
        )}
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
                {editingChildId ? "アセスメントを編集" : "アセスメントシート"}
              </div>
              <div style={{ fontSize: 13, color: "#5a6a5a", lineHeight: 1.65 }}>
                こちらが個別支援計画書への自動マッピング元になります。
                「生活に対する意向」「標準提供時間」「児発管」の入力があると様式PDFの該当欄に反映されます。
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
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>生年月日（計画様式）</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
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
                計画書に直結するアセスメント項目
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>
                  利用者及び家族の生活に対する意向・ねらい
                </label>
                <VoiceAppendTextarea
                  value={form.familyLifeIntentions}
                  onValueChange={(next) =>
                    setForm((f) => ({ ...f, familyLifeIntentions: next }))
                  }
                  rows={4}
                  placeholder="例：在宅での生活リズムを安定させつつ、集団での友だち関係に興味を持ってほしい 等"
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>支援の標準的な提供時間等の想定</label>
                <VoiceAppendTextarea
                  value={form.standardSupportProvision}
                  onValueChange={(next) =>
                    setForm((f) => ({ ...f, standardSupportProvision: next }))
                  }
                  rows={2}
                  placeholder="例：月〜金曜のうち週3回／各2時間／放課後14:30〜18:30帯での提供　等"
                />
              </div>
              <div>
                <label style={s.label}>
                  児童発達支援管理責任者氏名（計画様式への記載用）
                </label>
                <input
                  value={form.managerName}
                  onChange={(e) => handleChange("managerName", e.target.value)}
                  placeholder="計画作成時に氏名記入（施設側で入力）"
                  style={s.input}
                />
              </div>
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
                <label style={s.label}>半年後のねらい（長期ねらい・計画にも反映）</label>
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
              onClick={() => void upsertChild()}
              disabled={!form.name || childSaveBusy}
              style={{
                ...s.btn,
                opacity: form.name && !childSaveBusy ? 1 : 0.5,
                cursor: childSaveBusy ? "wait" : "pointer",
              }}
            >
              {childSaveBusy
                ? "保存中…"
                : editingChildId
                  ? "更新する"
                  : "登録する"}
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
                    {selectedChild.birthDate
                      ? `${formatJaDate(selectedChild.birthDate)} · `
                      : ""}
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
                        birthDate: selectedChild.birthDate || "",
                        familyLifeIntentions:
                          selectedChild.familyLifeIntentions || "",
                        standardSupportProvision:
                          selectedChild.standardSupportProvision || "",
                        managerName: selectedChild.managerName || "",
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
                    onClick={async () => {
                      const ok = window.confirm(
                        `${selectedChild.name} を削除しますか？\n（保存済みプログラム・簡易支援記録・支援記録・保護者連絡帳も一覧から除外されます）`,
                      );
                      if (!ok) return;
                      const nameToDelete = selectedChild.name;
                      const idToDelete = selectedChild.id;
                      if (supabase && session?.user?.id) {
                        try {
                          await workspaceDb.deleteChild(
                            supabase,
                            session.user.id,
                            idToDelete,
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                          return;
                        }
                      }
                      setChildren((c) => c.filter((x) => x.id !== idToDelete));
                      setSavedPrograms((prev) =>
                        prev.filter((p) => p.childName !== nameToDelete),
                      );
                      setSupportRecords((prev) =>
                        prev.filter((r) => r.childName !== nameToDelete),
                      );
                      setSavedSupportDiaries((prev) =>
                        prev.filter((p) => p.childName !== nameToDelete),
                      );
                      setSavedParentContacts((prev) =>
                        prev.filter((p) => p.childName !== nameToDelete),
                      );
                      setPlanFeedbacks((prev) =>
                        prev.filter(
                          (f) => String(f.childId) !== String(idToDelete),
                        ),
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
            {(selectedChild.birthDate ||
              selectedChild.familyLifeIntentions ||
              selectedChild.standardSupportProvision ||
              selectedChild.managerName) && (
              <div style={s.card}>
                <div style={{ ...s.label, marginBottom: 12 }}>
                  アセスメント（様式への反映項目）
                </div>
                {selectedChild.birthDate ? (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#7a8a7a" }}>
                      生年月日：
                    </span>
                    <span style={{ fontSize: 13, color: "#2a3a2a" }}>
                      {formatJaDate(selectedChild.birthDate)}
                    </span>
                  </div>
                ) : null}
                {selectedChild.familyLifeIntentions ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 2 }}>
                      生活に対する意向
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#2a3a2a",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedChild.familyLifeIntentions}
                    </div>
                  </div>
                ) : null}
                {selectedChild.standardSupportProvision ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 2 }}>
                      標準的な提供時間等（想定）
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#2a3a2a",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedChild.standardSupportProvision}
                    </div>
                  </div>
                ) : null}
                {selectedChild.managerName ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 2 }}>
                      児童発達支援管理責任者氏名（記載用）
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2d5a3d" }}>
                      {selectedChild.managerName}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
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
              <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 12, lineHeight: 1.5 }}>
                アセスメント情報は自動でAIに渡り、告示例示準拠の様式レイアウトでPDFにも反映されます。
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setDetailDocTab("plan")}
                  style={{
                    flex: "1 1 30%",
                    minWidth: 100,
                    padding: "10px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border:
                      detailDocTab === "plan"
                        ? "2px solid #2d5a3d"
                        : "2px solid #c8e0cc",
                    background: detailDocTab === "plan" ? "#2d5a3d" : "#fafcfa",
                    color: detailDocTab === "plan" ? "#fff" : "#2d5a3d",
                  }}
                >
                  個別支援計画書
                </button>
                <button
                  type="button"
                  onClick={() => setDetailDocTab("diary")}
                  style={{
                    flex: "1 1 30%",
                    minWidth: 100,
                    padding: "10px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border:
                      detailDocTab === "diary"
                        ? "2px solid #2d5a3d"
                        : "2px solid #c8e0cc",
                    background: detailDocTab === "diary" ? "#2d5a3d" : "#fafcfa",
                    color: detailDocTab === "diary" ? "#fff" : "#2d5a3d",
                  }}
                >
                  支援記録
                </button>
                <button
                  type="button"
                  onClick={() => setDetailDocTab("contact")}
                  style={{
                    flex: "1 1 30%",
                    minWidth: 100,
                    padding: "10px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border:
                      detailDocTab === "contact"
                        ? "2px solid #2d5a3d"
                        : "2px solid #c8e0cc",
                    background:
                      detailDocTab === "contact" ? "#2d5a3d" : "#fafcfa",
                    color: detailDocTab === "contact" ? "#fff" : "#2d5a3d",
                  }}
                >
                  保護者連絡帳
                </button>
              </div>

              {detailDocTab === "plan" && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>支援計画生成の追加プロンプト（任意）</label>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#7a8a7a",
                        marginBottom: 8,
                        lineHeight: 1.5,
                      }}
                    >
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
                      marginBottom: 16,
                      opacity: loading ? 0.65 : 1,
                      cursor: loading ? "wait" : "pointer",
                    }}
                  >
                    🌿 6ヶ月プログラムを生成する
                  </button>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7a8a7a",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    保存済み（このお子さま）
                  </div>
                  {selectedChildSavedPrograms.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#7a8a7a", lineHeight: 1.6 }}>
                      まだありません。生成後に「保存する」から保存できます。
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(detailPlanListExpanded
                          ? selectedChildSavedPrograms
                          : selectedChildSavedPrograms.slice(0, 10)
                        ).map((p) => (
                          <div
                            key={p.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedSaved(p);
                              setSelectedSavedChildName(selectedChild.name);
                              setScreen("savedProgram");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedSaved(p);
                                setSelectedSavedChildName(selectedChild.name);
                                setScreen("savedProgram");
                              }
                            }}
                            style={{
                              border: "1px solid #e0eae0",
                              borderRadius: 12,
                              padding: "12px 12px",
                              background: "#fafcfa",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#2a3a2a",
                                marginBottom: 4,
                              }}
                            >
                              {p.createdAtLabel || formatJaDateTime(p.createdAt)}
                            </div>
                            <div style={{ fontSize: 11, color: "#7a8a7a" }}>
                              タップして閲覧
                            </div>
                          </div>
                        ))}
                      </div>
                      {!detailPlanListExpanded &&
                        selectedChildSavedPrograms.length > 10 && (
                          <button
                            type="button"
                            onClick={() => setDetailPlanListExpanded(true)}
                            style={{
                              ...s.btn,
                              marginTop: 12,
                              background: "transparent",
                              color: "#2d5a3d",
                              border: "2px solid #c8e0cc",
                            }}
                          >
                            もっと見る（全{selectedChildSavedPrograms.length}件）
                          </button>
                        )}
                    </>
                  )}
                </>
              )}

              {detailDocTab === "diary" && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>今日の活動</label>
                    <textarea
                      value={supportDiaryForm.activity}
                      onChange={(e) =>
                        setSupportDiaryForm((f) => ({
                          ...f,
                          activity: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例：フリー遊び、グループ工作、散歩 など"
                      style={s.textarea}
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>本人の様子</label>
                    <textarea
                      value={supportDiaryForm.appearance}
                      onChange={(e) =>
                        setSupportDiaryForm((f) => ({
                          ...f,
                          appearance: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例：終始落ち着いて過ごせた、同伴時は手をつないで歩けた など"
                      style={s.textarea}
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>気になった点（音声入力可）</label>
                    <VoiceAppendTextarea
                      value={supportDiaryForm.concerns}
                      onValueChange={(next) =>
                        setSupportDiaryForm((f) => ({ ...f, concerns: next }))
                      }
                      rows={3}
                      placeholder="例：急な予定変更時にしばらく動けなかった など"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenerateSupportDiary()}
                    disabled={supportDiaryAiLoading}
                    style={{
                      ...s.btn,
                      marginBottom: 12,
                      opacity: supportDiaryAiLoading ? 0.65 : 1,
                      cursor: supportDiaryAiLoading ? "wait" : "pointer",
                    }}
                  >
                    {supportDiaryAiLoading ? "支援記録を整形中…" : "AI で支援記録に整形"}
                  </button>
                  {supportDiaryOutput.trim() ? (
                    <>
                      <div
                        style={{
                          ...s.card,
                          padding: 14,
                          marginBottom: 12,
                          boxShadow: "none",
                          border: "1px solid #e0eae0",
                        }}
                      >
                        <label style={s.label}>整形結果</label>
                        <ProgramMarkdown text={supportDiaryOutput} />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveSupportDiary}
                        style={{
                          ...s.btnGold,
                          marginBottom: 16,
                        }}
                      >
                        この支援記録を保存
                      </button>
                    </>
                  ) : null}

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7a8a7a",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    保存済み（このお子さま）
                  </div>
                  {selectedSavedSupportDiaries.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#7a8a7a", lineHeight: 1.6 }}>
                      まだありません。整形後に「この支援記録を保存」から保存できます。
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {supportDiaryGroupsByDate.map((g) => {
                          const open = diaryAccordionOpenDate === g.date;
                          return (
                            <div
                              key={g.date}
                              style={{
                                border: "1px solid #e0eae0",
                                borderRadius: 12,
                                overflow: "hidden",
                                background: "#fafcfa",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDiaryAccordionOpenDate((prev) =>
                                    prev === g.date ? null : g.date,
                                  );
                                  setDiaryDetailOpenId(null);
                                }}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  padding: "12px 14px",
                                  border: "none",
                                  background: open ? "#eef5ef" : "#fafcfa",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  textAlign: "left",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#2a3a2a",
                                  }}
                                >
                                  {g.dateLabel} · {g.count}件
                                </span>
                                <span
                                  style={{
                                    fontSize: 14,
                                    color: "#7a8a7a",
                                    transform: open ? "rotate(90deg)" : "none",
                                    transition: "transform 0.15s ease",
                                  }}
                                >
                                  ›
                                </span>
                              </button>
                              {open && (
                                <div
                                  style={{
                                    borderTop: "1px solid #e8eee8",
                                    padding: "4px 0 8px",
                                  }}
                                >
                                  {g.items.map((p) => {
                                    const timeLabel = formatJaTimeHm(p.createdAt);
                                    const line = diaryOneLineActivity(p);
                                    const detailOpen = diaryDetailOpenId === p.id;
                                    const appearance =
                                      p.sourceInputs?.appearance?.trim() || "";
                                    const concerns =
                                      p.sourceInputs?.concerns?.trim() || "";
                                    return (
                                      <div
                                        key={p.id}
                                        style={{
                                          borderBottom: "1px solid #f0f4f0",
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDiaryDetailOpenId((id) =>
                                              id === p.id ? null : p.id,
                                            )
                                          }
                                          style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "baseline",
                                            gap: 10,
                                            padding: "10px 14px",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontFamily: "inherit",
                                            textAlign: "left",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 12,
                                              fontWeight: 700,
                                              color: "#2d5a3d",
                                              flex: "0 0 auto",
                                              minWidth: 52,
                                            }}
                                          >
                                            {timeLabel}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 12,
                                              color: "#2a3a2a",
                                              lineHeight: 1.5,
                                              flex: 1,
                                            }}
                                          >
                                            {line}
                                          </span>
                                        </button>
                                        {detailOpen && (
                                          <div
                                            style={{
                                              padding: "0 14px 12px 76px",
                                              fontSize: 12,
                                              color: "#2a3a2a",
                                              lineHeight: 1.65,
                                            }}
                                          >
                                            <div style={{ marginBottom: 10 }}>
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  color: "#7a8a7a",
                                                  letterSpacing: "0.08em",
                                                }}
                                              >
                                                本日の様子
                                              </span>
                                              <div style={{ marginTop: 4 }}>
                                                {appearance || (
                                                  <span style={{ color: "#9a9a9a" }}>
                                                    （入力なし）
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div style={{ marginBottom: 10 }}>
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  color: "#7a8a7a",
                                                  letterSpacing: "0.08em",
                                                }}
                                              >
                                                フォロー方針・気になった点
                                              </span>
                                              <div style={{ marginTop: 4 }}>
                                                {concerns || (
                                                  <span style={{ color: "#9a9a9a" }}>
                                                    （入力なし）
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {!appearance && !concerns && p.programText?.trim() && (
                                              <div
                                                style={{
                                                  marginTop: 4,
                                                  padding: "10px 12px",
                                                  borderRadius: 10,
                                                  background: "#fff",
                                                  border: "1px solid #e8eee8",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: "#7a8a7a",
                                                    marginBottom: 6,
                                                  }}
                                                >
                                                  AI整形の全文
                                                </div>
                                                <ProgramMarkdown text={p.programText} />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!detailDiaryListExpanded &&
                        selectedSavedSupportDiaries.length > 10 && (
                          <button
                            type="button"
                            onClick={() => setDetailDiaryListExpanded(true)}
                            style={{
                              ...s.btn,
                              marginTop: 12,
                              background: "transparent",
                              color: "#2d5a3d",
                              border: "2px solid #c8e0cc",
                            }}
                          >
                            もっと見る（全{selectedSavedSupportDiaries.length}件）
                          </button>
                        )}
                    </>
                  )}

                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 18,
                      borderTop: "1px solid #e8eee8",
                    }}
                  >
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
                        簡易記録（手入力）
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
                        記録を追加
                      </button>
                    </div>

                    {selectedSupportRecords.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#7a8a7a", lineHeight: 1.6 }}>
                        まだ記録がありません。「記録を追加」から追加できます。
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
                </>
              )}

              {detailDocTab === "contact" && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>今日楽しめたこと</label>
                    <textarea
                      value={parentContactForm.enjoyed}
                      onChange={(e) =>
                        setParentContactForm((f) => ({
                          ...f,
                          enjoyed: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例：砂場で仲間と長く遊べた など"
                      style={s.textarea}
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>頑張ったこと</label>
                    <textarea
                      value={parentContactForm.effort}
                      onChange={(e) =>
                        setParentContactForm((f) => ({
                          ...f,
                          effort: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例：輪番で待てた、片付けに参加できた など"
                      style={s.textarea}
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={s.label}>家庭への申し送り</label>
                    <textarea
                      value={parentContactForm.handover}
                      onChange={(e) =>
                        setParentContactForm((f) => ({
                          ...f,
                          handover: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="例：睡眠不足気味だったので午後は様子見ました、など"
                      style={s.textarea}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenerateParentContact()}
                    disabled={parentContactAiLoading}
                    style={{
                      ...s.btn,
                      marginBottom: 12,
                      opacity: parentContactAiLoading ? 0.65 : 1,
                      cursor: parentContactAiLoading ? "wait" : "pointer",
                    }}
                  >
                    {parentContactAiLoading
                      ? "連絡文を生成中…"
                      : "AI で連絡帳を生成"}
                  </button>
                  {parentContactOutput.trim() ? (
                    <>
                      <div
                        style={{
                          ...s.card,
                          padding: 14,
                          marginBottom: 12,
                          boxShadow: "none",
                          border: "1px solid #e0eae0",
                        }}
                      >
                        <label style={s.label}>生成結果</label>
                        <ProgramMarkdown text={parentContactOutput} />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveParentContact}
                        style={{
                          ...s.btnGold,
                          marginBottom: 16,
                        }}
                      >
                        この連絡帳を保存
                      </button>
                    </>
                  ) : null}

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#7a8a7a",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    保存済み（このお子さま）
                  </div>
                  {selectedSavedParentContacts.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#7a8a7a", lineHeight: 1.6 }}>
                      まだありません。生成後に「この連絡帳を保存」から保存できます。
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(detailContactListExpanded
                          ? selectedSavedParentContacts
                          : selectedSavedParentContacts.slice(0, 10)
                        ).map((p) => (
                          <div
                            key={p.id}
                            style={{
                              border: "1px solid #e0eae0",
                              borderRadius: 12,
                              padding: "12px 12px",
                              background: "#fafcfa",
                              maxHeight: 280,
                              overflow: "auto",
                            }}
                          >
                            <div
                              style={{ fontSize: 12, fontWeight: 700, color: "#2a3a2a", marginBottom: 8 }}
                            >
                              {p.createdAtLabel || formatJaDateTime(p.createdAt)}
                            </div>
                            <ProgramMarkdown text={p.programText} />
                          </div>
                        ))}
                      </div>
                      {!detailContactListExpanded &&
                        selectedSavedParentContacts.length > 10 && (
                          <button
                            type="button"
                            onClick={() => setDetailContactListExpanded(true)}
                            style={{
                              ...s.btn,
                              marginTop: 12,
                              background: "transparent",
                              color: "#2d5a3d",
                              border: "2px solid #c8e0cc",
                            }}
                          >
                            もっと見る（全{selectedSavedParentContacts.length}件）
                          </button>
                        )}
                    </>
                  )}
                </>
              )}
            </div>
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
                簡易記録を追加
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
              onClick={async () => {
                if (!supabase || !session?.user?.id) return;
                const date = recordForm.date || todayYyyyMmDd();
                const createdAt = new Date().toISOString();
                const entry = {
                  id: `${createdAt}:${Math.random().toString(16).slice(2)}`,
                  childName: selectedChild.name,
                  childId: selectedChild.id ?? null,
                  date,
                  createdAt,
                  title: "簡易支援記録",
                  mood: recordForm.mood.trim(),
                  success: recordForm.success.trim(),
                  challenges: recordForm.challenges.trim(),
                  handover: recordForm.handover.trim(),
                };
                try {
                  await workspaceDb.insertSupportRecord(
                    supabase,
                    session.user.id,
                    entry,
                  );
                  setSupportRecords((prev) => [entry, ...prev]);
                  showSaveToast();
                  setScreen("detail");
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                }
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
                  {programEditMode ? (
                    <textarea
                      value={generatedProgram}
                      onChange={(e) => setGeneratedProgram(e.target.value)}
                      rows={18}
                      style={{
                        ...s.textarea,
                        minHeight: 280,
                        fontSize: 13,
                        lineHeight: 1.65,
                      }}
                    />
                  ) : (
                    <ProgramMarkdown text={generatedProgram} />
                  )}
                </div>
                {programEditMode ? (
                  <div
                    style={{
                      display: "flex",
                      flexFlow: "row wrap",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedProgram(programEditSnapshot);
                        setProgramEditMode(false);
                      }}
                      style={supportPlanRowBtn({})}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditFeedback}
                      disabled={!generatedProgram.trim()}
                      style={{
                        ...s.btn,
                        flex: "1 1 140px",
                        width: "auto",
                        minHeight: 48,
                        background: "#2d5a3d",
                        opacity: generatedProgram.trim() ? 1 : 0.5,
                        cursor: generatedProgram.trim()
                          ? "pointer"
                          : "not-allowed",
                      }}
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setProgramEditSnapshot(generatedProgram);
                      setProgramEditMode(true);
                    }}
                    disabled={!generatedProgram.trim()}
                    style={{
                      ...s.btn,
                      marginTop: 10,
                      background: "transparent",
                      color: "#2d5a3d",
                      border: "2px solid #c8e0cc",
                      opacity: generatedProgram.trim() ? 1 : 0.5,
                      cursor: generatedProgram.trim()
                        ? "pointer"
                        : "not-allowed",
                    }}
                  >
                    編集する
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveProgram}
                  disabled={!generatedProgram.trim() || programEditMode}
                  style={{
                    ...s.btn,
                    background: "#2d5a3d",
                    opacity:
                      generatedProgram.trim() && !programEditMode ? 1 : 0.5,
                    marginTop: 10,
                    cursor:
                      !generatedProgram.trim() || programEditMode
                        ? "not-allowed"
                        : "pointer",
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
                    {pdfBusy ? "作成中…" : "様式PDF（個別支援計画書）"}
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
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#2a3a2a",
                      lineHeight: 1.5,
                    }}
                  >
                    この支援計画はいかがでしたか？
                  </p>
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
              <>
                {(savedListExpanded ? savedGroups : savedGroups.slice(0, 10)).map(
                  (g) => (
                    <div
                      key={g.childName}
                      role="button"
                      tabIndex={0}
                      style={{ ...s.card, cursor: "pointer" }}
                  onClick={() => {
                    setSavedHistoryExpanded(false);
                    setSelectedHistoryEntry(null);
                    setSelectedSavedChildName(g.childName);
                    setSelectedSaved(null);
                    setScreen("savedChildHistory");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSavedHistoryExpanded(false);
                      setSelectedHistoryEntry(null);
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
                            {g.latestAt
                              ? `${formatJaDateTime(g.latestAt)} · ${g.count}件`
                              : `${g.count}件`}
                          </div>
                        </div>
                        <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
                      </div>
                    </div>
                  ),
                )}
                {!savedListExpanded && savedGroups.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setSavedListExpanded(true)}
                    style={{
                      ...s.btn,
                      marginTop: 4,
                      background: "transparent",
                      color: "#2d5a3d",
                      border: "2px solid #c8e0cc",
                    }}
                  >
                    もっと見る（全{savedGroups.length}件）
                  </button>
                )}
              </>
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

            <>
              {(savedHistoryExpanded
                ? selectedChildHistory
                : selectedChildHistory.slice(0, 10)
              ).map((p) => (
                <div
                  key={p.historyKey}
                  role="button"
                  tabIndex={0}
                  style={{ ...s.card, cursor: "pointer" }}
                  onClick={() => {
                    if (p.type === "support_plan") {
                      setSelectedSaved(p.ref);
                      setScreen("savedProgram");
                      return;
                    }
                    setSelectedHistoryEntry({ type: p.type, ref: p.ref });
                    setScreen("savedHistoryDetail");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (p.type === "support_plan") {
                        setSelectedSaved(p.ref);
                        setScreen("savedProgram");
                        return;
                      }
                      setSelectedHistoryEntry({ type: p.type, ref: p.ref });
                      setScreen("savedHistoryDetail");
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
                      {p.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#2a3a2a",
                          lineHeight: 1.35,
                        }}
                      >
                        {p.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#5a6a5a", marginTop: 4 }}>
                        {formatJaMonthDayTime(p.createdAt)}
                      </div>
                      <div style={{ fontSize: 11, color: "#7a8a7a", marginTop: 4 }}>
                        タップして詳細
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: "#ccc", flexShrink: 0 }}>›</div>
                  </div>
                </div>
              ))}
              {!savedHistoryExpanded && selectedChildHistory.length > 10 && (
                <button
                  type="button"
                  onClick={() => setSavedHistoryExpanded(true)}
                  style={{
                    ...s.btn,
                    marginTop: 4,
                    background: "transparent",
                    color: "#2d5a3d",
                    border: "2px solid #c8e0cc",
                  }}
                >
                  もっと見る（全{selectedChildHistory.length}件）
                </button>
              )}
            </>
          </div>
        )}

        {screen === "savedHistoryDetail" && selectedHistoryEntry && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>
                {selectedHistoryEntry.type === "support_diary" && "📔"}
                {selectedHistoryEntry.type === "parent_contact" && "📨"}
                {selectedHistoryEntry.type === "support_record" && "📝"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2a3a2a" }}>
                {selectedHistoryEntry.ref.childName}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#2d5a3d",
                  marginTop: 6,
                }}
              >
                {typeof selectedHistoryEntry.ref.title === "string" &&
                selectedHistoryEntry.ref.title.trim()
                  ? selectedHistoryEntry.ref.title.trim()
                  : selectedHistoryEntry.type === "support_diary"
                    ? "支援記録"
                    : selectedHistoryEntry.type === "parent_contact"
                      ? "保護者連絡帳"
                      : "簡易支援記録"}
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a", marginTop: 4 }}>
                {formatJaMonthDayTime(
                  selectedHistoryEntry.ref.createdAt ||
                    `${selectedHistoryEntry.ref.date}T12:00:00`,
                )}
              </div>
            </div>
            {selectedHistoryEntry.type === "support_record" && (
              <div
                style={{
                  ...s.card,
                  fontSize: 13,
                  color: "#2a3a2a",
                  lineHeight: 1.65,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...s.label }}>記録日</div>
                  <div>{formatJaDate(selectedHistoryEntry.ref.date)}</div>
                </div>
                {selectedHistoryEntry.ref.mood ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ ...s.label }}>今日の様子</div>
                    <div>{selectedHistoryEntry.ref.mood}</div>
                  </div>
                ) : null}
                {selectedHistoryEntry.ref.success ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ ...s.label }}>できたこと</div>
                    <div>{selectedHistoryEntry.ref.success}</div>
                  </div>
                ) : null}
                {selectedHistoryEntry.ref.challenges ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ ...s.label }}>課題</div>
                    <div>{selectedHistoryEntry.ref.challenges}</div>
                  </div>
                ) : null}
                {selectedHistoryEntry.ref.handover ? (
                  <div>
                    <div style={{ ...s.label }}>次回への申し送り</div>
                    <div>{selectedHistoryEntry.ref.handover}</div>
                  </div>
                ) : null}
              </div>
            )}
            {(selectedHistoryEntry.type === "support_diary" ||
              selectedHistoryEntry.type === "parent_contact") && (
              <div style={{ ...s.card, fontSize: 13, color: "#2a3a2a" }}>
                <ProgramMarkdown text={selectedHistoryEntry.ref.programText} />
              </div>
            )}
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
                {selectedSaved.childName}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2d5a3d", marginTop: 4 }}>
                📋 {selectedSaved.title?.trim() || "個別支援計画書"}
              </div>
              <div style={{ fontSize: 12, color: "#7a8a7a", marginTop: 4 }}>
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
                {pdfBusy ? "作成中…" : "様式PDF（個別支援計画書）"}
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

      {saveToastVisible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            background: "#2d5a3d",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
            pointerEvents: "none",
          }}
        >
          保存しました✓
        </div>
      )}

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
