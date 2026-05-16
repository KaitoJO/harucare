/** 印字用の全角スペース */
export const PDF_FW = "\u3000";

export function normalizePdfLine(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\u3000/g, " ")
    .trim();
}

/**
 * PDF 表示用：マークダウン／装飾記号を除去しプレーン文にする。
 * @param {unknown} input
 */
export function markdownToPdfPlain(input) {
  let s = String(input ?? "");

  s = s.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, inner) =>
    String(inner ?? "").trim(),
  );
  s = s.replace(/!\[([^\]]*)]\([^)]*\)/g, "$1");
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
  s = s.replace(/^[ \t]{0,8}#{1,6}[ \t]+/gm, "");
  s = s.replace(/^#{1,6}\s*$/gm, "");
  s = s.replace(/^[ \t]*(?:[-*+]|•)[ \t]+/gm, "● ");
  s = s.replace(/^[ \t]*\d+[.)][ \t]+/gm, "");
  s = s.replace(/^[ \t]*>[ \t]*/gm, "");
  s = s.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");

  for (let i = 0; i < 10 && /`[^`]*`/.test(s); i += 1) {
    s = s.replace(/`([^`]*)`/g, "$1");
  }
  s = s.replace(/~~([^~]+)~~/g, "$1");

  for (let i = 0; i < 10 && (/\*\*/.test(s) || /__[^_]*__/.test(s)); i += 1) {
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
    s = s.replace(/__(?!_)([^_]*)__/g, "$1");
  }

  for (let j = 0; j < 6; j += 1) {
    const next = s
      .replace(/(^|[\s\n])\*([^*\n]+)\*(?=[\s\n]|$)/g, "$1$2")
      .replace(/(^|[\s\n])_([^_\n\r]+)_(?=[\s\n]|$)/g, "$1$2");
    if (next === s) break;
    s = next;
  }

  s = s.replace(/(^|\s)#{3,}(?=\s|$)/gm, "$1");
  s = s.replace(/[*_]{2,}/g, "");
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, "");
  s = s.replace(/\\/g, "");
  s = s.replace(/[ \t]+\n/g, "\n");
  return s.trim();
}

/** @param {unknown} v */
export function pdfOneLine(v) {
  return normalizePdfLine(markdownToPdfPlain(v));
}

/** @param {unknown} v */
export function pdfBlock(v) {
  return markdownToPdfPlain(v);
}
