export const PARENTING_SUPPORT_MONTHLY_LIMIT = 4;

export const PARENTING_PARTICIPATION_OPTIONS = [
  { id: "direct", label: "直接参加" },
  { id: "observe", label: "観察のみ" },
];

export function todayYyyyMmDdPs() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowTimeHmPs() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function createDefaultParentingSupportForm() {
  return {
    childId: "",
    conductedDate: todayYyyyMmDdPs(),
    conductedTime: nowTimeHmPs(),
    staffName: "",
    guardianName: "",
    guardianRelation: "",
    supportSceneType: "",
    participationMode: "direct",
    startTime: "",
    endTime: "",
    observationContent: "",
    aiConsultationRecord: "",
    aiChildCharacteristics: "",
    aiParentAdvice: "",
    aiHomePractice: "",
    parentSignature: "",
    staffConfirmation: "",
  };
}

export function participationModeLabel(modeId) {
  return (
    PARENTING_PARTICIPATION_OPTIONS.find((o) => o.id === modeId)?.label ?? modeId
  );
}

/** @param {string} start @param {string} end */
export function calcDurationMinutesPs(start, end) {
  const s = String(start ?? "").trim();
  const e = String(end ?? "").trim();
  if (!s || !e) return null;
  const [sh, sm] = s.split(":").map((x) => Number(x) || 0);
  const [eh, em] = e.split(":").map((x) => Number(x) || 0);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function buildConductedIsoPs(dateStr, timeStr) {
  const d = String(dateStr || todayYyyyMmDdPs()).trim();
  const t = String(timeStr || "12:00").trim();
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map((x) => Number(x) || 0);
  return new Date(y, m - 1, day, hh, mm, 0, 0).toISOString();
}

export function yearMonthFromIsoPs(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  } catch {
    return "";
  }
}

export function yearMonthFromDateStrPs(dateStr) {
  const d = String(dateStr ?? "").trim();
  return d.length >= 7 ? d.slice(0, 7) : yearMonthFromIsoPs(new Date().toISOString());
}

export function dateStrFromIsoPs(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

export function countParentingInMonth(records, childId, yearMonth) {
  if (!childId || !yearMonth) return 0;
  return records.filter((r) => {
    if (String(r.childId) !== String(childId)) return false;
    const ym = yearMonthFromIsoPs(r.conductedAt);
    return ym === yearMonth && r.billable !== false;
  }).length;
}

export function remainingParentingMonthlySlots(usedCount) {
  return Math.max(0, PARENTING_SUPPORT_MONTHLY_LIMIT - usedCount);
}

export function buildParentingSupportPayload(form) {
  const durationMinutes = calcDurationMinutesPs(form.startTime, form.endTime);
  return {
    conductedDate: form.conductedDate ?? "",
    conductedTime: form.conductedTime ?? "",
    guardianName: String(form.guardianName ?? "").trim(),
    guardianRelation: String(form.guardianRelation ?? "").trim(),
    supportSceneType: String(form.supportSceneType ?? "").trim(),
    participationMode: form.participationMode === "observe" ? "observe" : "direct",
    startTime: form.startTime ?? "",
    endTime: form.endTime ?? "",
    observationContent: String(form.observationContent ?? "").trim(),
    parentSignature: String(form.parentSignature ?? "").trim(),
    staffConfirmation: String(form.staffConfirmation ?? "").trim(),
    durationMinutes,
  };
}

export function parentingSupportFormFromRecord(record) {
  const p = record.payload ?? {};
  const conducted = record.conductedAt ? new Date(record.conductedAt) : new Date();
  const y = conducted.getFullYear();
  const m = String(conducted.getMonth() + 1).padStart(2, "0");
  const day = String(conducted.getDate()).padStart(2, "0");
  const hh = String(conducted.getHours()).padStart(2, "0");
  const mm = String(conducted.getMinutes()).padStart(2, "0");

  return {
    childId: record.childId ?? "",
    conductedDate: p.conductedDate || `${y}-${m}-${day}`,
    conductedTime: p.conductedTime || `${hh}:${mm}`,
    staffName: record.staffName ?? "",
    guardianName: p.guardianName ?? "",
    guardianRelation: p.guardianRelation ?? "",
    supportSceneType: p.supportSceneType ?? "",
    participationMode: p.participationMode === "observe" ? "observe" : "direct",
    startTime: p.startTime ?? "",
    endTime: p.endTime ?? "",
    observationContent: p.observationContent ?? "",
    aiConsultationRecord: record.aiConsultationRecord ?? "",
    aiChildCharacteristics: record.aiChildCharacteristics ?? "",
    aiParentAdvice: record.aiParentAdvice ?? "",
    aiHomePractice: record.aiHomePractice ?? "",
    parentSignature: p.parentSignature ?? "",
    staffConfirmation: p.staffConfirmation ?? "",
  };
}

export function groupParentingRecordsByMonth(records) {
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const r of records) {
    const ym = yearMonthFromIsoPs(r.conductedAt);
    if (!ym) continue;
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym).push(r);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function resolveParentingSupportChildName(form, childrenList) {
  const hit = childrenList.find((c) => String(c.id) === String(form.childId));
  return hit?.name ?? "（未選択）";
}

/** 同日に家族支援加算の記録があるか */
export function hasFamilySupportOnDate(familyRecords, childId, dateStr) {
  const d = String(dateStr ?? "").trim();
  if (!childId || !d) return false;
  return familyRecords.some((r) => {
    if (String(r.childId) !== String(childId)) return false;
    return dateStrFromIsoPs(r.conductedAt) === d;
  });
}

/** 同日に家族支援加算も算定可能（記録がまだない日） */
export function canBillFamilySupportSameDay(familyRecords, childId, dateStr) {
  return Boolean(childId && dateStr && !hasFamilySupportOnDate(familyRecords, childId, dateStr));
}

export function parseParentingSupportAiSections(text) {
  const raw = String(text ?? "").trim();
  const sections = {
    aiConsultationRecord: "",
    aiChildCharacteristics: "",
    aiParentAdvice: "",
    aiHomePractice: "",
  };
  if (!raw) return sections;

  const patterns = [
    { key: "aiConsultationRecord", re: /##\s*相談援助の記録/i },
    { key: "aiChildCharacteristics", re: /##\s*児童の特性に関する説明/i },
    { key: "aiParentAdvice", re: /##\s*保護者へのアドバイス/i },
    { key: "aiHomePractice", re: /##\s*家庭での実践ポイント/i },
  ];

  const markers = [];
  for (const { key, re } of patterns) {
    const m = raw.match(re);
    if (m?.index != null) {
      markers.push({ key, idx: m.index, len: m[0].length });
    }
  }
  markers.sort((a, b) => a.idx - b.idx);

  if (markers.length === 0) {
    sections.aiConsultationRecord = raw;
    return sections;
  }

  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].idx + markers[i].len;
    const end = i + 1 < markers.length ? markers[i + 1].idx : raw.length;
    sections[markers[i].key] = raw.slice(start, end).trim();
  }
  return sections;
}
