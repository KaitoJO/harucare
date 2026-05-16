import { PDF_FW, pdfBlock, pdfOneLine } from "./pdfPlainText.js";
import {
  SUPPORT_PLAN_PDF_CSS,
  SUPPORT_PLAN_PDF_STYLE_ID,
} from "./supportPlanPdfStyles.js";

const cellBd = { border: "1px solid #000" };
const PAGE_W_MM = 186;
const BODY_PT = 7.15;
const TH_PT = 7.4;
const TITLE_PT = 12.5;

const thGray = { background: "#e8eae8", fontWeight: 700, textAlign: "left" };

const cellCommon = {
  fontSize: BODY_PT,
  lineHeight: 1.38,
  border: cellBd.border,
};

const tdBase = {
  ...cellCommon,
  className: "hc-cell",
};

const thBase = {
  ...tdBase,
  fontSize: TH_PT,
  ...thGray,
  className: "hc-cell",
};

const pdfRowAvoid = { breakInside: "avoid", pageBreakInside: "avoid" };

const FW = PDF_FW;

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
  return (
    <style id={SUPPORT_PLAN_PDF_STYLE_ID}>{SUPPORT_PLAN_PDF_CSS}</style>
  );
}

function SupportDetailCardHead() {
  return (
    <div className="hc-support-card-head hc-section-header" data-pdf-avoid-split="">
      <div className="hc-cell" style={{ textAlign: "center", ...thGray }}>
        項目
      </div>
      <div className="hc-cell" style={thGray}>
        {"支援目標\n（具体的な到達目標）"}
      </div>
      <div className="hc-cell" style={thGray}>
        {"支援内容\n（5領域・提供上のポイント等）"}
      </div>
      <div className="hc-cell" style={{ ...thGray, textAlign: "center" }}>
        期間
      </div>
      <div className="hc-cell" style={thGray}>
        留意事項
      </div>
      <div className="hc-cell" style={{ ...thGray, textAlign: "center" }}>
        優先
      </div>
    </div>
  );
}

function SupportDetailCard({ row, categoryLabel, defaultSupportPeriod, cardKey }) {
  if (!row) return null;
  const dom = pdfOneLine(row.domain ?? "");
  const tgt = pdfBlock(row.supportTarget ?? "");
  const body = pdfBlock(row.supportContent ?? "");
  const goalText = dom ? `〔${dom}〕\n${tgt}`.trim() : tgt;
  const cat = pdfOneLine(categoryLabel ?? row.category ?? "");

  return (
    <div
      key={cardKey}
      className="hc-support-card"
      data-pdf-avoid-split=""
      style={pdfRowAvoid}
    >
      <div className="hc-support-card-grid">
        <div
          className="hc-cell"
          style={{ textAlign: "center", fontWeight: 700, fontSize: TH_PT }}
        >
          {cat || "—"}
        </div>
        <div className="hc-cell">{goalText || "—"}</div>
        <div className="hc-cell">{body || "—"}</div>
        <div className="hc-cell" style={{ textAlign: "center", fontSize: BODY_PT - 0.1 }}>
          {pdfOneLine(row.period ?? defaultSupportPeriod ?? "6か月")}
        </div>
        <div className="hc-cell" style={{ fontSize: BODY_PT - 0.1 }}>
          {pdfBlock(row.notes ?? "")}
        </div>
        <div className="hc-cell" style={{ textAlign: "center" }}>
          {pdfOneLine(row.priority ?? "—")}
        </div>
      </div>
    </div>
  );
}

