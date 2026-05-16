/**
 * 個別支援計画書 PDF（告示様式第二十・令和6年例示準拠）
 * html2canvas 出力およびブラウザ印刷の両方
 */
export const SUPPORT_PLAN_PDF_STYLE_ID = "hc-support-plan-pdf-css";

export const SUPPORT_PLAN_PDF_CSS = `
.hc-support-plan,
.hc-support-plan * {
  box-sizing: border-box;
}
.hc-support-plan {
  font-size: 8.5pt;
  line-height: 1.38;
  color: #000;
  background: #fff;
}
.hc-support-plan table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}
.hc-support-plan .hc-cell {
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
  vertical-align: top;
  padding: 5px 7px;
}
.hc-support-plan .hc-cell-pre {
  white-space: pre-line;
}
.hc-support-plan .hc-label {
  background: #ebebeb;
  font-weight: 700;
  text-align: left;
}
.hc-support-plan .hc-section-header {
  page-break-after: avoid;
  break-after: avoid;
}
@media print {
  @page {
    size: A4 portrait;
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
}
`;
