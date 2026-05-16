import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * 「不可分な行」（data-pdf-avoid-split が付いた tr 等）の上下端をキャンバス座標で取得する。
 *
 * @param {HTMLElement} root
 * @param {HTMLCanvasElement} canvas
 * @param {{ avoidSplitSelector?: string|null }} [opts]
 */
function collectAvoidBandsInCanvasSpace(root, canvas, opts) {
  const sel = opts?.avoidSplitSelector;
  if (!sel) return [];

  /** @type {{ top: number, bottom: number }[]} */
  const bands = [];
  const rootEl = root;
  const rootRect = rootEl.getBoundingClientRect();
  const scrollH = Math.max(
    rootEl.scrollHeight,
    rootEl.offsetHeight,
    rootRect.height,
  );
  const scaleY = scrollH > 0 ? canvas.height / scrollH : 1;

  rootEl.querySelectorAll(sel).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const r = node.getBoundingClientRect();
    const topRel = r.top - rootRect.top + rootEl.scrollTop;
    const botRel = r.bottom - rootRect.top + rootEl.scrollTop;
    const top = topRel * scaleY;
    const bottom = botRel * scaleY;
    if (bottom <= top) return;
    bands.push({ top, bottom });
  });
  bands.sort((a, b) => a.top - b.top);
  return bands;
}

/**
 * HaruCare 2ページ構成の改ページアンカー（canvas Y 昇順）
 */
function collectPageBreakAnchors(root, canvas) {
  const rootEl = root;
  const rootRect = rootEl.getBoundingClientRect();
  const scrollH = Math.max(
    rootEl.scrollHeight,
    rootEl.offsetHeight,
    rootRect.height,
  );
  const scaleY = scrollH > 0 ? canvas.height / scrollH : 1;
  /** @type {number[]} */
  const anchors = [];
  rootEl.querySelectorAll("[data-pdf-page-break]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const r = node.getBoundingClientRect();
    const topRel = r.top - rootRect.top + rootEl.scrollTop;
    anchors.push(topRel * scaleY);
  });
  return anchors.filter((y) => y > 8).sort((a, b) => a - b);
}

/**
 * 2ページ目直前など、優先改ページ位置へスライス端を寄せる
 */
function snapSliceToPageBreak(srcY, tentativeEnd, anchors, maxPx) {
  if (!anchors.length) return tentativeEnd;
  const minAdvance = Math.min(
    Math.max(64, Math.floor(maxPx * 0.07)),
    Math.floor(maxPx * 0.28),
  );
  const windowPx = Math.floor(maxPx * 0.42);
  const candidates = anchors.filter(
    (a) => a > srcY + minAdvance && a <= tentativeEnd + windowPx,
  );
  if (!candidates.length) return tentativeEnd;
  const anchor = candidates[candidates.length - 1];
  if (tentativeEnd - anchor > windowPx) return tentativeEnd;
  return Math.max(srcY + minAdvance, Math.floor(anchor));
}

/**
 * スライス [srcY, sliceEnd) が行帯の一部だけを含んでいれば true（分割が発生）
 */
function bandSplitsSlice(srcY, sliceEnd, b) {
  if (sliceEnd <= b.top + 1 || srcY >= b.bottom - 1) return false;
  const full = srcY <= b.top + 2 && sliceEnd >= b.bottom - 2;
  return !full;
}

/**
 * 行の中途で画像を切断しないように sliceEnd を調整する。
 */
