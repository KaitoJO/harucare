/** 個別支援計画書の必須項目へ AI 出力＋アセスメントをマッピング（厚労省例示様式ベース）。 */

/** @typedef {{
 *   childName?: string,
 *   birthDate?: string,
 *   age?: string,
 *   familyLifeIntentions?: string,
 *   standardSupportProvision?: string,
 *   managerName?: string,
 *   facilityName?: string,
 *   disability?: string,
 *   goals?: string,
 *   notes?: string,
 * }} ChildLike */

export const PLAN_FORM_FOOTNOTE =
  "※本書は児童発達支援の個別支援計画について、福祉・衛生関係告示（様式第二十）および厚生労働省の例示（令和6年版）に沿って作成しています。";

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
  let s = String(line || "");
  s = s.replace(/```[^\n]*\n([\s\S]*?)```/g, "$1");
  s = s.replace(/^#{1,6}[ \t]+/gm, "");
  s = s.replace(/^[ \t]*(?:[*+-]|•)[ \t]+/gm, "");
  s = s.replace(/!\[([^\]]*)]\([^)]*\)/g, "$1");
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, "$1");
  for (let i = 0; i < 6 && /\*\*/.test(s); i += 1) {
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  }
  return s
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

/** 参照日基準のおおよその満年齢（表示用）。 */
function estimateAgeJpFromBirthYYYY_MM_DD(yMd, referenceIso) {
  const s = String(yMd ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  let refMs = Date.now();
  if (referenceIso) {
    const t = new Date(referenceIso).getTime();
    if (!Number.isNaN(t)) refMs = t;
  }
  const ref = new Date(refMs);
  try {
    const [y0, mo0, d0] = s.split("-").map(Number);
    const birth = new Date(y0, mo0 - 1, d0);
    let ageYears = ref.getFullYear() - birth.getFullYear();
    const mDiff = ref.getMonth() - birth.getMonth();
    const dDiff = ref.getDate() - birth.getDate();
    if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) ageYears -= 1;
    return ageYears >= 0 ? `${String(ageYears)}歳` : "";
  } catch {
    return "";
  }
}

function synthesizeProvisionText(sections) {
  const candidates = [
    pickSection(
      sections,
      "標準的な提供時間",
      "提供時間",
      "サービス提供",
      "利用日",
      "曜日・頻度",
      "頻度",
      "時間",
      "曜日",
    ),
    pickSection(sections, "月ごと", "活動計画"),
  ].map((raw) =>
    stripInlineMd(String(raw || "")).replace(/\s+/g, " ").trim(),
  );
  const hit =
    candidates.find((t) => t.length >= 18 && !/^※/.test(t)) ??
    "";
  return hit.slice(0, 900);
}

