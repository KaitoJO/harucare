/** 個別支援計画書の必須項目へ AI 出力＋アセスメントをマッピング（厚労省例示様式ベース）。 */

/** @typedef {{
 *   childName?: string,
 *   birthDate?: string,
 *   age?: string,
 *   familyLifeIntentions?: string,
 *   standardSupportProvision?: string,
 *   managerName?: string,
 *   disability?: string,
 *   goals?: string,
 *   notes?: string,
 * }} ChildLike */

export const PLAN_FORM_FOOTNOTE =
  "※本書は児童発達支援の個別支援計画について、福祉・衛生関係告示（様式第二十）および厚生労働省の例示（令和元年版）を参考に自動整形しています。";

/** @type {readonly string[]} */
export const SUPPORT_DOMAINS = Object.freeze([
  "健康・生活",
  "運動・感覚",
  "認知・行為",
  "言語・コミュニケーション",
  "対人関係・社会性（集団適応等）",
]);

const DOMAIN_HINTS = [
  ["睡眠", "食事", "排泄", "清潔", "健康", "生活", "身辺", "生活リズム"],
  ["粗大", "微細", "運動", "感覚", "姿勢", "視覚", "聴覚", "触覚"],
  ["認知", "注意", "思考", "行為", "記憶", "構成", "課題", "ワーク"],
  ["コミュニケーション", "語彙", "言語", "意思", "表出", "聞く", "話す", "伝える"],
  ["友人", "社会", "保育", "集団", "対人", "ルール", "協調", "分離不安"],
];

function stripInlineMd(line) {
  return String(line || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^_+|_+$/g, "")
    .trim();
}

/**
 * 「## xxx」単位で本文を分割
 * @param {string} markdown
 */
function extractMarkdownH2(markdown) {
  /** @type {Record<string, string>} */
  const out = {};
  const md = String(markdown || "");
  const re = /^##\s+([^\r\n]+)[\t ]*$/gm;
  const headings = [...md.matchAll(re)];
  for (let i = 0; i < headings.length; i++) {
    const rawTitle = headings[i][1]?.trim() ?? "";
    const start = (headings[i].index ?? 0) + headings[i][0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index : md.length;
    out[rawTitle] = md.slice(start, end).trim();
  }
  return out;
}

function pickSection(sections, ...needles) {
  const keys = Object.keys(sections);
  for (const n of needles) {
    const hit = keys.find((k) => k.includes(n));
    if (hit) return sections[hit] ?? "";
  }
  return "";
}

/** @returns {string[]} */
function bulletsFromMarkdown(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd());
  /** @type {string[]} */
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    const un = /^[-*]\s+(.*)$/.exec(t);
    const num = /^\d+\.\s+(.*)$/.exec(t);
    const body = stripInlineMd((un ?? num)?.[1] ?? "");
    if ((un || num) && body) out.push(body);
  }
  return out;
}

/**
 * 短期目標セクションから「目標：」または箇条書きを抽出
 * @returns {{ content: string, periodGuess: string }[]}
 */
