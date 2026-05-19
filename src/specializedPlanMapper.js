import {
  formatBirthDateDisplay,
  formatSpecializedDomains,
  formatWarekiDateDisplay,
} from "./specializedPlanConfig.js";
import { toPdfBlock, toPdfLine } from "./supportPlanPdfText.js";

/**
 * フォーム入力 → PDF用スナップショット
 * @param {import('./specializedPlanConfig.js').ReturnType<typeof import('./specializedPlanConfig.js').createDefaultSpecializedPlanForm>} form
 */
export function buildMappedSpecializedPlan(form) {
  const supportStaff = (form.supportStaff ?? [])
    .map((s) => String(s ?? "").trim())
    .slice(0, 4);
  while (supportStaff.length < 4) supportStaff.push("");

  const mapGoal = (goal) => ({
    domains: Array.isArray(goal?.domains) ? [...goal.domains] : [],
    domainLabels: formatSpecializedDomains(goal?.domains),
    timing: String(goal?.timing ?? "").trim(),
    aim: String(goal?.aim ?? "").trim(),
    activityExamples: String(goal?.activityExamples ?? "").trim(),
    implementationMethod: String(goal?.implementationMethod ?? "").trim(),
  });

  return {
    childId: form.childId ?? "",
    childName: String(form.childName ?? "").trim(),
    childFurigana: String(form.childFurigana ?? "").trim(),
    birthDate: String(form.birthDate ?? "").trim(),
    birthDateDisplay: formatBirthDateDisplay(form.birthDate),
    facilityName: String(form.facilityName ?? "").trim(),
    supportStaff,
    creationDate: String(form.creationDate ?? "").trim(),
    creationDateDisplay: formatWarekiDateDisplay(form.creationDate),
    authorName: String(form.authorName ?? "").trim(),
    calculationStartDate: String(form.calculationStartDate ?? "").trim(),
    calculationStartDateDisplay: formatWarekiDateDisplay(form.calculationStartDate),
    currentStatus: String(form.currentStatus ?? "").trim(),
    goal1: mapGoal(form.goal1),
    goal2: mapGoal(form.goal2),
    consentDate: String(form.consentDate ?? "").trim(),
    consentDateDisplay: formatWarekiDateDisplay(form.consentDate),
    guardianName: String(form.guardianName ?? "").trim(),
    title: "専門的支援計画書",
  };
}

/** PDF 表示用にプレーンテキスト化 */
export function normalizeMappedSpecializedPlan(doc) {
  const d = doc ?? {};
  const cleanGoal = (g) => ({
    domainLabels: (g?.domainLabels ?? []).map((x) => toPdfLine(x)).filter(Boolean),
    timing: toPdfBlock(g?.timing),
    aim: toPdfBlock(g?.aim),
    activityExamples: toPdfBlock(g?.activityExamples),
    implementationMethod: toPdfBlock(g?.implementationMethod),
  });

  return {
    ...d,
    childName: toPdfLine(d.childName),
    childFurigana: toPdfLine(d.childFurigana),
    birthDateDisplay: toPdfLine(d.birthDateDisplay),
    facilityName: toPdfLine(d.facilityName),
    supportStaff: (d.supportStaff ?? []).map((s) => toPdfLine(s)),
    creationDateDisplay: toPdfLine(d.creationDateDisplay),
    authorName: toPdfLine(d.authorName),
    calculationStartDateDisplay: toPdfLine(d.calculationStartDateDisplay),
    currentStatus: toPdfBlock(d.currentStatus),
    goal1: cleanGoal(d.goal1),
    goal2: cleanGoal(d.goal2),
    consentDateDisplay: toPdfLine(d.consentDateDisplay),
    guardianName: toPdfLine(d.guardianName),
    title: toPdfLine(d.title) || "専門的支援計画書",
  };
}
