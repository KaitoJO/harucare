import { PDF_FW, pdfBlock, pdfOneLine } from "./pdfPlainText.js";
import {
  SUPPORT_PLAN_PDF_CSS,
  SUPPORT_PLAN_PDF_STYLE_ID,
} from "./supportPlanPdfStyles.js";

const cellBd = { border: "1px solid #000" };
/** A4 縦・余白8mm相当の印字幅 */
const PAGE_W_MM = 194;

const FW = PDF_FW;

/** 告示様式：支援目標等（4列） */
const OFFICIAL_DETAIL_COLGROUP = (
  <colgroup>
    <col style={{ width: "12%" }} />
    <col style={{ width: "28%" }} />
    <col style={{ width: "50%" }} />
    <col style={{ width: "10%" }} />
  </colgroup>
);

function tableStyle(extra = {}) {
  return {
    borderCollapse: "collapse",
    width: "100%",
    tableLayout: "fixed",
    ...cellBd,
    ...extra,
  };
}

function PdfStylesheet() {
  if (typeof document !== "undefined" && document.getElementById(SUPPORT_PLAN_PDF_STYLE_ID)) {
    return null;
  }
  return <style id={SUPPORT_PLAN_PDF_STYLE_ID}>{SUPPORT_PLAN_PDF_CSS}</style>;
}

function renderOfficialDetailHead() {
  return (
    <thead>
      <tr className="hc-avoid-split">
        <th className="hc-cell hc-label" style={{ textAlign: "center" }}>
          項目
        </th>
        <th className="hc-cell hc-label">
          {"支援目標\n（具体的な到達目標）"}
        </th>
        <th className="hc-cell hc-label">
          {"支援内容\n（内容・支援の提供上のポイント・5領域）"}
        </th>
        <th className="hc-cell hc-label" style={{ textAlign: "center" }}>
          優先順位
        </th>
      </tr>
    </thead>
  );
}

function renderOfficialDetailRow(row, categoryCell, rowKey) {
  if (!row) return null;
  const dom = pdfOneLine(row.domain ?? "");
  const goalOnly = pdfBlock(row.supportTarget ?? "");
  const contentOnly = pdfBlock(row.supportContent ?? "");
  const goalText = dom ? `〔${dom}〕\n${goalOnly}`.trim() : goalOnly;

  return (
    <tr key={rowKey}>
      {categoryCell}
      <td className="hc-cell hc-cell-pre">{goalText || "—"}</td>
      <td className="hc-cell hc-cell-pre">{contentOnly || "—"}</td>
      <td className="hc-cell" style={{ textAlign: "center" }}>
        {pdfOneLine(row.priority ?? "—")}
      </td>
    </tr>
  );
}

/**
 * 個別支援計画書 PDF（厚労省告示様式第二十・令和6年例示準拠）
 */
