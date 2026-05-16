const cellBd = {
  border: "1px solid #000",
};

const PAGE_W_MM = 186;

/** データセル基準（はみ出し抑制のため小さめ） */
const BODY_PT = 7.35;
/** 見出しラベルセルは本文よりごくわずか大きめ */
const TH_PT = 7.55;

const thGray = {
  background: "#e8eae8",
  fontWeight: 700,
  textAlign: "left",
};

const tdBase = {
  ...cellBd,
  padding: "2px 4px",
  fontSize: BODY_PT,
  lineHeight: 1.38,
  verticalAlign: "top",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  hyphens: "auto",
};

const thBase = {
  ...tdBase,
  fontSize: TH_PT,
  ...thGray,
};

/** html2canvas スライスで行単位分割を試みる（{@link exportSupportPlanPdf}） */
const pdfRowAvoid = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
};

/** 印字用の全角スペース */
const FW = "\u3000";

function normalizeLines(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\u3000/g, " ")
    .trim();
}

/**
 * PDF 表示用：マークダウン／装飾記号をできる限り除去しプレーン文にする。
 * （mapper 側の strip 後に残余した `###` や `**` 等にも対応）
 */
function markdownToPdfPlain(input) {
  let s = String(input ?? "");

  /** フェンスコード：中身のみ残す／空なら削除 */
  s = s.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, inner) =>
    String(inner ?? "").trim(),
  );

  /** 画像 ![alt](u) とリンク [label](url) */
  s = s.replace(/!\[([^\]]*)]\([^)]*\)/g, "$1");
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");

  /** 見出し行の #（行頭のみ）および文中のシャープ並びの装飾 */
  s = s.replace(/^[ \t]{0,8}#{1,6}[ \t]+/gm, "");
  /** 単独行に #### のみ等 */
  s = s.replace(/^#{1,6}\s*$/gm, "");

  /** リスト・番号リスト */
  s = s.replace(/^[ \t]*(?:[-*+]|•)[ \t]+/gm, "");
  s = s.replace(/^[ \t]*\d+[.)][ \t]+/gm, "");
  /** 引用 */
  s = s.replace(/^[ \t]*>[ \t]*/gm, "");

  /** 水平線など */
  s = s.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");

  /** インデインライン：`code`、`~~del~~` */
  for (let i = 0; i < 10 && /`[^`]*`/.test(s); i += 1) {
    s = s.replace(/`([^`]*)`/g, "$1");
  }
  s = s.replace(/~~([^~]+)~~/g, "$1");

  /** **太字** / __太字__（ネストにも対応） */
  for (let i = 0; i < 10 && (/\*\*/.test(s) || /__[^_]*__/.test(s)); i += 1) {
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
    s = s.replace(/__(?!_)([^_]*)__/g, "$1");
  }

  /** `*短文*` `_短文_` 形の単独強調を除去（太字処理後のみ） */
  for (let j = 0; j < 6; j += 1) {
    const next = s
      .replace(/(^|[\s\n])\*([^*\n]+)\*(?=[\s\n]|$)/g, "$1$2")
      .replace(/(^|[\s\n])_([^_\n\r]+)_(?=[\s\n]|$)/g, "$1$2");
    if (next === s) break;
    s = next;
  }

  /** 段落中に混入したシャープ並び ### */
  s = s.replace(/(^|\s)#{3,}(?=\s|$)/gm, "$1");

  /** 単独のアスタ／アンダー連続のみ */
  s = s.replace(/[*_]{2,}/g, "");

  /** 行頭のシャープ残骸（スペースなしの ### 等） */
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, "");

  /** 残存のマークダウン風装飾 */
  s = s.replace(/\\/g, "");

  /** 複数空白・改行の整理（セルは pre-wrap で改行自体は許容） */
  s = s.replace(/[ \t]+\n/g, "\n");
  return s.trim();
}

/** 氏名など：改行を潰して1行へ */
function pdfOneLine(v) {
  return normalizeLines(markdownToPdfPlain(v));
}

