import { PDF_FW, pdfBlock, pdfOneLine } from "./pdfPlainText.js";
import {
  SUPPORT_PLAN_PDF_CSS,
  SUPPORT_PLAN_PDF_STYLE_ID,
} from "./supportPlanPdfStyles.js";

const cellBd = { border: "1px solid #000" };

/** A4 210mm − 左右余白 8mm×2 */
const PAGE_W_MM = 194;

const thGray = { background: "#e8eae8", fontWeight: 700, textAlign: "left" };

const tdBase = {
  ...cellBd,
  padding: "4px 6px",
  verticalAlign: "top",
  className: "hc-cell",
};

const thBase = {
  ...tdBase,
  ...thGray,
  className: "hc-cell",
};

const rowAvoidClass = "hc-avoid-split";

const FW = PDF_FW;

const DETAIL_COLGROUP = (
  <colgroup>
    <col style={{ width: "10%" }} />
    <col style={{ width: "28%" }} />
    <col style={{ width: "42%" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "7%" }} />
    <col style={{ width: "5%" }} />
  </colgroup>
);

const FIVE_DOMAINS_LABEL =
  "【5領域】健康・生活／運動・感覚／認知・行為／言語・コミュニケーション／人間関係・社会性";

const PHYSICAL_RESTRAINT_NOTICE =
  "身体拘束について：安全確保のためやむを得ず一時的に身体を拘束する場合は、事前に保護者等へ説明し同意を得たうえで実施し、実施の都度記録を残すこと。本計画において恒常的な身体拘束を前提とするものではない。";

const CONSULTATION_FEE_NOTE =
  "相談支援加算について：専門的支援や家族支援等の加算要件に該当する場合は、別途算定要件に沿って実施・記録する。";

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

function renderDetailTableHead() {
  return (
    <thead>
      <tr className={rowAvoidClass}>
        <th className="hc-cell" style={{ textAlign: "center" }}>
          項目
        </th>
        <th className="hc-cell">
          {"支援目標\n（具体的な到達目標）"}
        </th>
        <th className="hc-cell">
          {"支援内容\n（5領域・提供上のポイント等）"}
        </th>
        <th className="hc-cell" style={{ textAlign: "center" }}>
          期間
        </th>
        <th className="hc-cell">留意事項</th>
        <th className="hc-cell" style={{ textAlign: "center" }}>
          優先
        </th>
      </tr>
    </thead>
  );
}

/** 1行 = 項目｜支援目標(td)｜支援内容(td)｜期間｜留意｜優先（同一 tr） */
function renderDetailRow(row, categoryCell, defaultPeriod, rowKey) {
  if (!row) return null;
  const dom = pdfOneLine(row.domain ?? "");
  const goalOnly = pdfBlock(row.supportTarget ?? "");
  const contentOnly = pdfBlock(row.supportContent ?? "");
  const goalText = dom ? `〔${dom}〕 ${goalOnly}`.trim() : goalOnly;

  return (
    <tr key={rowKey}>
      {categoryCell}
      <td className="hc-cell">{goalText || "—"}</td>
      <td className="hc-cell">{contentOnly || "—"}</td>
      <td className="hc-cell" style={{ textAlign: "center" }}>
        {pdfOneLine(row.period ?? defaultPeriod ?? "6か月")}
      </td>
      <td className="hc-cell">{pdfBlock(row.notes ?? "")}</td>
      <td className="hc-cell" style={{ textAlign: "center" }}>
        {pdfOneLine(row.priority ?? "—")}
      </td>
    </tr>
  );
}

/**
 * HaruCare 個別支援計画書（テーブル固定レイアウト）
 * doc は {@link buildFormalPlanDocument} の戻り値。
 */
