/**
 * 個別支援計画書 PDF のページ数を headless で検証（STEP 5）
 * 実行: npx vite-node scripts/verify-formal-pdf-pages.mjs
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import puppeteer from "puppeteer";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildFormalPlanDocument } from "../src/supportPlanMapper.js";
import { FormalSupportPlanPdfMount } from "../src/FormalSupportPlanPdf.jsx";
import { SUPPORT_PLAN_PDF_CSS } from "../src/supportPlanPdfStyles.js";

const SAMPLE_CHILD = {
  childName: "山田 太郎",
  birthDate: "2019-04-12",
  age: "6歳",
  disability: "発達障害（ASD）",
  familyLifeIntentions:
    "集団活動への参加を少しずつ増やし、家庭でも生活リズムを安定させたい。",
  standardSupportProvision: "火・木 14:00〜16:00（週2回）",
  managerName: "佐藤 花子",
  goals: "半年後には着替え・トイレをより自立し、集団活動に15分程度参加できる。",
  notes: "感覚過敏あり。大声・強い照明は避ける。",
};

const SAMPLE_PROGRAM = `## 1. 課題の背景（なぜ今この課題が出ているか）
ASDの特性として予測可能性への不安が強く、環境変化時に逃避・固執が見られる。現在の課題「集団への参加が短い」は、感覚負荷と成功体験不足が重なっている。

## 2. 支援方針（なぜこの方針か）
段階的な集団参加と視覚支援を組み合わせる。（理由：予測可能性を高めることで不安を下げ、小さな成功体験を積むことがASD支援の基本原理であるため。）

## 3. 短期目標（3つ・必ずそれぞれに「設定理由」を併記）
- 目標：着替えを声かけ1回で開始し5分以内に完了する
- **設定理由：** 微細運動と手順理解の課題に対し、視覚手順カードで予測可能性を補うため。

- 目標：集団サークルに同席し、5分間座って活動を見守る
- **設定理由：** 感覚負荷を下げた小集団から参加時間を延ばすため。

- 目標：トイレへ自分から向かい、排泄後の手洗いまで完了する
- **設定理由：** 生活リズムの安定と自立に向けた反復練習が必要なため。

## 4. 月ごとの活動計画（1ヶ月目〜6ヶ月目）
- 1か月目：個別での感覚遊び・手順カード導入（理由：成功体験を作る）
- 2か月目：2名での並行活動（理由：他者存在への慣れ）
- 3か月目：3〜4名のサークル同席（理由：集団への段階的移行）
- 4か月目：5分→8分の集団参加（理由：時間延長）
- 5か月目：役割分担遊びへの参加（理由：協調の芽を育てる）
- 6か月目：10分程度の集団活動参加（理由：半期目標への到達）

## 5. 支援のポイント（5項目以上・必ず各項目に「理由：」併記）
- ポイント：視覚スケジュールで一日の流れを提示する
- 理由：予測可能性が不安を軽減するため

- ポイント：感覚休憩コーナーを随時利用できるようにする
- 理由：過敏時の回復時間が必要なため

- ポイント：着替え・トイレは手順カードとモデリングで支援
- 理由：手順の外化が有効なため

- ポイント：集団前には個別で準備し、参加時間を段階設定
- 理由：成功体験を積むため

- ポイント：褒め・記録は具体的行動に結びつける
- 理由：行動強化が維持に有効なため

## 6. 家庭との連携
週1回、家庭での生活リズムとトイレ・着替えの様子を共有する。理由：一般化のため施設と家庭で支援方針を揃える必要があるため。
`;

function buildVerifyHtml(doc) {
  const body = renderToStaticMarkup(
    createElement(FormalSupportPlanPdfMount, { doc }),
  );
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" />
  <style>${SUPPORT_PLAN_PDF_CSS}</style>
  <style>body { margin: 0; background: #fff; }</style>
</head>
<body>${body}</body>
</html>`;
}

async function main() {
  const planCreatedIso = new Date().toISOString();
  const doc = buildFormalPlanDocument(
    SAMPLE_CHILD,
    SAMPLE_PROGRAM,
    planCreatedIso,
  );
  const html = buildVerifyHtml(doc);
  const outDir = join(process.cwd(), "tmp");
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, "verify-support-plan.html");
  writeFileSync(htmlPath, html, "utf8");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const metrics = await page.evaluate(async () => {
      const loadScript = (src) =>
        new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      await loadScript(
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
      );

      const root = document.querySelector(".support-plan-pdf-root");
      if (!root) throw new Error("PDF root missing");

      const canvas = await window.html2canvas(root, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const collectBands = (el, cvs) => {
        const bands = [];
        const rootRect = el.getBoundingClientRect();
        const scrollH = Math.max(el.scrollHeight, el.offsetHeight, rootRect.height);
        const scaleY = scrollH > 0 ? cvs.height / scrollH : 1;
        el.querySelectorAll(".hc-avoid-split").forEach((node) => {
          const r = node.getBoundingClientRect();
          const top = (r.top - rootRect.top + el.scrollTop) * scaleY;
          const bottom = (r.bottom - rootRect.top + el.scrollTop) * scaleY;
          if (bottom > top) bands.push({ top, bottom });
        });
        return bands.sort((a, b) => a.top - b.top);
      };

      const marginMm = 8;
      const pageW = 210;
      const pageH = 297;
      const imgWMm = pageW - 2 * marginMm;
      const bodyHMm = pageH - 2 * marginMm;
      const pxPerMm = canvas.width / imgWMm;
      const maxPx = Math.ceil(bodyHMm * pxPerMm);
      const bands = collectBands(root, canvas);

      const bandSplitsSlice = (srcY, sliceEnd, b) => {
        if (sliceEnd <= b.top + 1 || srcY >= b.bottom - 1) return false;
        const full = srcY <= b.top + 2 && sliceEnd >= b.bottom - 2;
        return !full;
      };

      const shrink = (srcY, tentativeEnd) => {
        let e = Math.min(tentativeEnd, canvas.height, srcY + maxPx);
        const minAdvance = Math.min(
          Math.max(72, Math.floor(maxPx * 0.08)),
          Math.floor(maxPx * 0.32),
        );
        for (let pass = 0; pass < 60; pass++) {
          let changed = false;
          for (const b of bands) {
            const bandH = b.bottom - b.top;
            if (bandH >= maxPx * 0.96) continue;
            if (!bandSplitsSlice(srcY, e, b)) continue;
            if (b.top > srcY + minAdvance) {
              const ne = Math.max(srcY + minAdvance, Math.floor(b.top));
              if (ne < e - 16) {
                e = Math.min(ne, canvas.height);
                changed = true;
              }
            }
          }
          if (!changed) break;
        }
        if (e <= srcY + 20) {
          e = Math.min(
            canvas.height,
            srcY + Math.max(minAdvance, Math.floor(maxPx * 0.15)),
          );
        }
        return Math.min(e, tentativeEnd, canvas.height);
      };

      let srcY = 0;
      let pages = 0;
      while (srcY < canvas.height) {
        pages += 1;
        const desiredEnd = Math.min(srcY + maxPx, canvas.height);
        let sliceEnd =
          bands.length === 0 ? desiredEnd : shrink(srcY, desiredEnd);
        if (sliceEnd <= srcY) sliceEnd = Math.min(canvas.height, srcY + maxPx);
        const slicePx = Math.max(sliceEnd - srcY, 16);
        srcY += slicePx;
      }

      return {
        pages,
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        scrollHeight: root.scrollHeight,
      };
    });

    const pdfPath = join(outDir, "verify-support-plan.pdf");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });

    const ok = metrics.pages <= 5;
    console.log(JSON.stringify({ ...metrics, pdfPath, htmlPath, ok }, null, 2));
    process.exit(ok ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
