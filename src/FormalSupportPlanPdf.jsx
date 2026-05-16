import { PDF_FULLWIDTH_SPACE, toPdfBlock, toPdfLine } from "./supportPlanPdfText.js";
import {
  SUPPORT_PLAN_PDF_CSS,
  SUPPORT_PLAN_PDF_STYLE_ID,
} from "./supportPlanPdfStyles.js";

const FW = PDF_FULLWIDTH_SPACE;

function PdfStylesheet() {
  if (typeof document !== "undefined" && document.getElementById(SUPPORT_PLAN_PDF_STYLE_ID)) {
    return null;
  }
  return <style id={SUPPORT_PLAN_PDF_STYLE_ID}>{SUPPORT_PLAN_PDF_CSS}</style>;
}

function TextCell({ children, className = "" }) {
  return (
    <td className={`hc-text-block ${className}`.trim()}>{children || "—"}</td>
  );
}

function DetailRow({ row, categoryCell, rowKey }) {
  if (!row) return null;
  const domain = toPdfLine(row.domain);
  const goal = toPdfBlock(row.supportTarget);
  const goalText = domain ? `〔${domain}〕\n${goal}`.trim() : goal;

  return (
    <tr key={rowKey} className="hc-avoid-split">
      {categoryCell}
      <TextCell>{goalText}</TextCell>
      <TextCell>{toPdfBlock(row.supportContent)}</TextCell>
      <TextCell className="hc-center">{toPdfBlock(row.period)}</TextCell>
      <td className="hc-center">{toPdfLine(row.priority) || "—"}</td>
      <TextCell>{toPdfBlock(row.notes)}</TextCell>
    </tr>
  );
}

/**
 * 個別支援計画書 PDF 本体（構造のみ。見た目は supportPlanPdfStyles.js）
 * @param {{ doc?: import("./supportPlanMapper.js").ReturnType<typeof import("./supportPlanMapper.js").buildFormalPlanDocument> }} props
 */
