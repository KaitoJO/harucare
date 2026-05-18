import { supportTypeLabel } from "./familySupportConfig.js";

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

export function FamilySupportPdfDocument({ record, formatJaDateTime }) {
  const p = record.payload ?? {};
  const duration =
    record.durationMinutes != null
      ? `${record.durationMinutes}分`
      : p.durationMinutes != null
        ? `${p.durationMinutes}分`
        : "";

  return (
    <div
      className="family-support-pdf-root"
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
        家族支援加算 実施記録
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
          <tr>
            <th style={{ textAlign: "left" }}>支援種別</th>
            <td>{supportTypeLabel(record.supportType)}</td>
          </tr>
        </tbody>
      </table>

      {sectionTitle("実施内容")}
      {block(
        "参加者",
        p.participantName
          ? `${p.participantName}${p.participantRelation ? `（${p.participantRelation}）` : ""}`
          : "",
      )}
      {block("実施時間", `${p.startTime || "—"} 〜 ${p.endTime || "—"}（${duration}）`)}
      {block("相談内容", p.consultationContent)}

      {sectionTitle("相談援助の記録")}
      {block("", record.aiRecordText)}

      {sectionTitle("次回の支援提案")}
      {block("", record.aiNextSuggestion)}

      {sectionTitle("確認欄")}
      {block("保護者サイン", p.parentSignature)}
      {block("担当者確認", p.staffConfirmation)}
    </div>
  );
}

export function FamilySupportPdfMount({ record, formatJaDateTime }) {
  return <FamilySupportPdfDocument record={record} formatJaDateTime={formatJaDateTime} />;
}
