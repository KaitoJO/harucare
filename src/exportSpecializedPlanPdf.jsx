import { createRoot } from "react-dom/client";
import { SpecializedSupportPlanPdfMount } from "./SpecializedSupportPlanPdf.jsx";
import { exportSupportPlanPdf } from "./exportSupportPlanPdf.js";

export function specializedPlanPdfFilename(childName) {
  const base = String(childName || "専門的支援計画")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "専門的支援計画"}_専門的支援計画書.pdf`;
}

/**
 * @param {{ doc: object, filename?: string }} opts
 */
export async function mountAndExportSpecializedPlanPdf(opts) {
  const { doc, filename } = opts;
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;z-index:-1;";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(<SpecializedSupportPlanPdfMount doc={doc} />);

  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const el = host.querySelector(".specialized-plan-pdf-root");
  if (!(el instanceof HTMLElement)) {
    root.unmount();
    host.remove();
    throw new Error("PDF用のDOMを生成できませんでした。");
  }

  try {
    await exportSupportPlanPdf(
      el,
      filename || specializedPlanPdfFilename(doc?.childName),
      { avoidSplitSelector: ".hc-avoid-split", html2canvasScale: 2 },
    );
  } finally {
    root.unmount();
    host.remove();
  }
}