function truncatePlain(s, n) {
  const t = stripInlineMd(s).replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, Math.max(0, n - 1))}…` : t;
}

function synthesizeRegionalBody(familyAi, issueBackground, childName) {
  const bits = [
    childName
      ? `${childName}さんについて、学校・保育・医療・相談支援等との情報共有、必要時の協議・調整および関係文書に基づく支援の調整を行う。`
      : "関係機関との情報共有・協議および必要時の調整により、一体的な支援の質を確保する。",
  ];
  const fa = stripInlineMd(String(familyAi || "")).trim();
  const ib = stripInlineMd(String(issueBackground || "")).trim();
  /** 前半は家族寄りになりがちのため末尾を地域連携側に載せやすくするため二段構成 */
  if (fa.length >= 160) bits.push(truncatePlain(fa, 520));
  else if (fa) bits.push(fa);
  if (ib.length >= 12) bits.push(`（関連する背景情報）${truncatePlain(ib, 360)}`);
  return bits.filter(Boolean).join("\n").trim();
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

function stripTrailingReasonSentence(s) {
  const t = String(s || "").trim();
  const ix = t.search(/\s*[（(]?\s*(?:設定)?理由\s*[：:]|（理由\s*[：:]）/);
  if (ix <= 32) return t;
  return t.slice(0, ix).replace(/[\s.。…]+$/, "").trim() || t;
}

function normalizeGoalSentence(s) {
  return stripTrailingReasonSentence(stripInlineMd(s));
}

function dedupeGoalBodies(goalsIn) {
  /** @type {string[]} */
  const out = [];
  const heads = new Set();
  goalsIn.forEach((gRaw) => {
    const g = normalizeGoalSentence(gRaw);
    if (g.length < 22 || /^※/.test(g) || /入力してください/u.test(g)) return;
    const head = `${g.slice(0, Math.min(g.length, 160)).toLowerCase()}`;
    if (heads.has(head)) return;
    heads.add(head);
    out.push(g);
  });
  return out.slice(0, 8);
}

/**
 * 「短期目標」Markdownから目標文を抽出する
 * @param {string} sectionText
 * @returns {string[]}
 */
function extractGoalBodiesFromShortTerm(sectionText) {
  const raw = String(sectionText || "");
  /** @type {string[]} */
  const gathered = [];

  /** 複数 "##" が残っている場合のみ先頭ブロックのみ使用 */
  let bodyOnly = raw;
  const nextH2 = bodyOnly.match(/\n(?:##\s+[^\s])/u);
  if (nextH2?.index != null && nextH2.index > 40) {
    bodyOnly = bodyOnly.slice(0, nextH2.index);
  }

  const lineGoalRe =
    /(?:^|\n)\s*[-*]\s*(?:\*\*)?\s*(?:●\s*)?目標\s*[：:･]+\s*([^\r\n]+)/giu;
  for (const m of bodyOnly.matchAll(lineGoalRe)) {
    const rest = stripInlineMd(m[1] || "");
    const piece = normalizeGoalSentence(rest);
    if (piece.length >= 22) gathered.push(piece);
  }

  bodyOnly.split(/\r?\n/).forEach((line) => {
    const t = stripInlineMd(line.trim());
    if (!t || /^##/.test(t)) return;
    if (/設定理由|^理由|^ポイント/.test(t)) return;
    const hasGoalKey = /目標\s*[：:･]/u.test(t);
    const isBulletGoal = /^[-*]\s+/.test(t) && hasGoalKey;
    if (!isBulletGoal && !/^目標\s*[：:･]/u.test(t.trim())) return;
    const stripped = normalizeGoalSentence(
      stripInlineMd(t.replace(/^[-*]+\s*/, "").trim()),
    );
    /** `目標：` だけの行などを除外 **/
    const body = stripped.replace(/^[^：:･]*[：:･]+\s*/, "").trim() || stripped;
    if (
      normalizeGoalSentence(body).length >= 22 &&
      !/^※/.test(normalizeGoalSentence(body))
    ) {
      gathered.push(normalizeGoalSentence(body));
    }
  });

  if (!gathered.length) {
    for (const b of bulletsFromMarkdown(bodyOnly)) {
      if (/設定理由|^理由|ポイント[：:]/.test(b)) continue;
      gathered.push(normalizeGoalSentence(b));
    }
  }

  return dedupeGoalBodies(gathered).slice(0, 8);
}

/**
 * アセスメント短文を補強（フォールバック用）
 */
function splitSupportBulletLead(bul) {
  return normalizeGoalSentence(bul.replace(/^[-*\d]+\.?\s+/, ""));
}

/** 長期ねらい文を短文に繰り返し使うときのトリム **/
function shortenForDomainRef(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, Math.max(n - 1, 20))}…` : t;
}

/**
 * AIが出力した短期目標文を順に繰り返し割り当て、各領域の支援ポイント要約を末尾に連結する。
 */
function buildDomainSupportTargets(
  goalBodiesCanonical,
  supportBulletLinesForFallback,
  longTermSentence,
  buckets,
) {
  const primary = [...(goalBodiesCanonical || [])].filter(
    (g) =>
      typeof g === "string" && g.trim().length >= 18 && !/^※/.test(g.trim()),
  );

  const fromSupportBullets = [...(supportBulletLinesForFallback || [])]
    .map((line) =>
      shortenForDomainRef(splitSupportBulletLead(String(line ?? "")), 420),
    )
    .filter((s) => s.length >= 28 && !/^※/.test(s));

  let pool =
    primary.length > 0
      ? [...primary]
      : fromSupportBullets.length > 0
        ? [...fromSupportBullets]
        : [];

  const ltShort = shortenForDomainRef(longTermSentence, 400);
  if (!pool.length && ltShort.length >= 30) pool = [ltShort, ltShort, ltShort];

  const onePerDomain = SUPPORT_DOMAINS.map((domainLabel, i) => {
    if (!pool.length) {
      return `${domainLabel}の領域で、総合的な支援方針に照らし観察可能な短期のねらいを設定する。`;
    }
    const core = pool[i % pool.length];
    const bucketBits = (buckets[i] || [])
      .map((b) => shortenForDomainRef(stripTrailingReasonSentence(b), 280))
      .filter(Boolean);
    const tail = bucketBits.length ? bucketBits.join(" / ") : "";
    if (!tail) return core;
    const head = tail.slice(0, 40);
    if (core.includes(head)) return core;
    return `${core}\n（${domainLabel}の観点：${tail}）`;
  });

  return onePerDomain;
}

