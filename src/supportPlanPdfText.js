/**
 * 個別支援計画書 PDF 用テキスト処理（マークダウン記号の除去）
 * 実装の前提：本モジュールを先に用意し、マッピング・レイアウトはプレーン文のみを受け取る。
 */

export const PDF_FULLWIDTH_SPACE = "\u3000";

/** @param {unknown} value */
export function stripMarkdownForPdf(value) {
  let text = String(value ?? "");

  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, inner) =>
    String(inner ?? "").trim(),
  );
  text = text.replace(/!\[([^\]]*)]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
  text = text.replace(/^[ \t]{0,8}#{1,6}[ \t]+/gm, "");
  text = text.replace(/^#{1,6}\s*$/gm, "");
  text = text.replace(/^[ \t]*(?:[-*+]|•)[ \t]+/gm, PDF_FULLWIDTH_SPACE);
  text = text.replace(/^[ \t]*\d+[.)][ \t]+/gm, "");
  text = text.replace(/^[ \t]*>[ \t]*/gm, "");
  text = text.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");

  for (let i = 0; i < 10 && /`[^`]*`/.test(text); i += 1) {
    text = text.replace(/`([^`]*)`/g, "$1");
  }
  text = text.replace(/~~([^~]+)~~/g, "$1");

  for (let i = 0; i < 10 && (/\*\*/.test(text) || /__[^_]*__/.test(text)); i += 1) {
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/__(?!_)([^_]*)__/g, "$1");
  }

  for (let j = 0; j < 6; j += 1) {
    const next = text
      .replace(/(^|[\s\n])\*([^*\n]+)\*(?=[\s\n]|$)/g, "$1$2")
      .replace(/(^|[\s\n])_([^_\n\r]+)_(?=[\s\n]|$)/g, "$1$2");
    if (next === text) break;
    text = next;
  }

  text = text.replace(/[*_]{2,}/g, "");
  text = text.replace(/\\/g, "");
  text = text.replace(/[ \t]+\n/g, "\n");
  return text.trim();
}

/** 1行表示用 @param {unknown} value */
export function toPdfLine(value) {
  return stripMarkdownForPdf(value).replace(/\s+/g, " ").trim();
}

/** 複数行表示用 @param {unknown} value */
export function toPdfBlock(value) {
  return stripMarkdownForPdf(value);
}
