import { jsPDF } from "jspdf";

/**
 * DOM を A4 PDF に出力する（jsPDF の html プラグイン + html2canvas）。
 * 日本語は呼び出し側で Noto Sans JP 等のフォントが当たった要素を渡すこと。
 *
 * @param {HTMLElement} element
 * @param {string} filename
 */
export async function exportSupportPlanPdf(element, filename) {
  await document.fonts.ready;

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  await doc.html(element, {
    margin: [12, 12, 14, 12],
    autoPaging: "text",
    html2canvas: {
      scale: 0.72,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    },
    width: 186,
    windowWidth: 820,
  });

  doc.save(filename);
}

export function supportPlanPdfFilename(childName) {
  const base = String(childName || "支援計画")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "支援計画"}_支援計画.pdf`;
}
