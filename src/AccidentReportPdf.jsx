import { formatAccidentTypes } from "./accidentReportConfig.js";

function row(label, value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return (
    <tr>
      <th>{label}</th>
      <td>{v}</td>
    </tr>
  );
}

function sectionTitle(text) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        margin: "14px 0 8px",
        paddingBottom: 4,
        borderBottom: "1px solid #333",
        color: "#1a1a1a",
      }}
    >
      {text}
    </h2>
  );
}

function block(label, value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#444", marginBottom: 3 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          color: "#1a1a1a",
        }}
      >
        {v}
      </div>
    </div>
  );
}

/**
 * @param {{ record: object, formatJaDateTime: (iso: string) => string }} props
 */
export function AccidentReportPdfDocument({ record, formatJaDateTime }) {
  const p = record.payload ?? {};
  const types = formatAccidentTypes(p.accidentTypes).join("、");
  const major = [
    record.majorDeath ? "死亡" : null,
    record.majorFracture ? "骨折" : null,
    record.majorAbuse ? "虐待" : null,
  ]
    .filter(Boolean)
    .join("、");

  const parentContact =
    p.parentContactAt && formatJaDateTime
      ? formatJaDateTime(p.parentContactAt)
      : [p.parentContactDate, p.parentContactTime].filter(Boolean).join(" ");

  return (
    <div
      className="accident-report-pdf-root"
      style={{
        width: "190mm",
        padding: "12mm 14mm",
        fontFamily: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
        fontSize: 11,
        color: "#1a1a1a",
        background: "#fff",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          fontSize: 16,
          fontWeight: 700,
          textAlign: "center",
          margin: "0 0 4px",
        }}
      >
        事故報告書
      </h1>
      <p style={{ textAlign: "center", fontSize: 10, color: "#555", margin: "0 0 16px" }}>
        （放課後等デイサービス・東京都様式ベース）
      </p>

      {sectionTitle("基本情報")}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <tbody>
          {row("事業所名", record.facilityName)}
          {row("報告日", record.reportDate)}
          {row("作成者名", record.authorName)}
        </tbody>
      </table>

      {sectionTitle("事故情報")}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <tbody>
          {row(
            "発生日時",
            formatJaDateTime ? formatJaDateTime(record.occurredAt) : record.occurredAt,
          )}
          {row("発生場所", record.location)}
          {row("対象児童", record.childName)}
          {row("事故種別", types)}
          {major ? row("重大事故", major) : null}
        </tbody>
      </table>

      {sectionTitle("発生状況")}
      {block("発生状況", p.situation)}
      {block("発見者名", p.discovererName)}
      {block("発見時の状況", p.discoverySituation)}

      {sectionTitle("対応記録")}
      {block("初期対応内容", p.initialResponse)}
      {block("保護者への連絡日時", parentContact)}
      {block(
        "医療機関受診",
        p.medicalVisit === "yes" ? "あり" : p.medicalVisit === "no" ? "なし" : "",
      )}
      {p.medicalVisit === "yes" ? block("医療機関名", p.medicalFacilityName) : null}
      {p.medicalVisit === "yes" ? block("診断結果", p.diagnosisResult) : null}

      {sectionTitle("事故原因の分析")}
      {block("", record.aiCauseAnalysis)}

      {sectionTitle("再発防止策")}
      {block("", record.aiPrevention)}

      {sectionTitle("管理者へのコメント")}
      {block("", record.aiManagerComment)}

      {sectionTitle("確認欄")}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <tbody>
          {row("管理者署名", p.managerSignature)}
          {row("確認日", p.confirmationDate)}
        </tbody>
      </table>

      <style>{`
        .accident-report-pdf-root table th {
          text-align: left;
          vertical-align: top;
          width: 28%;
          padding: 4px 8px 4px 0;
          font-weight: 700;
          color: #333;
        }
        .accident-report-pdf-root table td {
          padding: 4px 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

/** @param {{ record: object, formatJaDateTime: (iso: string) => string }} props */
export function AccidentReportPdfMount({ record, formatJaDateTime }) {
  return (
    <AccidentReportPdfDocument record={record} formatJaDateTime={formatJaDateTime} />
  );
}
