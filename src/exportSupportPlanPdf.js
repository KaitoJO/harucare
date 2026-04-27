import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * html2canvas で DOM を画像化し、jsPDF で複数ページ A4 PDF に貼り付ける。
 * 日本語は要素に Noto Sans JP 等が当たっていること。
 *
 * @param {HTMLElement} element
 * @param {string} filename
 */
function addPagedCanvasToPdf(doc, canvas, marginMm) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgWMm = pageW - 2 * marginMm;
  const bodyHMm = pageH - 2 * marginMm;
  const pxPerMm = canvas.width / imgWMm;

  let srcY = 0;
  while (srcY < canvas.height) {
    const slicePx = Math.min(
      Math.ceil(bodyHMm * pxPerMm),
      canvas.height - srcY,
    );
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = slicePx;
    const ctx = slice.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      slicePx,
      0,
      0,
      canvas.width,
      slicePx,
    );
    const imgData = slice.toDataURL("image/jpeg", 0.92);
    const sliceMmH = slicePx / pxPerMm;
    if (srcY > 0) doc.addPage();
    doc.addImage(
      imgData,
      "JPEG",
      marginMm,
      marginMm,
      imgWMm,
      sliceMmH,
      undefined,
      "FAST",
    );
    srcY += slicePx;
  }
}

export async function exportSupportPlanPdf(element, filename) {
  await document.fonts.ready;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  addPagedCanvasToPdf(doc, canvas, 12);
  doc.save(filename);
}

export function supportPlanPdfFilename(childName) {
  const base = String(childName || "支援計画")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "支援計画"}_支援計画.pdf`;
}
