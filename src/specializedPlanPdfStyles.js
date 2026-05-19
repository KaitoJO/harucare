/**
 * 専門的支援計画書 PDF 専用スタイル
 */

export const SPECIALIZED_PLAN_PDF_STYLE_ID = "hc-specialized-plan-pdf-css";

export const SPECIALIZED_PLAN_PDF_CSS = `
.hc-specialized-plan,
.hc-specialized-plan * {
  box-sizing: border-box;
}

.hc-specialized-plan {
  width: 194mm;
  max-width: 194mm;
  margin: 0;
  padding: 0;
  font-family: "Noto Sans JP", "MS PGothic", "Hiragino Kaku Gothic ProN", sans-serif;
  font-size: 8.5pt;
  line-height: 1.42;
  color: #000;
  background: #fff;
}

.hc-specialized-plan .hc-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  border: 1px solid #000;
  margin-bottom: 3px;
  page-break-inside: auto;
}

.hc-specialized-plan .hc-table th,
.hc-specialized-plan .hc-table td {
  height: auto;
  min-height: 0;
  max-height: none;
  vertical-align: top;
  padding: 5px 7px;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
  border: 1px solid #000;
}

.hc-specialized-plan .hc-table .hc-text-block {
  white-space: pre-line;
}

.hc-specialized-plan .hc-label {
  background: #ebebeb;
  font-weight: 700;
  text-align: center;
  vertical-align: middle;
}

.hc-specialized-plan .hc-label-left {
  background: #ebebeb;
  font-weight: 700;
  text-align: left;
}

.hc-specialized-plan .hc-title-cell {
  text-align: center;
  font-weight: 800;
  font-size: 13pt;
  letter-spacing: 0.12em;
  padding: 8px 6px;
}

.hc-specialized-plan .hc-facility-cell {
  text-align: right;
  font-size: 8pt;
  vertical-align: bottom;
  white-space: nowrap;
}

.hc-specialized-plan .hc-sub-label {
  font-weight: 700;
  font-size: 8pt;
}

.hc-specialized-plan .hc-note {
  font-size: 7.5pt;
  margin: 2px 0 4px;
  padding-left: 2px;
}

.hc-specialized-plan .hc-goal-label {
  background: #ebebeb;
  font-weight: 700;
  text-align: center;
  vertical-align: middle;
  width: 10%;
}

.hc-specialized-plan .hc-domain-note {
  font-size: 7pt;
  margin: 0 0 3px;
  color: #222;
}

.hc-specialized-plan .hc-consent {
  margin-top: 6px;
  font-size: 8.5pt;
  line-height: 1.55;
}

.hc-specialized-plan .hc-signature-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  font-size: 8.5pt;
}

.hc-specialized-plan .hc-staff-grid {
  width: 100%;
  border-collapse: collapse;
}

.hc-specialized-plan .hc-staff-grid td {
  border: 1px solid #000;
  height: 22px;
  padding: 4px 6px;
  text-align: center;
}
`;