function parseShortTermGoals(sectionText, fallbackLines) {
  const raw = String(sectionText || "");
  /** @type {{ content: string, periodGuess: string }[]} */
  const goals = [];

  const blockRe =
    /\*\*\s*目標\s*[：:]?\*\*\s*[：:]?\s*(.+)|[-*]\s*\*?\s*目標\s*[：:]?\s*(.+)/gu;
  let m;
  const copy = raw;
  while ((m = blockRe.exec(copy)) !== null) {
    const line = stripInlineMd(m[1] || m[2] || "").trim();
    if (line) goals.push({ content: line, periodGuess: "" });
  }

  let reasonMerged = "";
  const reasonMatch = /\*\*\s*設定理由\s*[：:]?\*\*([\s\S]+?)(?=\n\s*[-*]|\n\*\*|##|\n\n\n|$)/u.exec(raw);
  if (reasonMatch) reasonMerged = stripInlineMd(reasonMatch[1]).replace(/\s+/g, " ").trim();

  if (goals.length === 0) {
    for (const b of bulletsFromMarkdown(raw)) {
      if (/設定理由|^理由[：:]/.test(b)) continue;
      goals.push({ content: b, periodGuess: "" });
      if (goals.length >= 5) break;
    }
  }

  while (goals.length < 3 && fallbackLines.length) {
    goals.push({
      content: fallbackLines.shift() ?? "",
      periodGuess: "",
    });
  }

  goals.forEach((g) => {
    g.periodGuess = goals.length <= 3 ? "計画初月〜3か月目" : "計画作成日から約6か月以内";
    if (reasonMerged && goals.length <= 3) {
      const prefix = `${g.content}（設定理由の要約：${reasonMerged.slice(0, 220)}`;
      g.content =
        prefix.length >= 440 ? `${prefix.slice(0, 437)}…）` : `${prefix}）`;
    }
  });

  while (goals.length < 3) {
    goals.push({
      content: "※AI出力を確認し、観察可能な短期目標を具体的に記入してください。",
      periodGuess: "",
    });
  }

  return goals.slice(0, 5);
}

/**
 * @param {string[]} bullets
 * @returns {string[][]}
 */
function distributeBulletsAcrossDomains(bullets) {
  const buckets = [[], [], [], [], []];
  const pool = bullets.length ? [...bullets] : [];
  pool.forEach((b, idx) => {
    let placed = false;
    for (let d = 0; d < 5; d++) {
      if (
        DOMAIN_HINTS[d].some((kw) =>
          String(b).toLowerCase().includes(kw.slice(0, 2)),
        ) ||
        DOMAIN_HINTS[d].some((kw) => b.includes(kw))
      ) {
        buckets[d].push(b);
        placed = true;
        break;
      }
    }
    if (!placed) buckets[idx % 5].push(b);
  });
  buckets.forEach((arr, di) => {
    if (!arr.length) arr.push(`${SUPPORT_DOMAINS[di]}に関わる支援内容を、現在の様子や課題に即して具体的に計画すること。`);
  });
  return buckets;
}

function pickLongTerm(goalsFromChild, aiFamilyCoop, disability) {
  const g = String(goalsFromChild || "").trim();
  if (g) {
    return {
      content: g,
      period: "放デイ／児発の支援計画期間を通じた到達見込み（ご家庭の意向を踏まえる）",
    };
  }
  const coop = aiFamilyCoop.trim();
  if (coop) {
    return {
      content: `家庭との連携を継続し、${stripInlineMd(disability ?? "その特性")}の特性と家族意向に沿って、生活場面での実践につなぐ。`,
      period: "約6〜12か月の見通し",
    };
  }
  return {
    content:
      "生活の質の向上および本人の意欲・可能性を最大限引き出すため、総合方針に沿って支援を継続する。",
    period: "本計画期間終了まで（必要に応じて見直し）",
  };
}

export function computeFamilyIntentions(child, issueBackground, aiFamilySection) {
  const direct = String(child?.familyLifeIntentions ?? "").trim();
  if (direct) return direct;
  const parts = [];
  const g = String(child?.goals ?? "").trim();
  if (g) parts.push(`【家族意向・ねらい（半年後の目標）】\n${g}`);
  const n = String(child?.notes ?? "").trim();
  if (n) parts.push(`【補足】\n${n}`);
  if (issueBackground) parts.push(`【課題の背景との関連】\n${issueBackground.slice(0, 500)}`);
  if (aiFamilySection) parts.push(`【計画上の家庭との連携】\n${aiFamilySection}`);
  return (
    parts.join("\n\n").trim() ||
    "※アセスメントの「家族の意向・ねらい」欄およびAI本文の該当箇所を確認し、ご家庭の意向を具体的に記入してください。"
  );
}

export function formatBirthDateJp(yyyyMmDd) {
  const s = String(yyyyMmDd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  try {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("ja-JP");
  } catch {
    return s;
  }
}

export function formatPlanCreationDateJp(iso) {
  try {
    return new Date(iso).toLocaleDateString("ja-JP");
  } catch {
    return String(iso || "");
  }
}

/**
 * AI + アセスメント → 様式入力用オブジェクト
 * @param {ChildLike} child
 * @param {string} programText
 * @param {string} planCreatedIso
 */
export function buildFormalPlanDocument(child, programText, planCreatedIso) {
  const sections = extractMarkdownH2(programText || "");
  const issueBackground =
    stripInlineMd(pickSection(sections, "課題の背景")).replace(/\s+/g, " ").trim() ||
    "";

  let comprehensiveSupportPolicy =
    stripInlineMd(pickSection(sections, "支援方針")).replace(/\s+/g, " ").trim() ||
    "";
  if (!comprehensiveSupportPolicy) {
    comprehensiveSupportPolicy = String(child?.notes || "").trim().slice(0, 800);
    if (!comprehensiveSupportPolicy)
      comprehensiveSupportPolicy =
        "※AI出力の「支援方針」セクションが見つかりませんでした。本文から転記または再生成してください。";
  }

  const shortRaw = pickSection(
    sections,
    "短期目標",
    "3. ",
  );
  const familyAi = stripInlineMd(pickSection(sections, "家庭との連携")).trim();

  const shortFallback = bulletsFromMarkdown(shortRaw).filter(Boolean);
  const shortTermGoalsList = parseShortTermGoals(shortRaw, [...shortFallback]);

  const lt = pickLongTerm(child?.goals, familyAi, child?.disability);

  const bulletsSupport = bulletsFromMarkdown(
    pickSection(sections, "支援のポイント", "支援ポイント", "ポイント"),
  );
  const monthlySnippet = stripInlineMd(
    pickSection(sections, "月ごと", "活動計画"),
  ).slice(0, 1200);

  /** @type {string[]} */
  const combinedBullets =
    bulletsSupport.length > 0
      ? bulletsSupport
      : bulletsFromMarkdown(pickSection(sections, "月ごと", "活動計画")).slice(
          0,
          14,
        );
  const domainsContent = distributeBulletsAcrossDomains(
    combinedBullets.length ? combinedBullets : [monthlySnippet].filter(Boolean),
  );

  const domainRows = SUPPORT_DOMAINS.map((domainLabel, i) => ({
    category: "本人支援",
    domain: domainLabel,
    supportTarget:
      shortTermGoalsList[i]?.content ||
      `${domainLabel}の領域で、現在の様子(${child?.disability || "※障害種別"})と整合する達成見込みのある支援目標を設定すること。`,
    supportContent:
      domainsContent[i]?.join("\n") ||
      "※実施する具体的援助内容・配慮（環境構成・教具・声かけ頻度等）を計画してください。",
    priority: `${i + 1}`,
  }));

  const familyIntentions = computeFamilyIntentions(child, issueBackground, familyAi);

  return {
    titleLine: "個別支援計画書（児童発達支援サービス／参考様式自動整形）",
    childName: String(child?.childName ?? child?.name ?? "").trim(),
    birthDateDisplay: formatBirthDateJp(child?.birthDate ?? ""),
    ageDisplay: String(child?.age ?? "").trim() || "※年齢",
    disabilityHint: String(child?.disability ?? "").trim(),
    creationDateJp: formatPlanCreationDateJp(planCreatedIso),

    familyIntentions,

    comprehensiveSupportPolicy:
      stripInlineMd(comprehensiveSupportPolicy).trim() ||

      comprehensiveSupportPolicy,

    longTermGoal: lt,

    shortTermGoals: shortTermGoalsList.slice(0, 3),

    domainRows,

    cooperationRow: (() => {
      const coopBits = [];
      if (child?.name) {
        coopBits.push(
          `${child.name}さんについて、行政・学校・保育・医療等との定期的な情報共有および家庭への支援提案を実施します。`,
        );
      }
      if (issueBackground) {
        coopBits.push(`（課題の背景：${issueBackground.slice(0, 420)}）`);
      }
      const coopFallback = coopBits.join("\n");
      return {
        category: "地域支援・連携",
        domain: "家庭・地域との連携",
        supportTarget:
          "保育施設／学校／医療・相談支援等との情報共有および家庭支援",
        supportContent:
          stripInlineMd(familyAi || coopFallback).trim() ||
          "ご家庭および関係機関との連携方針を具体的に記入してください。",
        priority: "—",
      };
    })(),

    transitionRow: {
      category: "移行支援",
      domain: "段階的支援・異動準備",
      supportTarget: "次の段階的支援・移行準備へのつながりを確保する",
      supportContent:
        stripInlineMd(
          pickSection(sections, "移行", "卒園", "就学").slice(0, 900),
        ).trim() ||
        "就学・異動などの予定がある場合、その準備および関係機関との調整について記載する。現在は特になし場合はその旨記載のこと。",
      priority: "—",
    },

    standardProvision: String(child?.standardSupportProvision ?? "").trim() ||
      "※例：〇曜日〜〇曜／週〇回／サービス時間内での提供（サービス単位時間に準拠）。具体的に入力してください。",

    managerName: String(child?.managerName ?? "").trim(),

    parentSignaturePlaceholder:
      "保護者氏名 ______________ 印    作成日 ____年 ____月 ____日",
    footerNote: PLAN_FORM_FOOTNOTE,
    rawMarkdown: programText ?? "",
    version: "hc-formal-plan-v1",
  };
}
