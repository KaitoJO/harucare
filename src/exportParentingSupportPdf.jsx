import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ParentingSupportPdfMount } from "./ParentingSupportPdf.jsx";

function addCanvasToPdf(doc, canvas, marginMm) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgWMm = pageW - marginMm * 2;
  const bodyHMm = pageH - marginMm * 2;
  const pxPerMm = canvas.width / imgWMm;
  const maxPx = Math.ceil(bodyHMm * pxPerMm);

  let srcY = 0;
  while (srcY < canvas.height) {
    const sliceEnd = Math.min(srcY + maxPx, canvas.height);
    const slicePx = sliceEnd - srcY;
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    if (srcY > 0) doc.addPage();
    doc.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      marginMm,
      marginMm,
      imgWMm,
      slicePx / pxPerMm,
      undefined,
      "FAST",
    );
    srcY += slicePx;
  }
}

export function parentingSupportPdfFilename(childName, conductedDate) {
  const base = String(childName || "子育てサポート")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .slice(0, 40);
  const d = String(conductedDate || "").replace(/-/g, "");
  return `${base || "子育てサポート"}_子育てサポート加算記録${d ? `_${d}` : ""}.pdf`;
}

export async function mountAndExportParentingSupportPdf(opts) {
  const { record, formatJaDateTime, filename } = opts;
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <ParentingSupportPdfMount record={record} formatJaDateTime={formatJaDateTime} />,
  );
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const el = host.firstElementChild;
  if (!(el instanceof HTMLElement)) {
    root.unmount();
    host.remove();
    throw new Error("PDF用のDOMを生成できませんでした。");
  }
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    addCanvasToPdf(doc, canvas, 10);
    const p = record.payload ?? {};
    doc.save(
      filename ||
        parentingSupportPdfFilename(
          record.childName,
          p.conductedDate || record.conductedAt,
        ),
    );
  } finally {
    root.unmount();
    host.remove();
  }
}