function shrinkSliceAvoidingBands(
  srcY,
  tentativeEnd,
  bandsSorted,
  maxPx,
  canvasBottom,
) {
  let e = Math.min(tentativeEnd, canvasBottom, srcY + maxPx);
  const minAdvance = Math.min(
    Math.max(72, Math.floor(maxPx * 0.08)),
    Math.floor(maxPx * 0.32),
  );

  for (let pass = 0; pass < 60; pass++) {
    let changed = false;

    for (const b of bandsSorted) {
      const bandH = b.bottom - b.top;
      if (bandH >= maxPx * 0.96) continue;
      if (!bandSplitsSlice(srcY, e, b)) continue;

      /** 行の開始より少し手前まで詰める */
      if (b.top > srcY + minAdvance) {
        const ne = Math.max(srcY + minAdvance, Math.floor(b.top));
        if (ne < e - 16) {
          e = Math.min(ne, canvasBottom);
          changed = true;
          continue;
        }
      }

      /** 開始位置が同一行より上にある場合、このページですべて入るなら延長して吸収する */
      if (b.bottom - srcY <= maxPx + 8 && b.bottom > e - 36) {
        const ne = Math.min(
          canvasBottom,
          srcY + maxPx + 34,
          Math.ceil(b.bottom) + 12,
        );
        if (ne > e && b.bottom <= ne + 2) {
          e = Math.min(ne, canvasBottom);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  if (e <= srcY + 20) {
    e = Math.min(canvasBottom, srcY + Math.max(minAdvance, Math.floor(maxPx * 0.15)));
  }

  return Math.min(e, tentativeEnd, canvasBottom);
}

/**
 * html2canvas 画像を A4 余白付きで何ページに分割するか（export と同じロジック）
 * @param {HTMLCanvasElement} canvas
 * @param {number} [marginMm]
 * @param {{ avoidBandsSorted?: { top: number, bottom: number }[], pageBreakAnchorsSorted?: number[] }} [opts]
 */
export function countPdfPagesFromCanvas(canvas, marginMm = 8, opts = {}) {
  const pageW = 210;
  const pageH = 297;
  const imgWMm = pageW - 2 * marginMm;
  const bodyHMm = pageH - 2 * marginMm;
  const pxPerMm = canvas.width / imgWMm;
  const maxPx = Math.ceil(bodyHMm * pxPerMm);
  const bands = opts?.avoidBandsSorted ?? [];
  const pageBreakAnchors = opts?.pageBreakAnchorsSorted ?? [];

  let srcY = 0;
  let pages = 0;
  while (srcY < canvas.height) {
    pages += 1;
    const desiredEnd = Math.min(srcY + maxPx, canvas.height);
    let sliceEndPx =
      bands.length === 0
        ? desiredEnd
        : shrinkSliceAvoidingBands(
            srcY,
            desiredEnd,
            bands,
            maxPx,
            canvas.height,
          );
    sliceEndPx = snapSliceToPageBreak(
      srcY,
      sliceEndPx,
      pageBreakAnchors,
      maxPx,
    );
    if (sliceEndPx <= srcY) {
      sliceEndPx = Math.min(canvas.height, srcY + maxPx);
    }
    sliceEndPx = Math.min(sliceEndPx, canvas.height);
    const slicePx = Math.max(sliceEndPx - srcY, 16);
    srcY += slicePx;
  }
  return pages;
}

function addPagedCanvasToPdf(doc, canvas, marginMm, opts) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgWMm = pageW - 2 * marginMm;
  const bodyHMm = pageH - 2 * marginMm;
  const pxPerMm = canvas.width / imgWMm;

  const maxPx = Math.ceil(bodyHMm * pxPerMm);
  const bands = opts?.avoidBandsSorted ?? [];
  const pageBreakAnchors = opts?.pageBreakAnchorsSorted ?? [];

  let srcY = 0;
  while (srcY < canvas.height) {
    const desiredEnd = Math.min(srcY + maxPx, canvas.height);
    let sliceEndPx =
      bands.length === 0
        ? desiredEnd
        : shrinkSliceAvoidingBands(
            srcY,
            desiredEnd,
            bands,
            maxPx,
            canvas.height,
          );

    sliceEndPx = snapSliceToPageBreak(
      srcY,
      sliceEndPx,
      pageBreakAnchors,
      maxPx,
    );

    if (sliceEndPx <= srcY) {
      sliceEndPx = Math.min(canvas.height, srcY + maxPx);
    }

    sliceEndPx = Math.min(sliceEndPx, canvas.height);

    const slicePx = Math.max(sliceEndPx - srcY, 16);
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

/**
 * html2canvas で DOM を画像化し、jsPDF で複数ページ A4 PDF に貼り付ける。
 *
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {{ avoidSplitSelector?: string|null, html2canvasScale?: number }} [options]
 */
export async function exportSupportPlanPdf(element, filename, options = {}) {
  await document.fonts.ready;

  const canvasScale =
    typeof options.html2canvasScale === "number"
      ? options.html2canvasScale
      : 2;

  const canvas = await html2canvas(element, {
    scale: canvasScale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const avoidBands = collectAvoidBandsInCanvasSpace(element, canvas, options);
  const pageBreakAnchors = collectPageBreakAnchors(element, canvas);

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  addPagedCanvasToPdf(doc, canvas, 8, {
    avoidBandsSorted: avoidBands,
    pageBreakAnchorsSorted: pageBreakAnchors,
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

/** 告示・例示準拠の個別支援計画書レイアウト用PDF */
export function supportPlanFormalPdfFilename(childName) {
  const base = String(childName || "個別支援計画")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return `${base || "個別支援計画"}_個別支援計画書.pdf`;
}