/**
 * 短期目標ブロック → 様式用（3件）＋期間のざっくり推定
 * @returns {{ content: string, periodGuess: string }[]}
 */
/**
 * @param {string} sectionText
 * @param {string[]} fallbackBulletsRaw
 * @param {{ ltContent?: string, comprehensive?: string, combinedBullets?: string[] }} [ctx]
 */
function parseShortTermGoals(sectionText, fallbackBulletsRaw, ctx) {
  const fbIn = [...(fallbackBulletsRaw || [])].map((x) => normalizeGoalSentence(x));
  const extracted = extractGoalBodiesFromShortTerm(sectionText);
  const merged = dedupeGoalBodies([...extracted, ...fbIn.filter(Boolean)]);

  /** @type {{ content: string, periodGuess: string }[]} */
  const goals = merged.map((content) => ({
    content,
    periodGuess: "",
  }));

  const fbRemain = [...fbIn.filter((x) => x.length >= 18)];
  while (goals.length < 3 && fbRemain.length) {
    const cur = fbRemain.shift()?.trim?.() ?? "";
    if (
      cur &&
      cur.length >= 24 &&
      !goals.some((g) => g.content.slice(0, 80) === cur.slice(0, 80))
    ) {
      goals.push({ content: cur, periodGuess: "" });
    }
  }

  goals.forEach((g, idx) => {
    g.periodGuess =
      idx === 0
        ? "計画開始からおよそ初月〜2か月以内"
        : idx === 1
          ? "計画開始からおよそ3か月目まで"
          : "計画開始からおよそ4〜6か月以内";
    if (idx >= 3) {
      g.periodGuess =
        "計画作成後、全体のねらいに沿って順次見込む時期として設定すること。";
    }
  });

  /** 二次：マークダウン側のリスト・長期ねらい・方針の先頭などから短文を補う */
  let padSlot = goals.length;
  while (padSlot < 3) {
    const slotIndex = padSlot;
    padSlot += 1;
    const fromBullet =
      normalizeGoalSentence(
        stripInlineMd(ctx?.combinedBullets?.[slotIndex] ?? ""),
      ) ||
      normalizeGoalSentence(
        stripInlineMd(ctx?.combinedBullets?.at(-1) ?? ""),
      );
    let content = "";
    if (fromBullet.length >= 26) content = fromBullet;
    else {
      const fromLt =
        typeof ctx?.ltContent === "string" && ctx.ltContent.trim().length >= 24
          ? truncatePlain(ctx.ltContent, 340)
          : "";
      const comp = truncatePlain(ctx?.comprehensive ?? "", 520);
      if (slotIndex === 0 && fromLt) content = fromLt;
      else if (comp.length >= 30) {
        const partsComp = comp.split(/[。\n]/u).filter(Boolean);
        content =
          partsComp[slotIndex]?.trim()?.slice?.(0, 280) ??
          comp.slice(0, Math.min(comp.length, 280));
      } else {
        content = `短期のねらい${String(slotIndex + 1)}として、日常場面での小さな成功体験の積み重ねにより、安心感・生活リズムの確立および本人の意欲づけに向けた具体的な変化として観察可能な達成項目を計画する。`;
      }
    }

    goals.push({
      content: normalizeGoalSentence(content),
      periodGuess:
        slotIndex === 0
          ? "計画初月頃まで"
          : slotIndex === 1
            ? "計画開始からおよそ半期の前半"
            : "計画開始からおよそ半期の後半",
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
  const merged = parts.join("\n\n").trim();
  if (merged.length >= 12) return merged;
  const childName =
    stripInlineMd(child?.childName ?? child?.name ?? "").trim() || "";
  const notesTail = stripInlineMd(String(child?.notes ?? "")).trim();
  const base = `${childName ? `${childName}さん` : "利用児"}について、保育・家庭・サービスでの観察に基づき、ご家庭の養育上のねらいと本人の状態を総合して支援計画へ反映すること。`;
  return [base, String(aiFamilySection ?? "").slice(0, 480), issueBackground.slice(0, 400), notesTail.slice(0, 400)]
    .filter((x) => String(x ?? "").trim().length >= 4)
    .join("\n\n")
    .trim();
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

  const shortRaw = pickSection(
    sections,
    "短期目標",
    "3. ",
  );
  const familyAi = stripInlineMd(pickSection(sections, "家庭との連携")).trim();
  const shortFallback = bulletsFromMarkdown(shortRaw).filter(Boolean);

  const bulletsSupport = bulletsFromMarkdown(
    pickSection(sections, "支援のポイント", "支援ポイント", "ポイント"),
  );
  const monthlySnippet = stripInlineMd(
    pickSection(sections, "月ごと", "活動計画"),
  ).slice(0, 1200);

  const combinedBullets =
    bulletsSupport.length > 0
      ? bulletsSupport
      : bulletsFromMarkdown(pickSection(sections, "月ごと", "活動計画")).slice(
          0,
          14,
        );

  let comprehensiveSupportPolicy =
    stripInlineMd(pickSection(sections, "支援方針")).replace(/\s+/g, " ").trim() ||
    "";
  if (!stripInlineMd(comprehensiveSupportPolicy).replace(/\s+/g, "").length) {
    comprehensiveSupportPolicy = truncatePlain(
      pickSection(
        sections,
        "支援計画概要",
        "支援のねらい",
        "総合支援",
      ),
      900,
    );
  }
  if (!stripInlineMd(comprehensiveSupportPolicy).replace(/\s+/g, "").length) {
    comprehensiveSupportPolicy = truncatePlain(
      `${issueBackground} ${String(child?.notes ?? "").trim()}`.trim(),
      900,
    );
  }
  if (!stripInlineMd(comprehensiveSupportPolicy).replace(/\s+/g, "").length) {
    comprehensiveSupportPolicy =
      "総合支援方針として、本人の状態・家族意向・環境要件を総合して安全と発達両立に配慮し、サービスにおける支援を継続的に組み立てることとする。";
  }

  const lt = pickLongTerm(child?.goals, familyAi, child?.disability);

  const shortTermGoalsList = parseShortTermGoals(shortRaw, [...shortFallback], {
    ltContent: lt.content,
    comprehensive: comprehensiveSupportPolicy,
    combinedBullets,
  });

  const domainsContent = distributeBulletsAcrossDomains(
    combinedBullets.length ? combinedBullets : [monthlySnippet].filter(Boolean),
  );

  const goalBodiesForDomains = dedupeGoalBodies([
    ...extractGoalBodiesFromShortTerm(shortRaw),
    ...shortFallback.map((x) => normalizeGoalSentence(x)),
  ]);

  const ltNarrative = String(lt.content || comprehensiveSupportPolicy || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);

  const domainSupportTargets = buildDomainSupportTargets(
    goalBodiesForDomains,
    combinedBullets,
    ltNarrative,
    domainsContent,
  );

  const defaultSupportPeriod = "6か月";
  const goalStartDateJp = formatPlanCreationDateJp(planCreatedIso);
  const providerLine = child?.managerName?.trim()
    ? `児童発達支援事業所 児童指導員・児発管（${String(child.managerName).trim()}）`
    : "児童発達支援事業所 児童指導員・管理責任者";
  const notesForRemarks = truncatePlain(String(child?.notes ?? ""), 1200);

  const domainRows = SUPPORT_DOMAINS.map((domainLabel, i) => ({
    category: "本人支援",
    domain: domainLabel,
    supportTarget: domainSupportTargets[i],
    supportContent:
      domainsContent[i]?.join("\n") ||
      `${domainLabel}の観点で、観察に基づき援助内容および環境・声かけ等の調整を活動過程へ反映すること。`,
    priority: `${i + 1}`,
    period: defaultSupportPeriod,
    notes: i === 0 ? notesForRemarks.slice(0, 320) : "",
    provider: providerLine,
  }));

  const cn = String(child?.childName ?? child?.name ?? "").trim();

  const regionalSupportRow = {
    category: "地域支援",
    domain: "",
    supportTarget:
      truncatePlain(
        pickSection(sections, "地域", "関係機関", "協議").slice(0, 650),
        420,
      ) ||
      "関係機関との情報共有および必要時の協議・調整を通じて、一体的支援の質を確保すること。",
    supportContent: synthesizeRegionalBody(familyAi, issueBackground, cn),
    priority: "—",
    period: defaultSupportPeriod,
    notes: "",
    provider: providerLine,
  };

  const famGoal =
    truncatePlain(familyAi, 360) ||
    `${cn ? `${cn}さん` : "ご本人"}の家庭生活における安心の確保と、養護者の過負担防止に資する協働的支援として支援を構成すること。`;

  const famBodyPieces = [];
  if (familyAi.length >= 8) famBodyPieces.push(truncatePlain(familyAi, 1150));
  const gFam = stripInlineMd(String(child?.goals ?? "")).trim();
  if (gFam.length >= 6)
    famBodyPieces.push(`【家族意向／ねらい（アセスメント）】\n${truncatePlain(gFam, 520)}`);
  if (issueBackground.length >= 8)
    famBodyPieces.push(`（課題の背景との関連）${truncatePlain(issueBackground, 440)}`);

  const familyIntentions = computeFamilyIntentions(child, issueBackground, familyAi);

  const familySupportRow = {
    category: "家族支援",
    domain: "",
    supportTarget: famGoal,
    supportContent:
      famBodyPieces.filter(Boolean).join("\n\n").trim() ||
      truncatePlain(familyIntentions, 1200),
    priority: "—",
    period: defaultSupportPeriod,
    notes: "",
    provider: providerLine,
  };

  const provisionSynth = synthesizeProvisionText(sections);
  const standardProvision =
    String(child?.standardSupportProvision ?? "").trim() ||
    provisionSynth ||
    "施設および利用契約に定める提供時間・頻度・曜日のもと計画的にサービス時間内において実施する。";

  const transitionAi = stripInlineMd(pickSection(sections, "移行", "卒園", "就学")).trim();

  const transitionSupportContent =
    transitionAi.trim().length >= 12
      ? transitionAi.slice(0, 900)
      : `${cn ? `${cn}さん` : "本人"}について、異動・就学などの環境転換がある場合には準備と関係調整を内容に組み込み、当面の転換見込みがない場合にも継続的な安定支援の根拠を残す運用として記録する。`;

  return {
    formatId: "mhlw-r6-official",
    titleLine: "個別支援計画書",
    subtitleLine: "",
    planPeriodLabel: "",
    goalStartDateJp,
    defaultSupportPeriod,

    footerExplainer:
      "提供する支援内容について、本計画書に基づき説明しました。",

    childName: cn,
    facilityName: String(child?.facilityName ?? "").trim(),
    birthDateDisplay: formatBirthDateJp(child?.birthDate ?? ""),
    ageDisplay:
      String(child?.age ?? "").trim()
      || estimateAgeJpFromBirthYYYY_MM_DD(child?.birthDate, planCreatedIso),
    disabilityHint: String(child?.disability ?? "").trim(),
    creationDateJp: formatPlanCreationDateJp(planCreatedIso),

    familyIntentions,

    comprehensiveSupportPolicy:
      stripInlineMd(comprehensiveSupportPolicy).trim() ||

      comprehensiveSupportPolicy,

    longTermGoal: lt,

    shortTermGoals: shortTermGoalsList.slice(0, 6),

    domainRows,

    familySupportRow,
    regionalSupportRow,
    cooperationRow: regionalSupportRow,

    transitionRow: {
      category: "移行支援",
      domain: "",
      supportTarget:
        truncatePlain(transitionAi, 340) ||
        "異動や就学準備への段階的つながりを確保し、環境転換における情報共有と協働により本人の適応支援を進めること。",
      supportContent: transitionSupportContent,
      priority: "—",
      period: defaultSupportPeriod,
      notes: "",
      provider: providerLine,
    },

    standardProvision,
    serviceTimeDetail: [standardProvision, `【提供体制】${providerLine}`]
      .filter(Boolean)
      .join("\n\n"),
    remarksNotes: notesForRemarks,
    guardianOpinion: "特になし",

    managerName: String(child?.managerName ?? "").trim(),

    parentSignaturePlaceholder: "",
    /** 画面用。PDFには出力しない */
    footerNote: PLAN_FORM_FOOTNOTE,
    rawMarkdown: programText ?? "",
    version: "mhlw-formal-r6-v1",
  };
}
