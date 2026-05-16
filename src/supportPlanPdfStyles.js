/** HaruCare 個別支援計画書 PDF 用（html2canvas ＋ ブラウザ印刷） */
export const SUPPORT_PLAN_PDF_STYLE_ID = "hc-support-plan-pdf-css";

export const SUPPORT_PLAN_PDF_CSS = `
.hc-support-plan,
.hc-support-plan * {
  box-sizing: border-box;
}
.hc-support-plan {
  font-size: 8.5pt;
  line-height: 1.35;
}
.hc-support-plan table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.hc-support-plan .hc-cell {
  word-break: keep-all;
  white-space: normal;
  vertical-align: top;
  padding: 4px 6px;
  overflow-wrap: break-word;
}
.hc-support-plan .hc-section-header {
  page-break-after: avoid;
  break-after: avoid;
}
@media print {
  @page {
    margin: 8mm;
  }
  .hc-support-plan {
    font-size: 8.5pt;
  }
  .hc-support-plan table {
    width: 100%;
  }
  .hc-support-plan tr.hc-avoid-split {
    page-break-inside: avoid;
  }
  .hc-support-plan .hc-section-header {
    page-break-after: avoid;
  }
}
`;
