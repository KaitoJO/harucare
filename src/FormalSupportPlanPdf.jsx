import { PDF_FW, pdfBlock, pdfOneLine } from "./pdfPlainText.js";

const cellBd = { border: "1px solid #000" };
const PAGE_W_MM = 186;
const BODY_PT = 7.1;
const TH_PT = 7.35;
const TITLE_PT = 12.5;

const thGray = { background: "#e8eae8", fontWeight: 700, textAlign: "left" };

const tdBase = {
  ...cellBd,
  padding: "2px 4px",
  fontSize: BODY_PT,
  lineHeight: 1.36,
  verticalAlign: "top",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

const thBase = { ...tdBase, fontSize: TH_PT, ...thGray };

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

function renderDetailTableHead() {
  return (
    <thead>
      <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
        <th style={{ ...thBase, width: "9%", textAlign: "center" }}>項目</th>
        <th style={{ ...thBase, width: "22%" }}>
          {"支援目標\n（具体的な到達目標）"}
        </th>
        <th style={{ ...thBase, width: "44%" }}>
          {"支援内容\n（5領域・提供上のポイント等）"}
        </th>
        <th style={{ ...thBase, width: "7%", textAlign: "center" }}>期間</th>
        <th style={{ ...thBase, width: "12%" }}>留意事項</th>
        <th style={{ ...thBase, width: "6%", textAlign: "center" }}>優先</th>
      </tr>
    </thead>
  );
}

function renderSupportDetailRow(row, categoryCell, defaultSupportPeriod, rowKey) {
  if (!row) return null;
  const dom = pdfOneLine(row.domain ?? "");
  const tgt = pdfBlock(row.supportTarget ?? "");
  const body = pdfBlock(row.supportContent ?? "");
  const goalText = dom ? `〔${dom}〕\n${tgt}`.trim() : tgt;
  return (
    <tr key={rowKey} data-pdf-avoid-split="" style={pdfRowAvoid}>
      {categoryCell}
      <td style={{ ...tdBase }}>{goalText || "—"}</td>
      <td style={{ ...tdBase }}>{body || "—"}</td>
      <td style={{ ...tdBase, textAlign: "center", fontSize: BODY_PT - 0.15 }}>
        {pdfOneLine(row.period ?? defaultSupportPeriod ?? "6か月")}
      </td>
      <td style={{ ...tdBase, fontSize: BODY_PT - 0.15 }}>
        {pdfBlock(row.notes ?? "")}
      </td>
      <td style={{ ...tdBase, textAlign: "center", width: "6%" }}>
        {pdfOneLine(row.priority ?? "—")}
      </td>
    </tr>
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
  const domainCount = Math.max(domainRows.length, 1);

  return (
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
      {/* ── 1ページ目：国の必須項目＋本人支援（5領域） ── */}
      <section data-pdf-page-sheet="1">
        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
          <tbody>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <td
                colSpan={3}
                style={{
                  ...tdBase,
                  textAlign: "center",
                  fontSize: TITLE_PT,
                  fontWeight: 800,
                  borderBottom: "none",
                  padding: "4px 2px 2px",
                }}
              >
                {pdfOneLine(d.titleLine ?? "個別支援計画書")}
                {subtitle ? `${FW}${subtitle}` : ""}
                {periodLabel ? `${FW}${periodLabel}` : ""}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <td style={{ ...tdBase, width: "52%" }} colSpan={2}>
                {childLine}
              </td>
              <td style={{ ...tdBase, width: "48%" }}>
                作成年月日：
                {pdfOneLine(d.creationDateJp ?? "").trim() ||
                  `${FW.repeat(4)}年${FW.repeat(4)}月${FW.repeat(2)}日`}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <td style={{ ...tdBase }} colSpan={2}>
                事業所名：{facility || FW.repeat(14)}
              </td>
              <td style={{ ...tdBase }}>
                障害種別等：{disability || "—"}
              </td>
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
              <th style={thBase}>利用児及び家族の生活に対する意向</th>
              <td colSpan={2} style={{ ...tdBase, minHeight: 42 }}>
                {pdfBlock(d.familyIntentions ?? "")}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={thBase}>総合的な支援の方針</th>
              <td colSpan={2} style={{ ...tdBase, minHeight: 38 }}>
                {pdfBlock(d.comprehensiveSupportPolicy ?? "")}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={thBase}>
                {"長期目標\n（内容・期間等）"}
              </th>
              <td style={{ ...tdBase, minHeight: 52 }}>
                {goalStart ? `起算日：${goalStart}\n` : ""}
                【内容】{pdfBlock(longTermGoal.content ?? "")}
                {"\n"}
                【期間等】{pdfBlock(longTermGoal.period ?? "")}
              </td>
              <td
                rowSpan={2}
                style={{ ...tdBase, minHeight: 120, borderLeft: cellBd.border }}
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
              <th style={thBase}>
                {"短期目標\n（内容・期間等）"}
              </th>
              <td style={{ ...tdBase, minHeight: 64 }}>
                {goalStart ? `起算日：${goalStart}\n` : ""}
                {stm.slice(0, 6).map((row, i) => (
                  <div
                    key={`st-${String(i)}`}
                    style={{ marginBottom: row?.content ? 3 : 0 }}
                  >
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
          style={{
            fontWeight: 700,
            fontSize: TH_PT + 0.2,
            margin: "2px 0 3px",
          }}
        >
          ○支援目標及び具体的な支援内容
        </div>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 0 })}>
          <tbody>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <td
                colSpan={6}
                style={{
                  ...tdBase,
                  fontSize: BODY_PT - 0.2,
                  textAlign: "center",
                  background: "#f4f6f4",
                  fontWeight: 600,
                }}
              >
                {FIVE_DOMAINS_LABEL}
              </td>
            </tr>
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle()}>
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "44%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} />
          </colgroup>
          {renderDetailTableHead()}
          <tbody>
            {domainRows.map((row, i) =>
              renderSupportDetailRow(
                row,
                i === 0 ? (
                  <td
                    rowSpan={domainCount}
                    style={{
                      ...tdBase,
                      textAlign: "center",
                      fontWeight: 700,
                      verticalAlign: "middle",
                    }}
                  >
                    本人支援
                  </td>
                ) : null,
                defaultPeriod,
                `dom-${String(i)}`,
              ),
            )}
          </tbody>
        </table>
      </section>

      {/* 2ページ目直前：優先的な改ページ位置 */}
      <div
        data-pdf-page-break="before"
        style={{ height: 0, margin: 0, padding: 0 }}
        aria-hidden
      />

      {/* ── 2ページ目：家族・移行・地域＋現場型付帯項目 ── */}
      <section data-pdf-page-sheet="2">
        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
          <tbody>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <td
                colSpan={6}
                style={{
                  ...tdBase,
                  fontWeight: 700,
                  fontSize: TH_PT + 0.5,
                  background: "#f4f6f4",
                }}
              >
                （続き）家族支援・移行支援・地域支援
              </td>
            </tr>
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 5 })}>
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "44%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} />
          </colgroup>
          {renderDetailTableHead()}
          <tbody>
            {page2Rows.map((row, i) =>
              renderSupportDetailRow(
                row,
                <td
                  style={{
                    ...tdBase,
                    textAlign: "center",
                    fontWeight: 700,
                    verticalAlign: "middle",
                  }}
                >
                  {pdfOneLine(row.category ?? "")}
                </td>,
                defaultPeriod,
                `p2-${String(i)}`,
              ),
            )}
          </tbody>
        </table>

        <table cellPadding={0} cellSpacing={0} style={tableStyle({ marginBottom: 4 })}>
          <tbody>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={{ ...thBase, width: "22%" }}>サービス提供時間</th>
              <td style={{ ...tdBase }}>{pdfBlock(d.serviceTimeDetail ?? d.standardProvision ?? "")}</td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={thBase}>身体拘束について</th>
              <td style={{ ...tdBase, fontSize: BODY_PT - 0.25 }}>
                {pdfBlock(d.physicalRestraintNotice ?? PHYSICAL_RESTRAINT_NOTICE)}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={thBase}>相談支援加算について</th>
              <td style={{ ...tdBase, fontSize: BODY_PT - 0.25 }}>
                {pdfBlock(d.consultationFeeNote ?? CONSULTATION_FEE_NOTE)}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={thBase}>留意点・備考</th>
              <td style={{ ...tdBase, minHeight: 36 }}>
                {pdfBlock(d.remarksNotes ?? "")}
              </td>
            </tr>
            <tr data-pdf-avoid-split="" style={pdfRowAvoid}>
              <th style={thBase}>
                {"本人及び保護者からの\n本計画書に対するご意見・ご要望"}
              </th>
              <td style={{ ...tdBase, minHeight: 40 }}>
                {pdfBlock(d.guardianOpinion ?? "特になし")}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            ...tdBase,
            border: cellBd.border,
            marginBottom: 5,
            padding: "5px 6px",
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
              <th style={{ ...thBase, width: "30%" }}>
                児童発達支援管理責任者氏名
              </th>
              <td style={{ ...tdBase, minHeight: 44, width: "42%" }} />
              <td
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
          style={{
            marginTop: 4,
            fontSize: BODY_PT - 0.35,
            color: "#333",
            lineHeight: 1.4,
          }}
        >
          {pdfBlock(d.footerNote ?? "")}
        </div>
      </section>
    </div>
  );
}