export function FormalSupportPlanPdfMount({ doc }) {
  const d = doc || {};
  const shortTermGoals = Array.isArray(d.shortTermGoals) ? d.shortTermGoals : [];
  const domainRows = Array.isArray(d.domainRows) ? d.domainRows : [];
  const ancillaryRows = [d.familySupportRow, d.transitionRow, d.regionalSupportRow].filter(
    Boolean,
  );
  const domainCount = Math.max(domainRows.length, 1);

  const childName = toPdfLine(d.childName);
  const dob =
    toPdfLine(d.birthDateDisplay) ||
    `${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`;
  const age = toPdfLine(d.ageDisplay);
  const childHeader = childName
    ? `利用児氏名：${childName}（生年月日：${dob}${age ? `${FW}${age}` : ""}）`
    : `利用児氏名：${FW.repeat(8)}（生年月日：${dob}）`;
  const disability = toPdfLine(d.disabilityHint);
  const creationDate =
    toPdfLine(d.creationDateJp) ||
    `${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`;

  return (
    <>
      <PdfStylesheet />
      <div className="support-plan-pdf-root hc-support-plan">
        <section className="section">
          <table className="hc-table">
            <tbody>
              <tr className="hc-avoid-split">
                <td colSpan={2} className="hc-title-cell">
                  {toPdfLine(d.title) || "個別支援計画書"}
                </td>
              </tr>
              <tr className="hc-avoid-split">
                <td className="hc-text-block">
                  {childHeader}
                  {disability ? `\n障害種別等：${disability}` : ""}
                </td>
                <td>作成年月日：{creationDate}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section">
          <table className="hc-table">
            <tbody>
              <tr className="hc-avoid-split">
                <th className="hc-label">利用児及び家族の生活に対する意向</th>
                <td colSpan={2} className="hc-text-block">
                  {toPdfBlock(d.familyIntentions)}
                </td>
              </tr>
              <tr className="hc-avoid-split">
                <th className="hc-label">総合的な支援の方針</th>
                <td colSpan={2} className="hc-text-block">
                  {toPdfBlock(d.comprehensivePolicy)}
                </td>
              </tr>
              <tr className="hc-avoid-split hc-long-term-goal-row">
                <th className="hc-label">{"長期目標\n（内容・期間等）"}</th>
                <td colSpan={2} className="hc-text-block">
                  【内容】{toPdfBlock(d.longTermGoal?.content)}
                  {"\n"}
                  【期間等】{toPdfBlock(d.longTermGoal?.period)}
                </td>
              </tr>
              <tr className="hc-avoid-split hc-short-term-goal-row">
                <th className="hc-label">{"短期目標\n（内容・期間等）"}</th>
                <td colSpan={2} className="hc-text-block">
                  {shortTermGoals.slice(0, 6).map((goal, index) => (
                    <div key={`st-${String(index)}`}>
                      {index > 0 ? "\n" : ""}
                      【短期目標{index + 1}（内容）】{toPdfBlock(goal.content)}
                      {goal.period ? (
                        <>
                          {"\n"}
                          【期間等】{toPdfBlock(goal.period)}
                        </>
                      ) : null}
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section">
          <table className="hc-table">
            <tbody>
              <tr className="hc-avoid-split">
                <th className="hc-label">
                  {"支援の標準的な提供時間等\n（月別スケジュール）"}
                </th>
                <td colSpan={2} className="hc-text-block">
                  {toPdfBlock(d.monthlySchedule)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section">
          <p className="hc-section-title">○支援目標及び具体的な支援内容</p>
          <table className="hc-table hc-detail-table">
            <colgroup>
              <col className="col-item" />
              <col className="col-goal" />
              <col className="col-content" />
              <col className="col-period" />
              <col className="col-priority" />
              <col className="col-notes" />
            </colgroup>
            <thead>
              <tr className="hc-avoid-split">
                <th className="hc-label hc-center">{"項目\n（本人支援等）"}</th>
                <th className="hc-label">{"支援目標\n（具体的な到達目標）"}</th>
                <th className="hc-label">
                  {"支援内容\n（内容・支援の提供上のポイント・5領域）"}
                </th>
                <th className="hc-label hc-center">期間</th>
                <th className="hc-label hc-center">優先順位</th>
                <th className="hc-label hc-center">留意事項</th>
              </tr>
            </thead>
            <tbody>
              {domainRows.map((row, index) => (
                <DetailRow
                  key={`domain-${String(index)}`}
                  row={row}
                  rowKey={`domain-${String(index)}`}
                  categoryCell={
                    index === 0 ? (
                      <td rowSpan={domainCount} className="hc-center">
                        <strong>本人支援</strong>
                      </td>
                    ) : null
                  }
                />
              ))}
              {ancillaryRows.map((row, index) => (
                <DetailRow
                  key={`anc-${String(index)}`}
                  row={row}
                  rowKey={`anc-${String(index)}`}
                  categoryCell={
                    <td className="hc-center">
                      <strong>{toPdfLine(row.category)}</strong>
                    </td>
                  }
                />
              ))}
            </tbody>
          </table>
        </section>

        <section className="section">
          <table className="hc-table">
            <tbody>
              <tr className="hc-avoid-split">
                <th className="hc-label hc-appendix-label">
                  {"サービス提供時間\n（曜日・時間）"}
                </th>
                <td colSpan={2} className="hc-text-block hc-appendix-value">
                  {toPdfBlock(d.serviceTimeDetail)}
                </td>
              </tr>
              <tr className="hc-avoid-split">
                <th className="hc-label hc-appendix-label">身体拘束等について</th>
                <td colSpan={2} className="hc-text-block hc-appendix-value">
                  {toPdfBlock(d.physicalRestraintNote)}
                </td>
              </tr>
              <tr className="hc-avoid-split">
                <th className="hc-label hc-appendix-label">相談支援加算等</th>
                <td colSpan={2} className="hc-text-block hc-appendix-value">
                  {toPdfBlock(d.consultationSupportAddition)}
                </td>
              </tr>
              <tr className="hc-avoid-split">
                <th className="hc-label hc-appendix-label">留意点・備考</th>
                <td colSpan={2} className="hc-text-block hc-appendix-value">
                  {toPdfBlock(d.remarksNotes)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section">
          <p className="hc-explanation hc-text-block">
            {toPdfBlock(d.explanationLine)}
          </p>
          <table className="hc-table">
            <tbody>
              <tr className="hc-avoid-split">
                <th className="hc-label hc-signature-label">
                  児童発達支援管理責任者氏名
                </th>
                <td className="hc-signature-name">{toPdfLine(d.managerName)}</td>
                <td className="hc-signature-date">
                  {`${FW.repeat(4)}年${FW.repeat(2)}月${FW.repeat(2)}日`}
                  {"\n"}
                  （保護者署名）
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