/**
 * HaruCare 独自・個別支援計画書（国の必須項目＋現場型の長文セル／2ページ構成）
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
  const defaultPeriod = pdfOneLine(d.defaultSupportPeriod ?? "6か月");

  return (
    <>
      <PdfStylesheet />
      <div
        className="support-plan-pdf-root hc-support-plan"
        style={{
          width: `${PAGE_W_MM}mm`,
          maxWidth: `${PAGE_W_MM}mm`,
          boxSizing: "border-box",
          padding: "2mm 1.5mm 3mm",
          background: "#fff",
          color: "#000",
          fontFamily:
            "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
          fontSize: BODY_PT,
        }}
      >
        <section data-pdf-page-sheet="1">
          <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
            <tbody>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <td
                  colSpan={3}
                  className="hc-cell hc-section-header"
                  style={{
                    textAlign: "center",
                    fontSize: TITLE_PT,
                    fontWeight: 800,
                    borderBottom: "none",
                  }}
                >
                  {pdfOneLine(d.titleLine ?? "個別支援計画書")}
                  {subtitle ? `${FW}${subtitle}` : ""}
                  {periodLabel ? `${FW}${periodLabel}` : ""}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <td className="hc-cell" style={{ width: "52%" }} colSpan={2}>
                  {childLine}
                </td>
                <td className="hc-cell" style={{ width: "48%" }}>
                  作成年月日：
                  {pdfOneLine(d.creationDateJp ?? "").trim() ||
                    `${FW.repeat(4)}年${FW.repeat(4)}月${FW.repeat(2)}日`}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <td className="hc-cell" colSpan={2}>
                  事業所名：{facility || FW.repeat(14)}
                </td>
                <td className="hc-cell">障害種別等：{disability || "—"}</td>
              </tr>
            </tbody>
          </table>

          <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
            <colgroup>
              <col style={{ width: "17%" }} />
              <col style={{ width: "55%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <tbody>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  利用児及び家族の生活に対する意向
                </th>
                <td colSpan={2} className="hc-cell" style={tdBase}>
                  {pdfBlock(d.familyIntentions ?? "")}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  総合的な支援の方針
                </th>
                <td colSpan={2} className="hc-cell" style={tdBase}>
                  {pdfBlock(d.comprehensiveSupportPolicy ?? "")}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  {"長期目標\n（内容・期間等）"}
                </th>
                <td className="hc-cell" style={tdBase}>
                  {goalStart ? `起算日：${goalStart}\n` : ""}
                  【内容】{pdfBlock(longTermGoal.content ?? "")}
                  {"\n"}
                  【期間等】{pdfBlock(longTermGoal.period ?? "")}
                </td>
                <td
                  rowSpan={2}
                  className="hc-cell"
                  style={{ ...tdBase, borderLeft: cellBd.border }}
                >
                  <span style={{ fontWeight: 700, fontSize: TH_PT }}>
                    支援の標準的な提供時間等
                    {"\n"}
                    （曜日・頻度、時間）
                  </span>
                  {"\n\n"}
                  {pdfBlock(d.standardProvision ?? "")}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  {"短期目標\n（内容・期間等）"}
                </th>
                <td className="hc-cell" style={tdBase}>
                  {goalStart ? `起算日：${goalStart}\n` : ""}
                  {stm.slice(0, 6).map((row, i) => (
                    <div key={`st-${String(i)}`} style={{ marginBottom: 3 }}>
                      ●【短期{i + 1}】{pdfBlock(row.content ?? "")}
                      {row?.periodGuess ? (
                        <>
                          {"\n"}
                          （期間等）{pdfBlock(row.periodGuess ?? "")}
                        </>
                      ) : null}
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          <div
            className="hc-section-header hc-cell"
            style={{
              fontWeight: 700,
              fontSize: TH_PT + 0.2,
              margin: "2px 0 3px",
              border: "none",
              padding: "4px 2px",
            }}
          >
            ○支援目標及び具体的な支援内容
          </div>

          <div
            className="hc-cell hc-section-header"
            data-pdf-avoid-split=""
            style={{
              textAlign: "center",
              background: "#f4f6f4",
              fontWeight: 600,
              border: cellBd.border,
              marginBottom: 0,
            }}
          >
            {FIVE_DOMAINS_LABEL}
          </div>

          <div style={{ marginBottom: 4 }}>
            <SupportDetailCardHead />
            {domainRows.map((row, i) => (
              <SupportDetailCard
                key={`dom-${String(i)}`}
                cardKey={`dom-${String(i)}`}
                row={row}
                categoryLabel="本人支援"
                defaultSupportPeriod={defaultPeriod}
              />
            ))}
          </div>
        </section>

        <div
          data-pdf-page-break="before"
          style={{ height: 0, margin: 0, padding: 0 }}
          aria-hidden
        />

        <section data-pdf-page-sheet="2">
          <div
            className="hc-cell hc-section-header"
            data-pdf-avoid-split=""
            style={{
              fontWeight: 700,
              fontSize: TH_PT + 0.5,
              background: "#f4f6f4",
              border: cellBd.border,
              marginBottom: 4,
            }}
          >
            （続き）家族支援・移行支援・地域支援
          </div>

          <div style={{ marginBottom: 5 }}>
            <SupportDetailCardHead />
            {page2Rows.map((row, i) => (
              <SupportDetailCard
                key={`p2-${String(i)}`}
                cardKey={`p2-${String(i)}`}
                row={row}
                categoryLabel={row.category}
                defaultSupportPeriod={defaultPeriod}
              />
            ))}
          </div>

          <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
            <tbody>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={{ ...thBase, width: "22%" }}>
                  サービス提供時間
                </th>
                <td className="hc-cell" style={tdBase}>
                  {pdfBlock(d.serviceTimeDetail ?? d.standardProvision ?? "")}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  身体拘束について
                </th>
                <td className="hc-cell" style={tdBase}>
                  {pdfBlock(d.physicalRestraintNotice ?? PHYSICAL_RESTRAINT_NOTICE)}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  相談支援加算について
                </th>
                <td className="hc-cell" style={tdBase}>
                  {pdfBlock(d.consultationFeeNote ?? CONSULTATION_FEE_NOTE)}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  留意点・備考
                </th>
                <td className="hc-cell" style={tdBase}>
                  {pdfBlock(d.remarksNotes ?? "")}
                </td>
              </tr>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={thBase}>
                  {"本人及び保護者からの\n本計画書に対するご意見・ご要望"}
                </th>
                <td className="hc-cell" style={tdBase}>
                  {pdfBlock(d.guardianOpinion ?? "特になし")}
                </td>
              </tr>
            </tbody>
          </table>

          <div
            className="hc-cell"
            style={{
              border: cellBd.border,
              marginBottom: 5,
              lineHeight: 1.45,
            }}
          >
            {pdfBlock(
              d.footerExplainer ??
                "提供する支援内容について、本計画書に基づき説明しました。",
            )}
          </div>

          <table cellPadding={0} cellSpacing={0} style={tableStyle()}>
            <tbody>
              <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
                <th className="hc-cell" style={{ ...thBase, width: "30%" }}>
                  児童発達支援管理責任者氏名
                </th>
                <td className="hc-cell" style={{ ...tdBase, minHeight: 44, width: "42%" }} />
                <td
                  className="hc-cell"
                  style={{
                    ...tdBase,
                    width: "28%",
                    textAlign: "right",
                    verticalAlign: "bottom",
                  }}
                >
                  {`${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`}
                  {"\n"}
                  （保護者署名）
                </td>
              </tr>
            </tbody>
          </table>

          <div
            className="hc-cell"
            style={{
              marginTop: 4,
              fontSize: BODY_PT - 0.35,
              color: "#333",
              border: "none",
            }}
          >
            {pdfBlock(d.footerNote ?? "")}
          </div>
        </section>
      </div>
    </>
  );
}
