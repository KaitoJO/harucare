import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * 行分割を避ける帯（canvas 座標）
 * @param {HTMLElement} root
 * @param {HTMLCanvasElement} canvas
 * @param {{ avoidSplitSelector?: string|null }} [opts]
 */
function collectAvoidBands(root, canvas, opts) {
  const selector = opts?.avoidSplitSelector;
  if (!selector) return [];

  const rootRect = root.getBoundingClientRect();
  const scrollH = Math.max(root.scrollHeight, root.offsetHeight, rootRect.height);
  const scaleY = scrollH > 0 ? canvas.height / scrollH : 1;

  /** @type {{ top: number, bottom: number }[]} */
  const bands = [];
  root.querySelectorAll(selector).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const rect = node.getBoundingClientRect();
    const top = (rect.top - rootRect.top + root.scrollTop) * scaleY;
    const bottom = (rect.bottom - rootRect.top + root.scrollTop) * scaleY;
    if (bottom > top) bands.push({ top, bottom });
  });
  bands.sort((a, b) => a.top - b.top);
  return bands;
}

function bandSplitsSlice(srcY, sliceEnd, band) {
  if (sliceEnd <= band.top + 1 || srcY >= band.bottom - 1) return false;
  const containsWholeBand =
    srcY <= band.top + 2 && sliceEnd >= band.bottom - 2;
  return !containsWholeBand;
}

function shrinkSliceEnd(srcY, tentativeEnd, bands, maxPx, canvasHeight) {
  let end = Math.min(tentativeEnd, canvasHeight, srcY + maxPx);
  const minAdvance = Math.min(
    Math.max(72, Math.floor(maxPx * 0.08)),
    Math.floor(maxPx * 0.32),
  );

  for (let pass = 0; pass < 48; pass += 1) {
    let changed = false;
    for (const band of bands) {
      if (band.bottom - band.top >= maxPx * 0.96) continue;
      if (!bandSplitsSlice(srcY, end, band)) continue;
      if (band.top > srcY + minAdvance) {
        const nextEnd = Math.max(srcY + minAdvance, Math.floor(band.top));
        if (nextEnd < end - 12) {
          end = nextEnd;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  if (end <= srcY + 16) {
    end = Math.min(
      canvasHeight,
      srcY + Math.max(minAdvance, Math.floor(maxPx * 0.15)),
    );
  }
  return Math.min(end, canvasHeight);
}

function addCanvasToPdf(doc, canvas, marginMm, opts) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgWMm = pageW - marginMm * 2;
  const bodyHMm = pageH - marginMm * 2;
  const pxPerMm = canvas.width / imgWMm;
  const maxPx = Math.ceil(bodyHMm * pxPerMm);
  const bands = opts?.avoidBandsSorted ?? [];

  let srcY = 0;
  while (srcY < canvas.height) {
    const desiredEnd = Math.min(srcY + maxPx, canvas.height);
    const sliceEnd =
      bands.length === 0
        ? desiredEnd
        : shrinkSliceEnd(srcY, desiredEnd, bands, maxPx, canvas.height);
    const slicePx = Math.max(sliceEnd - srcY, 16);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    const ctx = sliceCanvas.getContext("2d");
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

/**
 * 個別支援計画書 DOM を A4 縦 PDF として保存
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {{ avoidSplitSelector?: string|null, html2canvasScale?: number }} [options]
 */
export async function exportSupportPlanPdf(element, filename, options = {}) {
  await document.fonts.ready;

  const scale =
    typeof options.html2canvasScale === "number" ? options.html2canvasScale : 2;

  const canvas = await html2canvas(element, {
    scale,
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

  addCanvasToPdf(doc, canvas, 8, {
    avoidBandsSorted: collectAvoidBands(element, canvas, options),
  });
  doc.save(filename);
}

export function supportPlanFormalPdfFilename(childName) {
  const base = String(childName || "個別支援計画")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "個別支援計画"}_個別支援計画書.pdf`;
}