export function FormalSupportPlanPdfMount({ doc }) {
  const d = doc || {};
  const stm = Array.isArray(d.shortTermGoals) ? d.shortTermGoals : [];
  const domainRows = Array.isArray(d.domainRows) ? d.domainRows : [];
  const page2Rows = [
    d.familySupportRow,
    d.transitionRow,
    d.regionalSupportRow ?? d.cooperationRow,
  ].filter(Boolean);

  const longTermGoal = d.longTermGoal || {};
  const goalStart = pdfOneLine(d.goalStartDateJp ?? d.creationDateJp ?? "");
  const subtitle = pdfOneLine(d.subtitleLine ?? "《原案》");
  const periodLabel = pdfOneLine(d.planPeriodLabel ?? "第1期");
  const defaultPeriod = pdfOneLine(d.defaultSupportPeriod ?? "6か月");
  const domainCount = Math.max(domainRows.length, 1);

  const childLine = (() => {
    const name = d.childName
      ? `児童名：${pdfOneLine(d.childName)}`
      : `児童名：${FW.repeat(6)}`;
    const dob =
      pdfOneLine(d.birthDateDisplay ?? "").trim() ||
      `${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`;
    const age = pdfOneLine(d.ageDisplay ?? "").trim();
    return age
      ? `${name}（生年月日：${dob}${FW}${age}）`
      : `${name}（生年月日：${dob}）`;
  })();

  const facility = pdfOneLine(d.facilityName ?? "");
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
          color: "#000",
          fontFamily:
            "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
        }}
      >
        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 3 })}>
          <tbody>
            <tr className={rowAvoidClass}>
              <td
                colSpan={3}
                className="hc-cell hc-section-header"
                style={{ textAlign: "center", fontWeight: 800, fontSize: "11pt" }}
              >
                {pdfOneLine(d.titleLine ?? "個別支援計画書")}
                {subtitle ? `${FW}${subtitle}` : ""}
                {periodLabel ? `${FW}${periodLabel}` : ""}
              </td>
            </tr>
            <tr className={rowAvoidClass}>
              <td className="hc-cell" colSpan={2}>
                {childLine}
              </td>
              <td className="hc-cell">
                作成年月日：
                {pdfOneLine(d.creationDateJp ?? "").trim() ||
                  `${FW.repeat(4)}年${FW.repeat(4)}月${FW.repeat(2)}日`}
              </td>
            </tr>
            <tr className={rowAvoidClass}>
              <td className="hc-cell" colSpan={2}>
                事業所名：{facility || FW.repeat(12)}
              </td>
              <td className="hc-cell">障害種別等：{disability || "—"}</td>
            </tr>
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 3 })}>
          <colgroup>
            <col style={{ width: "17%" }} />
            <col style={{ width: "55%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <tbody>
            <tr className={rowAvoidClass}>
              <th className="hc-cell" style={thBase}>
                利用児及び家族の生活に対する意向
              </th>
              <td colSpan={2} className="hc-cell" style={tdBase}>
                {pdfBlock(d.familyIntentions ?? "")}
              </td>
            </tr>
            <tr className={rowAvoidClass}>
              <th className="hc-cell" style={thBase}>
                総合的な支援の方針
              </th>
              <td colSpan={2} className="hc-cell" style={tdBase}>
                {pdfBlock(d.comprehensiveSupportPolicy ?? "")}
              </td>
            </tr>
            <tr className={rowAvoidClass}>
              <th className="hc-cell" style={thBase}>
                {"長期目標\n（内容・期間等）"}
              </th>
              <td className="hc-cell" style={tdBase}>
                {goalStart ? `起算日：${goalStart} ` : ""}
                【内容】{pdfBlock(longTermGoal.content ?? "")}
                {" "}
                【期間等】{pdfBlock(longTermGoal.period ?? "")}
              </td>
              <td
                rowSpan={2}
                className="hc-cell"
                style={{ ...tdBase, borderLeft: cellBd.border }}
              >
                <span style={{ fontWeight: 700 }}>支援の標準的な提供時間等</span>
                {" "}
                （曜日・頻度、時間）
                {" "}
                {pdfBlock(d.standardProvision ?? "")}
              </td>
            </tr>
            <tr className={rowAvoidClass}>
              <th className="hc-cell" style={thBase}>
                {"短期目標\n（内容・期間等）"}
              </th>
              <td className="hc-cell" style={tdBase}>
                {goalStart ? `起算日：${goalStart} ` : ""}
                {stm.slice(0, 4).map((row, i) => (
                  <span key={`st-${String(i)}`}>
                    {i > 0 ? " " : ""}
                    ●短期{i + 1}：{pdfBlock(row.content ?? "")}
                    {row?.periodGuess
                      ? `（${pdfBlock(row.periodGuess ?? "")}）`
                      : ""}
                  </span>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          className="hc-section-header hc-cell"
          style={{ fontWeight: 700, margin: "2px 0", border: "none", padding: "2px 4px" }}
        >
          ○支援目標及び具体的な支援内容
        </div>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 3 })}>
          {DETAIL_COLGROUP}
          <tbody>
            <tr className={rowAvoidClass}>
              <td
                colSpan={6}
                className="hc-cell"
                style={{ textAlign: "center", background: "#f4f6f4", fontWeight: 600 }}
              >
                {FIVE_DOMAINS_LABEL}
              </td>
            </tr>
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 3 })}>
          {DETAIL_COLGROUP}
          {renderDetailTableHead()}
          <tbody>
            {domainRows.map((row, i) =>
              renderDetailRow(
                row,
                i === 0 ? (
                  <td
                    rowSpan={domainCount}
                    className="hc-cell"
                    style={{ textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}
                  >
                    本人支援
                  </td>
                ) : null,
                defaultPeriod,
                `dom-${String(i)}`,
              ),
            )}
            {page2Rows.map((row, i) =>
              renderDetailRow(
                row,
                <td
                  className="hc-cell"
                  style={{ textAlign: "center", fontWeight: 700, verticalAlign: "middle" }}
                >
                  {pdfOneLine(row.category ?? "")}
                </td>,
                defaultPeriod,
                `p2-${String(i)}`,
              ),
            )}
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 3 })}>
          <tbody>
            <tr className={rowAvoidClass}>
              <th className="hc-cell" style={{ ...thBase, width: "22%" }}>
                サービス提供時間
              </th>
              <td className="hc-cell" style={tdBase}>
                {pdfBlock(d.serviceTimeDetail ?? d.standardProvision ?? "")}
              </td>
            </tr>
            <tr>
              <th className="hc-cell" style={thBase}>
                身体拘束について
              </th>
              <td className="hc-cell" style={tdBase}>
                {pdfBlock(d.physicalRestraintNotice ?? PHYSICAL_RESTRAINT_NOTICE)}
              </td>
            </tr>
            <tr>
              <th className="hc-cell" style={thBase}>
                相談支援加算について
              </th>
              <td className="hc-cell" style={tdBase}>
                {pdfBlock(d.consultationFeeNote ?? CONSULTATION_FEE_NOTE)}
              </td>
            </tr>
            <tr>
              <th className="hc-cell" style={thBase}>
                留意点・備考
              </th>
              <td className="hc-cell" style={tdBase}>
                {pdfBlock(d.remarksNotes ?? "")}
              </td>
            </tr>
            <tr>
              <th className="hc-cell" style={thBase}>
                {"本人及び保護者からのご意見・ご要望"}
              </th>
              <td className="hc-cell" style={tdBase}>
                {pdfBlock(d.guardianOpinion ?? "特になし")}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="hc-cell" style={{ border: cellBd.border, marginBottom: 3, padding: "4px 6px" }}>
          {pdfBlock(
            d.footerExplainer ??
              "提供する支援内容について、本計画書に基づき説明しました。",
          )}
        </div>

        <table cellPadding={0} cellSpacing={0} style={tableStyle()}>
          <tbody>
            <tr className={rowAvoidClass}>
              <th className="hc-cell" style={{ ...thBase, width: "30%" }}>
                児童発達支援管理責任者氏名
              </th>
              <td className="hc-cell" style={tdBase} />
              <td className="hc-cell" style={{ ...tdBase, textAlign: "right" }}>
                {`${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日（保護者署名）`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