/** 複数段落：Markdown だけ除去して改行は維持 */
function pdfBlock(v) {
  return markdownToPdfPlain(v);
}

/**
 * html2canvas 用・個別支援計画書レイアウト。
 * doc は {@link buildFormalPlanDocument} の戻り値。
 */
export function FormalSupportPlanPdfMount({ doc }) {
  const d = doc || {};
  const stm = Array.isArray(d.shortTermGoals) ? d.shortTermGoals : [];

  const namePart = d.childName
    ? `利用児氏名：${pdfOneLine(d.childName)}`
    : `利用児氏名：${FW.repeat(8)}`;
  const dob =
    pdfOneLine(d.birthDateDisplay || "").trim() ||
    `${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`;
  const age = pdfOneLine(d.ageDisplay || "").trim();
  const childLine = normalizeLines(
    age
      ? `${namePart}（生年月日：${dob}${FW}${age}）`
      : `${namePart}（生年月日：${dob}）`,
  );

  const disabilityHintPlain = pdfOneLine(d.disabilityHint ?? "");
  const disabilityLine = disabilityHintPlain
    ? `障害種別等：${disabilityHintPlain}`
    : "";

  const longTermGoal = d.longTermGoal || {};
  const footerExplainer =
    typeof d.footerExplainer === "string"
      ? markdownToPdfPlain(d.footerExplainer)
      : "提供する支援内容について、本計画書に基づき説明しました。";

  const domainRows = d.domainRows || [];
  const familyRow = d.familySupportRow || null;
  const transitionRow = d.transitionRow || null;
  const regionalRow = d.regionalSupportRow ?? d.cooperationRow ?? null;

  function formatOfficialDomainRow(row, key) {
    if (!row) return null;
    const dom = pdfOneLine(row.domain ?? "");
    const tgt = pdfBlock(row.supportTarget ?? "");
    const body = pdfBlock(row.supportContent ?? "");
    const goalMerged = dom
      ? `【観点：${dom.slice(0, 48)}${dom.length > 48 ? "…" : ""}】\n${tgt}`.trim()
      : tgt;
    const catPlain = pdfOneLine(row.category ?? "");
    const priPlain = pdfOneLine(row.priority ?? "");
    return (
      <tr key={key} data-pdf-avoid-split="" style={pdfRowAvoid}>
        <td style={{ ...tdBase, width: "10%", textAlign: "center", fontWeight: 600 }}>
          {catPlain || "本人支援"}
        </td>
        <td style={{ ...tdBase, width: "27%" }}>{goalMerged || "—"}</td>
        <td style={{ ...tdBase, width: "56%" }}>{body || "—"}</td>
        <td style={{ ...tdBase, width: "7%", textAlign: "center" }}>
          {priPlain || "—"}
        </td>
      </tr>
    );
  }

  return (
    <div
      className="support-plan-pdf-root"
      style={{
        width: `${PAGE_W_MM}mm`,
        maxWidth: `${PAGE_W_MM}mm`,
        boxSizing: "border-box",
        padding: "3mm 2mm 4mm",
        background: "#fff",
        color: "#000",
        fontFamily:
          "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
        fontSize: BODY_PT,
      }}
    >
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: 5,
          ...cellBd,
          tableLayout: "fixed",
        }}
      >
        <tbody>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <td
              style={{
                ...tdBase,
                borderBottom: cellBd.border,
                textAlign: "center",
                fontSize: 12.65,
                fontWeight: 800,
              }}
              colSpan={2}
            >
              {pdfOneLine(typeof d.titleLine === "string" ? d.titleLine : "個別支援計画書")}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <td style={{ ...tdBase, width: "68%", fontSize: TH_PT + 0.4 }}>{childLine}</td>
            <td style={{ ...tdBase, width: "32%", fontSize: TH_PT + 0.4, verticalAlign: "top" }}>
              作成年月日：
              {pdfOneLine(d.creationDateJp ?? "").trim() ||
                `${FW.repeat(4)}年${FW.repeat(4)}月${FW.repeat(2)}日`}
            </td>
          </tr>
          {disabilityLine ? (
            <tr style={pdfRowAvoid} data-pdf-avoid-split="">
              <td colSpan={2} style={{ ...tdBase, fontSize: BODY_PT + 0.15 }}>
                {disabilityLine}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: 5,
          tableLayout: "fixed",
          ...cellBd,
        }}
      >
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "54%" }} />
          <col style={{ width: "28%" }} />
        </colgroup>
        <tbody>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "18%" }}>
              利用児及び家族の生活に対する意向
            </th>
            <td colSpan={2} style={{ ...tdBase, minHeight: 44 }}>
              {pdfBlock(d.familyIntentions ?? "")}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase }}>総合的な支援の方針</th>
            <td colSpan={2} style={{ ...tdBase, minHeight: 40 }}>
              {pdfBlock(d.comprehensiveSupportPolicy ?? "")}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "18%" }}>
              {"長期目標\n（内容・期間等）"}
            </th>
            <td style={{ ...tdBase, width: "54%", minHeight: 68 }}>
              【内容】{pdfBlock(longTermGoal.content ?? "")}
              {"\n"}
              【期間等】{pdfBlock(longTermGoal.period ?? "")}
            </td>
            <td
              rowSpan={2}
              style={{
                ...tdBase,
                width: "28%",
                minHeight: 140,
                borderLeft: cellBd.border,
              }}
            >
              <span style={{ fontWeight: 700, display: "block", marginBottom: 4, fontSize: TH_PT }}>
                支援の標準的な提供時間等
                {"\n"}
                （曜日・頻度、時間）
              </span>
              {pdfBlock(d.standardProvision ?? "")}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase }}>
              {"短期目標\n（内容・期間等）"}
            </th>
            <td style={{ ...tdBase, minHeight: 72 }}>
              {stm.slice(0, 6).map((row, i) => (
                <div key={`st-${String(i)}`} style={{ marginBottom: row?.content ? 4 : 0 }}>
                  【短期ねらい{i + 1}（内容）】{pdfBlock(row.content ?? "")}
                  {"\n"}
                  【期間等】{pdfBlock(row.periodGuess ?? "")}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontWeight: 700, marginBottom: 2, fontSize: TH_PT + 0.35 }}>
        ○支援目標及び具体的な支援内容
      </div>

      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: 6,
          tableLayout: "fixed",
          ...cellBd,
        }}
      >
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "27%" }} />
          <col style={{ width: "56%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "10%", textAlign: "center" }}>項目</th>
            <th style={{ ...thBase, width: "27%" }}>
              支援目標
              {"\n"}
              （具体的な到達目標）
            </th>
            <th style={{ ...thBase, width: "56%" }}>
              支援内容
              {"\n"}
              （内容・支援の提供上のポイント・5領域）
            </th>
            <th style={{ ...thBase, width: "7%", textAlign: "center" }}>優先順位</th>
          </tr>
        </thead>
        <tbody>
          {domainRows.map((row, i) => formatOfficialDomainRow(row, `dr-${String(i)}`))}
          {formatOfficialDomainRow(familyRow, "fam")}
          {formatOfficialDomainRow(transitionRow, "tr")}
          {formatOfficialDomainRow(regionalRow, "reg")}
        </tbody>
      </table>

      <div
        style={{
          fontSize: BODY_PT,
          marginBottom: 8,
          lineHeight: 1.45,
          border: cellBd.border,
          padding: "5px 6px",
        }}
      >
        {footerExplainer}
      </div>

      <table
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", ...cellBd }}
      >
        <tbody>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "26%", fontSize: TH_PT }}>
              児童発達支援管理責任者氏名
            </th>
            <td style={{ ...tdBase, minHeight: 48, width: "46%" }} />
            <td
              style={{
                ...tdBase,
                width: "28%",
                fontSize: TH_PT,
                textAlign: "right",
                verticalAlign: "bottom",
                whiteSpace: "pre-wrap",
              }}
            >
              {`${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日${FW.repeat(4)}（保護者署名）`}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
