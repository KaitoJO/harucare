/** 5領域（専門的支援計画書） */
export const SPECIALIZED_SUPPORT_DOMAINS = [
  { id: "health_life", label: "健康・生活" },
  { id: "motor_sense", label: "運動・感覚" },
  { id: "cognition_behavior", label: "認知・行動" },
  { id: "language_communication", label: "言語・コミュニケーション" },
  { id: "relationship_social", label: "人間関係・社会性" },
];

export function todayYyyyMmDdSpecialized() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @returns {{ domains: string[], timing: string, aim: string, activityExamples: string, implementationMethod: string }} */
export function createEmptySpecializedGoal() {
  return {
    domains: [],
    timing: "",
    aim: "",
    activityExamples: "",
    implementationMethod: "",
  };
}

/** @param {import('./lib/workspaceSettings.js').WorkspaceSettings} settings */
export function createDefaultSpecializedPlanForm(settings) {
  return {
    childId: "",
    childName: "",
    childFurigana: "",
    birthDate: "",
    facilityName: settings.facilityName ?? "",
    supportStaff: ["", "", "", ""],
    creationDate: todayYyyyMmDdSpecialized(),
    authorName: settings.defaultAuthorName ?? "",
    calculationStartDate: "",
    currentStatus: "",
    goal1: createEmptySpecializedGoal(),
    goal2: createEmptySpecializedGoal(),
    consentDate: "",
    guardianName: "",
  };
}

export function resolveSpecializedChildName(form, childrenList) {
  const hit = childrenList.find((c) => String(c.id) === String(form.childId));
  return hit?.name ?? form.childName?.trim() ?? "（未入力）";
}

/** @param {string} yyyyMmDd */
export function formatBirthDateDisplay(yyyyMmDd) {
  const raw = String(yyyyMmDd ?? "").trim();
  if (!raw) return "";
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return raw;
  try {
    return new Date(y, m - 1, d).toLocaleDateString("ja-JP");
  } catch {
    return raw;
  }
}

/** @param {string} yyyyMmDd */
export function formatWarekiDateDisplay(yyyyMmDd) {
  const raw = String(yyyyMmDd ?? "").trim();
  if (!raw) return "";
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return raw;
  const reiwaYear = y - 2018;
  if (reiwaYear >= 1) {
    return `令和 ${reiwaYear} 年 ${m} 月 ${d} 日`;
  }
  const heiseiYear = y - 1988;
  if (heiseiYear >= 1) {
    return `平成 ${heiseiYear} 年 ${m} 月 ${d} 日`;
  }
  return `${y}年${m}月${d}日`;
}

export function formatSpecializedDomains(domainIds) {
  const set = new Set(domainIds ?? []);
  return SPECIALIZED_SUPPORT_DOMAINS.filter((d) => set.has(d.id)).map((d) => d.label);
}

export function specializedPlanFormFromChild(child, settings) {
  const base = createDefaultSpecializedPlanForm(settings);
  if (!child) return base;
  return {
    ...base,
    childId: child.id ?? "",
    childName: child.name ?? "",
    birthDate: child.birthDate ?? "",
  };
}

/** @param {ReturnType<typeof createDefaultSpecializedPlanForm>} form */
export function buildSpecializedPlanProgramText(form) {
  const lines = [
    `【専門的支援計画書】${form.childName || "（児童名未入力）"}`,
    `事業所：${form.facilityName || "—"}`,
    `作成日：${form.creationDate || "—"}`,
    "",
    "【現在の状況】",
    String(form.currentStatus ?? "").trim() || "（未入力）",
    "",
    "【目標1】",
    `5領域：${formatSpecializedDomains(form.goal1?.domains).join("、") || "—"}`,
    `実施タイミング：${form.goal1?.timing || "—"}`,
    `ねらい：${form.goal1?.aim || "—"}`,
    `活動例：${form.goal1?.activityExamples || "—"}`,
    `実施方法：${form.goal1?.implementationMethod || "—"}`,
    "",
    "【目標2】",
    `5領域：${formatSpecializedDomains(form.goal2?.domains).join("、") || "—"}`,
    `実施タイミング：${form.goal2?.timing || "—"}`,
    `ねらい：${form.goal2?.aim || "—"}`,
    `活動例：${form.goal2?.activityExamples || "—"}`,
    `実施方法：${form.goal2?.implementationMethod || "—"}`,
  ];
  return lines.join("\n");
}

function parseGoalSection(raw, goalKey) {
  const goal = createEmptySpecializedGoal();
  const patterns = [
    new RegExp(`##\\s*${goalKey}[\\s\\S]*?(?=##\\s*目標|$)`, "i"),
    new RegExp(`##\\s*${goalKey}`, "i"),
  ];
  let section = "";
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) {
      section = m[0].replace(/^##\s*[^\n]+\n?/i, "").trim();
      break;
    }
  }
  if (!section) return goal;

  const pick = (labels) => {
    for (const label of labels) {
      const re = new RegExp(
        `(?:###|####)?\\s*${label}\\s*[:：]?\\s*\\n([\\s\\S]*?)(?=\\n(?:###|####|##)|$)`,
        "i",
      );
      const hit = section.match(re);
      if (hit?.[1]?.trim()) return hit[1].trim();
    }
    return "";
  };

  const domainsRaw = pick(["5領域", "５領域"]);
  if (domainsRaw) {
    const labels = domainsRaw
      .split(/[、,\/\n・]/)
      .map((s) => s.trim())
      .filter(Boolean);
    goal.domains = SPECIALIZED_SUPPORT_DOMAINS.filter((d) =>
      labels.some((l) => l.includes(d.label) || d.label.includes(l)),
    ).map((d) => d.id);
  }

  goal.timing = pick(["実施タイミング"]);
  goal.aim = pick(["ねらい", "狙い"]);
  goal.activityExamples = pick(["活動例"]);
  goal.implementationMethod = pick(["実施方法"]);

  return goal;
}

/** @param {string} text */
export function parseSpecializedPlanAiGoals(text) {
  const raw = String(text ?? "").trim();
  return {
    goal1: parseGoalSection(raw, "目標1"),
    goal2: parseGoalSection(raw, "目標2"),
  };
}

/** @param {object} record */
export function specializedPlanFormFromRecord(record) {
  const plan = record.mappedPlan ?? {};
  const staff = Array.isArray(plan.supportStaff) ? [...plan.supportStaff] : ["", "", "", ""];
  while (staff.length < 4) staff.push("");

  return {
    childId: record.childId ?? plan.childId ?? "",
    childName: plan.childName ?? record.childName ?? "",
    childFurigana: plan.childFurigana ?? "",
    birthDate: plan.birthDate ?? "",
    facilityName: plan.facilityName ?? "",
    supportStaff: staff.slice(0, 4),
    creationDate: plan.creationDate ?? todayYyyyMmDdSpecialized(),
    authorName: plan.authorName ?? "",
    calculationStartDate: plan.calculationStartDate ?? "",
    currentStatus: plan.currentStatus ?? "",
    goal1: { ...createEmptySpecializedGoal(), ...(plan.goal1 ?? {}) },
    goal2: { ...createEmptySpecializedGoal(), ...(plan.goal2 ?? {}) },
    consentDate: plan.consentDate ?? "",
    guardianName: plan.guardianName ?? "",
  };
}
