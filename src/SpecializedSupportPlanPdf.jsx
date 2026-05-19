import { normalizeMappedSpecializedPlan } from "./specializedPlanMapper.js";
import {
  SPECIALIZED_PLAN_PDF_CSS,
  SPECIALIZED_PLAN_PDF_STYLE_ID,
} from "./specializedPlanPdfStyles.js";

function PdfStylesheet() {
  if (
    typeof document !== "undefined" &&
    document.getElementById(SPECIALIZED_PLAN_PDF_STYLE_ID)
  ) {
    return null;
  }
  return <style id={SPECIALIZED_PLAN_PDF_STYLE_ID}>{SPECIALIZED_PLAN_PDF_CSS}</style>;
}

function GoalBlock({ label, goal }) {
  const g = goal ?? {};
  const domains = (g.domainLabels ?? []).join("　") || "—";
  const supportContent = [
    g.activityExamples ? `〈活動例〉\n${g.activityExamples}` : "",
    g.implementationMethod ? `〈実施方法〉\n${g.implementationMethod}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <>
      <tr className="hc-avoid-split">
        <td rowSpan={4} className="hc-goal-label">
          {label}
        </td>
        <th className="hc-label" style={{ width: "18%" }}>
          5領域
        </th>
        <td className="hc-text-block">{domains}</td>
      </tr>
      <tr className="hc-avoid-split">
        <th className="hc-label">実施タイミング</th>
        <td className="hc-text-block">{g.timing || "—"}</td>
      </tr>
      <tr className="hc-avoid-split">
        <th className="hc-label">ねらい</th>
        <td className="hc-text-block">{g.aim || "—"}</td>
      </tr>
      <tr className="hc-avoid-split">
        <th className="hc-label">具体的な支援内容</th>
        <td className="hc-text-block">{supportContent || "—"}</td>
      </tr>
    </>
  );
}

/**
 * @param {{ doc?: object }} props
 */
export function SpecializedSupportPlanPdfMount({ doc }) {
  const d = normalizeMappedSpecializedPlan(doc);
  const staff = d.supportStaff ?? [];

  return (
    <>
      <PdfStylesheet />
      <div className="specialized-plan-pdf-root hc-specialized-plan">
        <table className="hc-table">
          <tbody>
            <tr className="hc-avoid-split">
              <td colSpan={2} className="hc-title-cell">
                {d.title}
              </td>
              <td className="hc-facility-cell">
                事業所名：{d.facilityName || "　　　　　　　　　　"}
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-label-left" style={{ width: "14%" }}>
                ふりがな
              </th>
              <td style={{ width: "36%" }}>{d.childFurigana || "　"}</td>
              <td rowSpan={2} style={{ width: "50%" }}>
                <table className="hc-staff-grid">
                  <tbody>
                    <tr>
                      <td colSpan={2} className="hc-label">
                        専門的支援担当職員
                      </td>
                    </tr>
                    <tr>
                      <td>{staff[0] || ""}</td>
                      <td>{staff[1] || ""}</td>
                    </tr>
                    <tr>
                      <td>{staff[2] || ""}</td>
                      <td>{staff[3] || ""}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-label-left">児童名</th>
              <td>
                {d.childName || "　"}
                {d.birthDateDisplay ? (
                  <span style={{ marginLeft: "1.5em" }}>
                    生年月日：{d.birthDateDisplay}
                  </span>
                ) : null}
              </td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-label-left">作成日</th>
              <td colSpan={2}>{d.creationDateDisplay || "　"}</td>
            </tr>
            <tr className="hc-avoid-split">
              <th className="hc-label-left">作成者</th>
              <td>{d.authorName || "　"}</td>
              <td>
                起算日：{d.calculationStartDateDisplay || "　"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="hc-note">※個別支援計画書と符合いたします。</div>

        <table className="hc-table">
          <tbody>
            <tr className="hc-avoid-split">
              <th className="hc-label" style={{ width: "14%" }}>
                現在の状況
              </th>
              <td className="hc-text-block">{d.currentStatus || "—"}</td>
            </tr>
          </tbody>
        </table>

        <div className="hc-domain-note">
          ※５領域「健康・生活」「運動・感覚」「認知・行動」「言語・コミュニケーション」「人間関係・社会性」
        </div>

        <table className="hc-table">
          <tbody>
            <GoalBlock label="目標1" goal={d.goal1} />
            <GoalBlock label="目標2" goal={d.goal2} />
          </tbody>
        </table>

        <div className="hc-consent hc-avoid-split">
          上記の計画について説明を受け、内容に同意し、交付を受けました。
          <div className="hc-signature-row">
            <span>{d.consentDateDisplay || "令和　　　年　　月　　日"}</span>
            <span>保護者氏名：{d.guardianName || "　　　　　　　　　　"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
