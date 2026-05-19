import { participationModeLabel } from "./parentingSupportConfig.js";

function sectionTitle(text) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        margin: "14px 0 8px",
        paddingBottom: 4,
        borderBottom: "1px solid #333",
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
      {label ? (
        <div style={{ fontSize: 10, fontWeight: 700, color: "#444", marginBottom: 3 }}>
          {label}
        </div>
      ) : null}
      <div style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v}</div>
    </div>
  );
}

export function ParentingSupportPdfDocument({ record, formatJaDateTime }) {
  const p = record.payload ?? {};
  const duration =
    record.durationMinutes != null
      ? `${record.durationMinutes}分`
      : p.durationMinutes != null
        ? `${p.durationMinutes}分`
        : "";

  return (
    <div
      className="parenting-support-pdf-root"
      style={{
        width: "190mm",
        padding: "12mm 14mm",
        fontFamily: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
        fontSize: 11,
        color: "#1a1a1a",
        background: "#fff",
      }}
    >
      <h1 style={{ fontSize: 16, fontWeight: 700, textAlign: "center", margin: "0 0 16px" }}>
        子育てサポート加算 実施記録
      </h1>

      {sectionTitle("基本情報")}
      <table style={{ width: "100%", fontSize: 11, marginBottom: 8 }}>
        <tbody>
          <tr>
            <th style={{ width: "28%", textAlign: "left" }}>対象児童</th>
            <td>{record.childName}</td>
          </tr>
          <tr>
            <th style={{ textAlign: "left" }}>実施日時</th>
            <td>
              {formatJaDateTime
                ? formatJaDateTime(record.conductedAt)
                : record.conductedAt}
            </td>
          </tr>
          <tr>
            <th style={{ textAlign: "left" }}>担当者</th>
            <td>{record.staffName}</td>
          </tr>
        </tbody>
      </table>

      {sectionTitle("実施内容")}
      {block(
        "参加保護者",
        p.guardianName
          ? `${p.guardianName}${p.guardianRelation ? `（${p.guardianRelation}）` : ""}`
          : "",
      )}
      {block("支援場面の種類", p.supportSceneType)}
      {block("保護者の参加形態", participationModeLabel(p.participationMode))}
      {block("参加時間", `${p.startTime || "—"} 〜 ${p.endTime || "—"}（${duration}）`)}
      {block("支援場面の観察・参加内容", p.observationContent)}

      {sectionTitle("相談援助の記録")}
      {block("", record.aiConsultationRecord)}

      {sectionTitle("児童の特性に関する説明")}
      {block("", record.aiChildCharacteristics)}

      {sectionTitle("保護者へのアドバイス")}
      {block("", record.aiParentAdvice)}

      {sectionTitle("家庭での実践ポイント")}
      {block("", record.aiHomePractice)}

      {sectionTitle("確認欄")}
      {block("保護者サイン", p.parentSignature)}
      {block("担当者確認", p.staffConfirmation)}
    </div>
  );
}

export function ParentingSupportPdfMount({ record, formatJaDateTime }) {
  return (
    <ParentingSupportPdfDocument record={record} formatJaDateTime={formatJaDateTime} />
  );
}
