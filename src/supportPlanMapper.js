/**
 * 個別支援計画書：データマッピング定義
 *
 * | ソース | PDF欄 |
 * |--------|--------|
 * | child.familyLifeIntentions | 利用児及びご家族の意向 |
 * | AI「## 支援方針」 | 総合的な支援の方針 |
 * | child.goals / AI「長期目標」 | 長期目標（内容・期間） |
 * | AI「## 短期目標」 | 短期目標（内容・期間） |
 * | AI「## 月ごとの活動計画」 | 長期目標右カラム（月別スケジュール） |
 * | 短期目標の目標文 | 表・支援目標列 |
 * | AI「## 支援のポイント」 | 表・支援内容列（5領域） |
 * | child.standardSupportProvision | サービス提供時間（曜日・時間） |
 * | 定型文 | 身体拘束について |
 * | 定型文 | 相談支援加算 |
 * | child.notes | 留意点・備考 |
 * | AI「## 家庭との連携」 | 表・家族支援行 |
 */

import { toPdfBlock, toPdfLine } from "./supportPlanPdfText.js";

export const SUPPORT_DOMAINS = Object.freeze([
  "健康・生活",
  "運動・感覚",
  "認知・行為",
  "言語・コミュニケーション",
  "対人関係・社会性（集団適応等）",
]);

const DOMAIN_KEYWORDS = [
  ["睡眠", "食事", "排泄", "健康", "生活", "身辺"],
  ["運動", "感覚", "姿勢", "粗大", "微細"],
  ["認知", "注意", "思考", "行為", "記憶"],
  ["言語", "コミュニケーション", "語彙", "話す", "聞く"],
  ["社会", "対人", "集団", "友人", "協調"],
];

function extractH2Sections(markdown) {
  /** @type {Record<string, string>} */
  const sections = {};
  const md = String(markdown || "");
  const re = /^##\s+([^\r\n]+)[\t ]*$/gm;
  const hits = [...md.matchAll(re)];
  hits.forEach((hit, i) => {
    const title = hit[1]?.trim() ?? "";
    const start = (hit.index ?? 0) + hit[0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index : md.length;
    sections[title] = md.slice(start, end).trim();
  });
  return sections;
}

function pickSection(sections, ...needles) {
  const keys = Object.keys(sections);
  for (const n of needles) {
    const key = keys.find((k) => k.includes(n));
    if (key) return sections[key] ?? "";
  }
  return "";
}

function bulletsFromText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => toPdfLine(line.replace(/^[-*\d.]+\s+/, "")))
    .filter((line) => line.length >= 4);
}

function extractShortTermGoals(sectionText) {
  const goals = [];
  const body = String(sectionText || "");
  const re = /(?:^|\n)\s*[-*]?\s*(?:目標)\s*[：:]\s*([^\n]+)/giu;
  for (const m of body.matchAll(re)) {
    const g = toPdfLine(m[1]);
    if (g.length >= 12) goals.push(g);
  }
  if (!goals.length) {
    bulletsFromText(body).forEach((b) => {
      if (b.length >= 16 && !/設定理由|^理由/.test(b)) goals.push(b);
    });
  }
  const unique = [...new Set(goals)];
  while (unique.length < 3) {
    unique.push(
      `短期のねらい${unique.length + 1}として、日常場面で観察可能な小さな変化を積み重ねる。`,
    );
  }
  const periods = [
    "計画開始からおよそ初月〜2か月以内",
    "計画開始からおよそ3か月目まで",
    "計画開始からおよそ4〜6か月以内",
  ];
  return unique.slice(0, 6).map((content, i) => ({
    content,
    period: periods[i] ?? "計画期間内で順次見込む",
  }));
}

function distributeToDomains(bullets) {
  const buckets = SUPPORT_DOMAINS.map(() => /** @type {string[]} */ ([]));
  bullets.forEach((bullet, idx) => {
    let placed = false;
    for (let d = 0; d < 5; d += 1) {
      if (DOMAIN_KEYWORDS[d].some((kw) => bullet.includes(kw))) {
        buckets[d].push(bullet);
        placed = true;
        break;
      }
    }
    if (!placed) buckets[idx % 5].push(bullet);
  });
  return buckets.map((items, i) =>
    items.length
      ? items.join("\n")
      : `${SUPPORT_DOMAINS[i]}に関わる支援内容を、観察に基づき具体化すること。`,
  );
}

function assignGoalsToDomains(goalBodies) {
  const pool = goalBodies.filter((g) => g.length >= 12);
  return SUPPORT_DOMAINS.map((label, i) => {
    if (!pool.length) {
      return `${label}の領域で、総合方針に照らした到達目標を設定する。`;
    }
    return pool[i % pool.length];
  });
}

function formatBirthDateJp(yyyyMmDd) {
  const s = String(yyyyMmDd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("ja-JP");
  } catch {
    return s;
  }
}

function formatCreationDateJp(iso) {
  try {
    return new Date(iso).toLocaleDateString("ja-JP");
  } catch {
    return String(iso || "");
  }
}

