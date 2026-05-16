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

/** サービス提供時間欄用（曜日・頻度・時間帯のみ） */
function extractServiceTimeSchedule(child, sections) {
  const fromAssessment = String(child?.standardSupportProvision ?? "").trim();
  if (fromAssessment) return fromAssessment;

  const aiRaw = pickSection(
    sections,
    "標準的な提供時間",
    "提供時間",
    "サービス提供",
    "利用日",
    "曜日・頻度",
    "頻度",
    "時間",
    "曜日",
  );
  if (!aiRaw.trim()) {
    return "施設の定める曜日・時間帯・頻度に基づきサービスを提供する。";
  }

  const lines = String(aiRaw)
    .split(/\r?\n/)
    .map((l) => stripInlineMd(l).trim())
    .filter(Boolean);
  const scheduleLike = lines.filter((l) =>
    /曜|週|月|回|時間|分|:\d{2}|～|〜|頻度|利用日|提供/u.test(l),
  );
  const picked = (scheduleLike.length ? scheduleLike : lines.slice(0, 8))
    .join("\n")
    .trim();
  return picked.slice(0, 480) || "施設の定める曜日・時間帯・頻度に基づきサービスを提供する。";
}

/** 長期目標右カラム：月別スケジュール（## 月ごと のみ） */
function formatMonthlyScheduleSection(sectionText) {
  const raw = String(sectionText || "").trim();
  if (!raw) return "";

  const bullets = bulletsFromMarkdown(raw);
  if (bullets.length) {
    return bullets
      .map((b, i) => {
        const monthMatch = b.match(/^(\d+)\s*か月/u);
        const label = monthMatch ? `${monthMatch[1]}か月目` : `${i + 1}か月目`;
        const body = b.replace(/^\d+\s*か月目[：:\s]*/u, "").trim();
        return `・${label}：${body}`;
      })
      .join("\n")
      .slice(0, 1400);
  }

  return stripInlineMd(raw).slice(0, 1400);
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

/** 長期ねらい文を短文に繰り返し使うときのトリム **/
function shortenForDomainRef(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, Math.max(n - 1, 20))}…` : t;
}

/**
 * AIが出力した短期目標文を順に繰り返し割り当て、各領域の支援ポイント要約を末尾に連結する。
 */
/** 短期目標文のみを5領域の支援目標列へ割り当て（支援ポイントは混ぜない） */
function buildDomainSupportTargets(goalBodiesCanonical, longTermSentence) {
  const primary = [...(goalBodiesCanonical || [])].filter(
    (g) =>
      typeof g === "string" && g.trim().length >= 18 && !/^※/.test(g.trim()),
  );

  let pool = [...primary];
  const ltShort = shortenForDomainRef(longTermSentence, 400);
  if (!pool.length && ltShort.length >= 30) pool = [ltShort];

  return SUPPORT_DOMAINS.map((domainLabel, i) => {
    if (!pool.length) {
      return `${domainLabel}の領域で、総合的な支援方針に照らし観察可能な到達目標を設定する。`;
    }
    return pool[i % pool.length];
  });
}

/**
 * 短期目標ブロック → 様式用（3件）＋期間のざっくり推定
 * @returns {{ content: string, periodGuess: string }[]}
 */
/**
 * @param {string} sectionText
 * @param {string[]} fallbackBulletsRaw
 */
function parseShortTermGoals(sectionText, fallbackBulletsRaw) {
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

  /** 不足時は様式用の定型文のみ（支援ポイント・月別計画は混ぜない） */
  let padSlot = goals.length;
  while (padSlot < 3) {
    const slotIndex = padSlot;
    padSlot += 1;
    goals.push({
      content: `短期のねらい${String(slotIndex + 1)}として、日常場面での小さな成功体験の積み重ねにより、安心感・生活リズムの確立および本人の意欲づけに向けた具体的な変化として観察可能な達成項目を計画する。`,
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

function pickLongTerm(goalsFromChild, sections, comprehensivePolicy) {
  const aiLong = stripInlineMd(
    pickSection(sections, "長期目標", "長期の目標", "長期 目標"),
  ).trim();
  if (aiLong.length >= 12) {
    const periodMatch = aiLong.match(/期間[^：:\n]*[：:]\s*([^\n]+)/u);
    const content = periodMatch
      ? aiLong.replace(periodMatch[0], "").trim()
      : aiLong;
    return {
      content: truncatePlain(content, 900),
      period:
        periodMatch?.[1]?.trim() ||
        "放デイ／児発の支援計画期間を通じた到達見込み",
    };
  }

  const g = String(goalsFromChild || "").trim();
  if (g) {
    return {
      content: g,
      period: "放デイ／児発の支援計画期間を通じた到達見込み（ご家庭の意向を踏まえる）",
    };
  }

  const comp = truncatePlain(comprehensivePolicy, 520);
  if (comp.length >= 24) {
    return {
      content: comp,
      period: "本計画期間（おおむね6か月）終了まで（必要に応じて見直し）",
    };
  }

  return {
    content:
      "生活の質の向上および本人の意欲・可能性を最大限引き出すため、総合方針に沿って支援を継続する。",
    period: "本計画期間終了まで（必要に応じて見直し）",
  };
}

/** 利用児及びご家族の意向（アセスメントの familyLifeIntentions のみ） */
export function computeFamilyIntentions(child) {
  const direct = String(child?.familyLifeIntentions ?? "").trim();
  if (direct) return direct;

  const childName =
    stripInlineMd(child?.childName ?? child?.name ?? "").trim() || "";
  return `${childName ? `${childName}さん` : "利用児"}について、保育・家庭・サービスでの観察に基づき、ご家庭の養育上のねらいと本人の状態を総合して支援計画へ反映すること。`;
}

function pickPhysicalRestraintNote(sections) {
  const raw = stripInlineMd(
    pickSection(sections, "身体拘束", "拘束"),
  ).trim();
  if (raw.length >= 4) return raw.slice(0, 400);
  return "身体拘束等の実施は行わない。";
}

function pickConsultationSupportAddition(sections) {
  const raw = stripInlineMd(
    pickSection(sections, "相談支援加算", "加算", "相談支援"),
  ).trim();
  if (raw.length >= 2) return raw.slice(0, 320);
  return "該当なし";
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
  const monthlySectionRaw = pickSection(sections, "月ごと", "活動計画");

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
    comprehensiveSupportPolicy =
      "総合支援方針として、本人の状態・家族意向・環境要件を総合して安全と発達両立に配慮し、サービスにおける支援を継続的に組み立てることとする。";
  }

  const lt = pickLongTerm(
    child?.goals,
    sections,
    comprehensiveSupportPolicy,
  );

  const shortTermGoalsList = parseShortTermGoals(shortRaw, [...shortFallback]);

  const domainsContent = distributeBulletsAcrossDomains(
    bulletsSupport.length
      ? bulletsSupport
      : [
          "各領域について、観察に基づき援助内容および環境・声かけ等の調整を活動過程へ反映すること。",
        ],
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
    ltNarrative,
  );

  const defaultSupportPeriod = "6か月";
  const goalStartDateJp = formatPlanCreationDateJp(planCreatedIso);
  const providerLine = child?.managerName?.trim()
    ? `児童発達支援事業所 児童指導員・児発管（${String(child.managerName).trim()}）`
    : "児童発達支援事業所 児童指導員・管理責任者";
  const remarksNotes = truncatePlain(String(child?.notes ?? ""), 1200);

  const domainRows = SUPPORT_DOMAINS.map((domainLabel, i) => ({
    category: "本人支援",
    domain: domainLabel,
    supportTarget: domainSupportTargets[i],
    supportContent:
      domainsContent[i]?.join("\n") ||
      `${domainLabel}の観点で、観察に基づき援助内容および環境・声かけ等の調整を活動過程へ反映すること。`,
    priority: `${i + 1}`,
    period: defaultSupportPeriod,
    notes: "",
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

  const familyIntentions = computeFamilyIntentions(child);

  const familySupportRow = {
    category: "家族支援",
    domain: "",
    supportTarget: famGoal,
    supportContent:
      (familyAi.length >= 8 ? truncatePlain(familyAi, 1200) : "") ||
      "家庭との連携・情報共有および養育上の相談に応じ、生活場面での実践につなげる支援を行う。",
    priority: "—",
    period: defaultSupportPeriod,
    notes: "",
    provider: providerLine,
  };

  const standardProvision =
    formatMonthlyScheduleSection(monthlySectionRaw) ||
    "（AI出力の「月ごとの活動計画」から月別スケジュールを反映）";

  const serviceTimeDetail = extractServiceTimeSchedule(child, sections);
  const physicalRestraintNote = pickPhysicalRestraintNote(sections);
  const consultationSupportAddition = pickConsultationSupportAddition(sections);

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
    serviceTimeDetail,
    physicalRestraintNote,
    consultationSupportAddition,
    remarksNotes,
    guardianOpinion: "特になし",

    managerName: String(child?.managerName ?? "").trim(),

    parentSignaturePlaceholder: "",
    /** 画面用。PDFには出力しない */
    footerNote: PLAN_FORM_FOOTNOTE,
    rawMarkdown: programText ?? "",
    version: "mhlw-formal-r6-v1",
  };
}