export function FormalSupportPlanPdfMount({ doc }) {
  const d = doc || {};
  const stm = Array.isArray(d.shortTermGoals) ? d.shortTermGoals : [];
  const domainRows = Array.isArray(d.domainRows) ? d.domainRows : [];
  const ancillaryRows = [
    d.familySupportRow,
    d.transitionRow,
    d.regionalSupportRow ?? d.cooperationRow,
  ].filter(Boolean);

  const longTermGoal = d.longTermGoal || {};
  const domainCount = Math.max(domainRows.length, 1);

  const childName = pdfOneLine(d.childName ?? "");
  const dob =
    pdfOneLine(d.birthDateDisplay ?? "").trim() ||
    `${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`;
  const age = pdfOneLine(d.ageDisplay ?? "").trim();
  const childHeader = childName
    ? `利用児氏名：${childName}（生年月日：${dob}${age ? `${FW}${age}` : ""}）`
    : `利用児氏名：${FW.repeat(8)}（生年月日：${dob}）`;

  const disability = pdfOneLine(d.disabilityHint ?? "");

  return (
    <>
      <PdfStylesheet />
      <div
        className="support-plan-pdf-root hc-support-plan"
        style={{
          width: `${PAGE_W_MM}mm`,
          maxWidth: `${PAGE_W_MM}mm`,
          padding: 0,
          background: "#fff",
          fontFamily:
            "'Noto Sans JP', 'MS PGothic', 'Hiragino Kaku Gothic ProN', sans-serif",
        }}
      >
        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
          <tbody>
            <tr className="hc-avoid-split">
              <td
                colSpan={2}
                className="hc-cell hc-section-header"
                style={{
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "12pt",
                  borderBottom: "none",
                }}
              >
                個別支援計画書
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <td className="hc-cell hc-cell-pre" style={{ width: "62%" }}>
                {childHeader}
                {disability ? `\n障害種別等：${disability}` : ""}
              </td>
              <td className="hc-cell" style={{ width: "38%" }}>
                作成年月日：
                {pdfOneLine(d.creationDateJp ?? "").trim() ||
                  `${FW.repeat(4)}年${FW.repeat(4)}月${FW.repeat(2)}日`}
              </td>
            </tr>
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "52%" }} />
            <col style={{ width: "30%" }} />
          </colgroup>
          <tbody>
            <tr className="hc-avoid-split">
              <th className="hc-cell hc-label">
                利用児及び家族の生活に対する意向
              </th>
              <td colSpan={2} className="hc-cell hc-cell-pre">
                {pdfBlock(d.familyIntentions ?? "")}
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-cell hc-label">総合的な支援の方針</th>
              <td colSpan={2} className="hc-cell hc-cell-pre">
                {pdfBlock(d.comprehensiveSupportPolicy ?? "")}
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-cell hc-label">
                {"長期目標\n（内容・期間等）"}
              </th>
              <td className="hc-cell hc-cell-pre">
                【内容】{pdfBlock(longTermGoal.content ?? "")}
                {"\n"}
                【期間等】{pdfBlock(longTermGoal.period ?? "")}
              </td>
              <td
                rowSpan={2}
                className="hc-cell hc-cell-pre"
                style={{ borderLeft: cellBd.border }}
              >
                <span style={{ fontWeight: 700 }}>
                  支援の標準的な提供時間等
                </span>
                {"\n"}
                （曜日・頻度、時間）
                {"\n"}
                {pdfBlock(d.standardProvision ?? "")}
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-cell hc-label">
                {"短期目標\n（内容・期間等）"}
              </th>
              <td className="hc-cell hc-cell-pre">
                {stm.slice(0, 6).map((row, i) => (
                  <div key={`st-${String(i)}`}>
                    {i > 0 ? "\n" : ""}
                    【短期目標{i + 1}（内容）】{pdfBlock(row.content ?? "")}
                    {row?.periodGuess ? (
                      <>
                        {"\n"}
                        【期間等】{pdfBlock(row.periodGuess ?? "")}
                      </>
                    ) : null}
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          className="hc-section-header"
          style={{ fontWeight: 700, margin: "3px 0 4px", paddingLeft: 2 }}
        >
          ○支援目標及び具体的な支援内容
        </div>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
          {OFFICIAL_DETAIL_COLGROUP}
          {renderOfficialDetailHead()}
          <tbody>
            {domainRows.map((row, i) =>
              renderOfficialDetailRow(
                row,
                i === 0 ? (
                  <td
                    rowSpan={domainCount}
                    className="hc-cell"
                    style={{
                      textAlign: "center",
                      fontWeight: 700,
                      verticalAlign: "middle",
                    }}
                  >
                    本人支援
                  </td>
                ) : null,
                `dom-${String(i)}`,
              ),
            )}
            {ancillaryRows.map((row, i) =>
              renderOfficialDetailRow(
                row,
                <td
                  className="hc-cell"
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    verticalAlign: "middle",
                  }}
                >
                  {pdfOneLine(row.category ?? "")}
                </td>,
                `anc-${String(i)}`,
              ),
            )}
          </tbody>
        </table>

        <div
          className="hc-cell hc-cell-pre"
          style={{
            border: cellBd.border,
            marginBottom: 4,
            padding: "6px 8px",
          }}
        >
          提供する支援内容について、本計画書に基づき説明しました。
        </div>

        <table cellPadding={0} cellSpacing={0} style={tableStyle()}>
          <tbody>
            <tr className="hc-avoid-split">
              <th className="hc-cell hc-label" style={{ width: "32%" }}>
                児童発達支援管理責任者氏名
              </th>
              <td className="hc-cell" style={{ width: "38%" }} />
              <td className="hc-cell" style={{ width: "30%", textAlign: "right" }}>
                {`${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`}
                {"\n"}
                （保護者署名）
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
