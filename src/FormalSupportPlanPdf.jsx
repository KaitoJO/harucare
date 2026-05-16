const cellBd = {
  border: "1px solid #000",
};

const PAGE_W_MM = 186;

const thGray = {
  background: "#e8eae8",
  fontWeight: 700,
  textAlign: "left",
};

const tdBase = {
  ...cellBd,
  padding: "4px 6px",
  fontSize: 9.2,
  lineHeight: 1.42,
  verticalAlign: "top",
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
};

const thBase = {
  ...tdBase,
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
 * html2canvas 用・個別支援計画書レイアウト。
 * doc は {@link buildFormalPlanDocument} の戻り値。
 */
export function FormalSupportPlanPdfMount({ doc }) {
  const d = doc || {};
  const stm = Array.isArray(d.shortTermGoals) ? d.shortTermGoals : [];

  const namePart = d.childName
    ? `利用児氏名：${d.childName}`
    : `利用児氏名：${FW.repeat(8)}`;
  const dob =
    String(d.birthDateDisplay || "").trim() || `${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`;
  const age = String(d.ageDisplay || "").trim();
  const childLine = normalizeLines(
    age
      ? `${namePart}（生年月日：${dob}${FW}${age}）`
      : `${namePart}（生年月日：${dob}）`,
  );

  const disabilityLine = normalizeLines(String(d.disabilityHint ?? "").trim())
    ? `障害種別等：${String(d.disabilityHint)}`
    : "";

  const longTermGoal = d.longTermGoal || {};
  const footerExplainer =
    typeof d.footerExplainer === "string"
      ? d.footerExplainer
      : "提供する支援内容について、本計画書に基づき説明しました。";

  const domainRows = d.domainRows || [];
  const familyRow = d.familySupportRow || null;
  const transitionRow = d.transitionRow || null;
  const regionalRow = d.regionalSupportRow ?? d.cooperationRow ?? null;

  function formatOfficialDomainRow(row, key) {
    if (!row) return null;
    const dom = normalizeLines(String(row.domain ?? ""));
    const tgt = normalizeLines(String(row.supportTarget ?? ""));
    const body = normalizeLines(String(row.supportContent ?? ""));
    const goalMerged = dom
      ? `【観点：${dom.slice(0, 48)}${dom.length > 48 ? "…" : ""}】\n${tgt}`.trim()
      : tgt;
    return (
      <tr key={key} data-pdf-avoid-split="" style={pdfRowAvoid}>
        <td style={{ ...tdBase, width: "11%", textAlign: "center", fontWeight: 600 }}>
          {row.category ?? "本人支援"}
        </td>
        <td style={{ ...tdBase, width: "31%" }}>{goalMerged || "—"}</td>
        <td style={{ ...tdBase, width: "52%" }}>{body || "—"}</td>
        <td style={{ ...tdBase, width: "6%", textAlign: "center" }}>
          {row.priority ?? "—"}
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
        fontSize: 9.25,
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
                fontSize: 15,
                fontWeight: 800,
              }}
              colSpan={2}
            >
              {typeof d.titleLine === "string" ? d.titleLine : "個別支援計画書"}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <td style={{ ...tdBase, width: "70%", fontSize: 9.25 }}>{childLine}</td>
            <td style={{ ...tdBase, width: "30%", fontSize: 9.25, verticalAlign: "top" }}>
              作成年月日：
              {String(d.creationDateJp ?? "").trim() ||
                `${FW.repeat(4)}年${FW.repeat(4)}月${FW.repeat(2)}日`}
            </td>
          </tr>
          {disabilityLine ? (
            <tr style={pdfRowAvoid} data-pdf-avoid-split="">
              <td colSpan={2} style={{ ...tdBase, fontSize: 8.85 }}>
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
        <tbody>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "20%" }}>
              利用児及び家族の生活に対する意向
            </th>
            <td colSpan={2} style={{ ...tdBase, minHeight: 48 }}>
              {String(d.familyIntentions ?? "").trim()}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase }}>総合的な支援の方針</th>
            <td colSpan={2} style={{ ...tdBase, minHeight: 44 }}>
              {String(d.comprehensiveSupportPolicy ?? "").trim()}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "20%" }}>
              {"長期目標\n（内容・期間等）"}
            </th>
            <td style={{ ...tdBase, width: "53%" }}>
              【内容】{longTermGoal.content}
              {"\n"}
              【期間等】{longTermGoal.period}
            </td>
            <td
              rowSpan={2}
              style={{
                ...tdBase,
                width: "27%",
                borderLeft: cellBd.border,
              }}
            >
              <span style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                支援の標準的な提供時間等
                {"\n"}
                （曜日・頻度、時間）
              </span>
              {String(d.standardProvision ?? "").trim()}
            </td>
          </tr>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase }}>
              {"短期目標\n（内容・期間等）"}
            </th>
            <td style={{ ...tdBase }}>
              {stm.slice(0, 6).map((row, i) => (
                <div key={`st-${String(i)}`} style={{ marginBottom: row?.content ? 6 : 0 }}>
                  【短期ねらい{i + 1}（内容）】{row.content}
                  {"\n"}
                  【期間等】{row.periodGuess ?? ""}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontWeight: 700, marginBottom: 3, fontSize: 9.4 }}>
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
        <thead>
          <tr style={pdfRowAvoid} data-pdf-avoid-split="">
            <th style={{ ...thBase, width: "11%", textAlign: "center" }}>項目</th>
            <th style={{ ...thBase, width: "31%" }}>
              支援目標
              {"\n"}
              （具体的な到達目標）
            </th>
            <th style={{ ...thBase, width: "52%" }}>
              支援内容
              {"\n"}
              （内容・支援の提供上のポイント・5領域）
            </th>
            <th style={{ ...thBase, width: "6%", textAlign: "center" }}>優先順位</th>
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
          fontSize: 9,
          marginBottom: 8,
          lineHeight: 1.55,
          border: cellBd.border,
          padding: "6px 8px",
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
            <th style={{ ...thBase, width: "28%" }}>
              児童発達支援管理責任者氏名
            </th>
            <td style={{ ...tdBase, minHeight: 40, width: "42%" }} />
            <td
              style={{
                ...tdBase,
                width: "30%",
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