/**
 * AI 出力とアセスメントを PDF 用ドキュメントへ変換
 * @param {Record<string, unknown>} child
 * @param {string} programText
 * @param {string} planCreatedIso
 */
export function buildFormalPlanDocument(child, programText, planCreatedIso) {
  const sections = extractH2Sections(programText);
  const familyIntentions =
    toPdfBlock(child?.familyLifeIntentions) ||
    `${toPdfLine(child?.name ?? child?.childName) || "利用児"}について、ご家庭の養育上のねらいと本人の状態を支援計画へ反映すること。`;

  const comprehensivePolicy =
    toPdfBlock(pickSection(sections, "支援方針")) ||
    "本人の状態・家族意向・環境を総合し、安全と発達の両立に配慮した支援を継続する。";

  const aiLong = toPdfBlock(pickSection(sections, "長期目標"));
  const longTermGoal = {
    content:
      (aiLong.length >= 8 ? aiLong : "") ||
      toPdfBlock(child?.goals) ||
      "生活の質の向上および本人の可能性を引き出す支援を継続する。",
    period: "本計画期間（おおむね6か月）終了まで（必要に応じて見直し）",
  };

  const shortTermGoals = extractShortTermGoals(
    pickSection(sections, "短期目標"),
  );
  const goalBodies = shortTermGoals.map((g) => g.content);
  const monthlySectionKey =
    Object.keys(sections).find(
      (k) => k.includes("月ごと") && k.includes("活動"),
    ) ?? Object.keys(sections).find((k) => k.includes("月ごと"));
  const monthlySectionRaw = monthlySectionKey
    ? sections[monthlySectionKey]
    : pickSection(sections, "月ごとの活動計画", "月ごと");
  console.log("[buildFormalPlanDocument] 支援の標準的な提供時間等（月別スケジュール）", {
    dataSource: "programText の ## 月ごと セクション（画面の Markdown 表示と同じ）",
    sectionKey: monthlySectionKey ?? "(fallback pickSection)",
    sectionHeadingKeys: Object.keys(sections),
    rawCharLength: String(monthlySectionRaw).length,
    oldBulletCount: bulletsFromText(monthlySectionRaw).length,
    rawPreview: String(monthlySectionRaw).slice(0, 400),
  });
  /** 画面表示と同じセクション本文をそのまま使用（箇条書きの再番号付けはしない） */
  const monthlySchedule = toPdfBlock(monthlySectionRaw);
  const supportBullets = bulletsFromText(
    pickSection(sections, "支援のポイント", "ポイント"),
  );
  const domainContents = distributeToDomains(supportBullets);
  const domainTargets = assignGoalsToDomains(goalBodies);

  const defaultPeriod = "6か月";
  const managerName = toPdfLine(child?.managerName);

  const domainRows = SUPPORT_DOMAINS.map((domain, i) => ({
    category: "本人支援",
    domain,
    supportTarget: domainTargets[i],
    supportContent: domainContents[i],
    period: defaultPeriod,
    priority: String(i + 1),
    notes: "",
  }));

  const familyAi = toPdfBlock(pickSection(sections, "家庭との連携"));
  const familySupportRow = {
    category: "家族支援",
    supportTarget:
      toPdfLine(familyAi).slice(0, 200) ||
      "家庭生活の安心確保と養護者への協働的支援。",
    supportContent:
      familyAi ||
      "情報共有・相談対応を通じ、生活場面での実践につなげる。",
    period: defaultPeriod,
    priority: "—",
    notes: "",
  };

  const transitionRow = {
    category: "移行支援",
    supportTarget: "異動・就学等の環境転換に備えた段階的なつながりを確保する。",
    supportContent:
      "必要に応じ準備と関係機関との情報共有を行い、安定した移行を支援する。",
    period: defaultPeriod,
    priority: "—",
    notes: "",
  };

  const regionalSupportRow = {
    category: "地域支援",
    supportTarget: "関係機関との情報共有および協議・調整を行う。",
    supportContent:
      "学校・保育・医療・相談支援等と連携し、一体的な支援の質を確保する。",
    period: defaultPeriod,
    priority: "—",
    notes: "",
  };

  return {
    title: "個別支援計画書",
    childName: toPdfLine(child?.name ?? child?.childName),
    birthDateDisplay: formatBirthDateJp(child?.birthDate),
    ageDisplay: toPdfLine(child?.age),
    disabilityHint: toPdfLine(child?.disability),
    creationDateJp: formatCreationDateJp(planCreatedIso),
    familyIntentions,
    comprehensivePolicy,
    longTermGoal,
    shortTermGoals,
    monthlySchedule,
    domainRows,
    familySupportRow,
    transitionRow,
    regionalSupportRow,
    serviceTimeDetail:
      toPdfBlock(child?.standardSupportProvision) ||
      "施設の定める曜日・時間帯・頻度に基づきサービスを提供する。",
    physicalRestraintNote: "身体拘束等の実施は行わない。",
    consultationSupportAddition: "該当なし",
    remarksNotes: toPdfBlock(child?.notes),
    managerName,
    explanationLine: "提供する支援内容について、本計画書に基づき説明しました。",
  };
}
