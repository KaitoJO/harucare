/**
 * 個別支援計画書 PDF 専用スタイル（構造コンポーネントとは分離）
 */

export const SUPPORT_PLAN_PDF_STYLE_ID = "hc-support-plan-pdf-css";

export const SUPPORT_PLAN_PDF_CSS = `
.hc-support-plan,
.hc-support-plan * {
  box-sizing: border-box;
}

.hc-support-plan {
  width: 194mm;
  max-width: 194mm;
  margin: 0;
  padding: 0;
  font-family: "Noto Sans JP", "MS PGothic", "Hiragino Kaku Gothic ProN", sans-serif;
  font-size: 8.5pt;
  line-height: 1.38;
  color: #000;
  background: #fff;
}

.hc-support-plan .hc-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  border: 1px solid #000;
  margin-bottom: 4px;
  page-break-inside: auto;
}

.hc-support-plan .hc-table th,
.hc-support-plan .hc-table td {
  height: auto;
  min-height: 0;
  max-height: none;
  vertical-align: top;
  padding: 6px 8px;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
  border: 1px solid #000;
}

.hc-support-plan .hc-table .hc-text-block {
  white-space: pre-line;
}

.hc-support-plan .hc-label {
  background: #ebebeb;
  font-weight: 700;
  text-align: left;
}

.hc-support-plan .hc-title-cell {
  text-align: center;
  font-weight: 800;
  font-size: 12pt;
  border-bottom: none;
}

.hc-support-plan .hc-center {
  text-align: center;
}

.hc-support-plan .hc-section-title {
  font-weight: 700;
  margin: 3px 0 4px;
  padding-left: 2px;
  page-break-after: avoid;
}

.hc-support-plan .hc-explanation {
  border: 1px solid #000;
  margin-bottom: 4px;
  padding: 6px 8px;
}

.hc-support-plan .hc-detail-table .col-item { width: 10%; }
.hc-support-plan .hc-detail-table .col-goal { width: 25%; }
.hc-support-plan .hc-detail-table .col-content { width: 45%; }
.hc-support-plan .hc-detail-table .col-period { width: 8%; }
.hc-support-plan .hc-detail-table .col-priority { width: 7%; }
.hc-support-plan .hc-detail-table .col-notes { width: 5%; }

.hc-support-plan .hc-appendix-label { width: 22%; }
.hc-support-plan .hc-appendix-value { width: 78%; }

.hc-support-plan .hc-signature-label { width: 32%; }
.hc-support-plan .hc-signature-name { width: 38%; }
.hc-support-plan .hc-signature-date { width: 30%; text-align: right; }

.hc-support-plan tr.hc-avoid-split {
  page-break-inside: avoid;
  break-inside: avoid;
}

.hc-support-plan .section {
  page-break-inside: avoid;
  break-inside: avoid;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 8mm;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .section {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  h2,
  h3 {
    page-break-after: avoid;
    break-after: avoid;
  }

  table {
    page-break-inside: auto;
    break-inside: auto;
  }

  .hc-support-plan {
    width: 100%;
    max-width: none;
    font-size: 8.5pt;
  }

  .hc-support-plan .hc-table th,
  .hc-support-plan .hc-table td {
    height: auto;
    word-break: normal;
    white-space: normal;
  }

  .hc-support-plan .hc-label {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;
