/** HaruCare 個別支援計画書 PDF 用（html2canvas ＋ ブラウザ印刷の両方） */
export const SUPPORT_PLAN_PDF_STYLE_ID = "hc-support-plan-pdf-css";

export const SUPPORT_PLAN_PDF_CSS = `
.hc-support-plan,
.hc-support-plan * {
  box-sizing: border-box;
}
.hc-support-plan .hc-cell {
  word-break: break-all;
  white-space: pre-wrap;
  vertical-align: top;
  padding: 6px 8px;
  overflow-wrap: anywhere;
}
.hc-support-plan .hc-section-header {
  page-break-after: avoid;
  break-after: avoid;
}
.hc-support-plan tr,
.hc-support-plan .hc-support-card {
  page-break-inside: avoid;
  break-inside: avoid;
}
.hc-support-plan .hc-support-card-grid {
  display: grid;
  width: 100%;
  grid-template-columns: 12% 22% 38% 8% 12% 8%;
  border: 1px solid #000;
  border-top: none;
}
.hc-support-plan .hc-support-card-grid:first-of-type {
  border-top: 1px solid #000;
}
.hc-support-plan .hc-support-card-head {
  display: grid;
  width: 100%;
  grid-template-columns: 12% 22% 38% 8% 12% 8%;
  border: 1px solid #000;
  background: #e8eae8;
  font-weight: 700;
}
@media print {
  .hc-support-plan tr {
    page-break-inside: avoid;
  }
  .hc-support-plan .hc-section-header {
    page-break-after: avoid;
  }
  .hc-support-plan .hc-support-card {
    page-break-inside: avoid;
  }
}
`;
