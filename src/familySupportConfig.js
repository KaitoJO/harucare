export const FAMILY_SUPPORT_MONTHLY_LIMIT = 4;

export const FAMILY_SUPPORT_TYPE_OPTIONS = [
  { id: "home_visit", label: "居宅訪問・個別" },
  { id: "facility_face", label: "事業所・対面・個別" },
  { id: "online", label: "オンライン・個別" },
  { id: "group", label: "グループ（ペアレントトレーニング等）" },
];

export function todayYyyyMmDdFs() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowTimeHmFs() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function createDefaultFamilySupportForm() {
  return {
    childId: "",
    conductedDate: todayYyyyMmDdFs(),
    conductedTime: nowTimeHmFs(),
    staffName: "",
    supportType: "home_visit",
    participantName: "",
    participantRelation: "",
    startTime: "",
    endTime: "",
    consultationContent: "",
    aiRecordText: "",
    aiNextSuggestion: "",
    parentSignature: "",
    staffConfirmation: "",
  };
}

export function supportTypeLabel(typeId) {
  return (
    FAMILY_SUPPORT_TYPE_OPTIONS.find((o) => o.id === typeId)?.label ?? typeId
  );
}

/** @param {string} start "HH:mm" @param {string} end "HH:mm" */
export function calcDurationMinutes(start, end) {
  const s = String(start ?? "").trim();
  const e = String(end ?? "").trim();
  if (!s || !e) return null;
  const [sh, sm] = s.split(":").map((x) => Number(x) || 0);
  const [eh, em] = e.split(":").map((x) => Number(x) || 0);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function isBillableDuration(minutes) {
  return typeof minutes === "number" && minutes >= 30;
}

export function buildConductedIso(dateStr, timeStr) {
  const d = String(dateStr || todayYyyyMmDdFs()).trim();
  const t = String(timeStr || "12:00").trim();
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map((x) => Number(x) || 0);
  return new Date(y, m - 1, day, hh, mm, 0, 0).toISOString();
}

export function yearMonthFromIso(iso) {
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

export function yearMonthFromDateStr(dateStr) {
  const d = String(dateStr ?? "").trim();
  return d.length >= 7 ? d.slice(0, 7) : yearMonthFromIso(new Date().toISOString());
}

/** 算定可能（30分以上）の記録のみ月上限にカウント */
export function countBillableInMonth(records, childId, yearMonth) {
  if (!childId || !yearMonth) return 0;
  return records.filter((r) => {
    if (String(r.childId) !== String(childId)) return false;
    const ym = yearMonthFromIso(r.conductedAt);
    if (ym !== yearMonth) return false;
    return r.billable !== false && (r.durationMinutes ?? 0) >= 30;
  }).length;
}

export function remainingMonthlySlots(usedCount) {
  return Math.max(0, FAMILY_SUPPORT_MONTHLY_LIMIT - usedCount);
}

export function buildFamilySupportPayload(form) {
  const durationMinutes = calcDurationMinutes(form.startTime, form.endTime);
  return {
    conductedDate: form.conductedDate ?? "",
    conductedTime: form.conductedTime ?? "",
    participantName: String(form.participantName ?? "").trim(),
    participantRelation: String(form.participantRelation ?? "").trim(),
    startTime: form.startTime ?? "",
    endTime: form.endTime ?? "",
    consultationContent: String(form.consultationContent ?? "").trim(),
    parentSignature: String(form.parentSignature ?? "").trim(),
    staffConfirmation: String(form.staffConfirmation ?? "").trim(),
    durationMinutes,
  };
}

export function familySupportFormFromRecord(record) {
  const p = record.payload ?? {};
  const conducted = record.conductedAt
    ? new Date(record.conductedAt)
    : new Date();
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
    supportType: record.supportType ?? "home_visit",
    participantName: p.participantName ?? "",
    participantRelation: p.participantRelation ?? "",
    startTime: p.startTime ?? "",
    endTime: p.endTime ?? "",
    consultationContent: p.consultationContent ?? "",
    aiRecordText: record.aiRecordText ?? "",
    aiNextSuggestion: record.aiNextSuggestion ?? "",
    parentSignature: p.parentSignature ?? "",
    staffConfirmation: p.staffConfirmation ?? "",
  };
}

export function groupRecordsByMonth(records) {
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const r of records) {
    const ym = yearMonthFromIso(r.conductedAt);
    if (!ym) continue;
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym).push(r);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function resolveFamilySupportChildName(form, childrenList) {
  const hit = childrenList.find((c) => String(c.id) === String(form.childId));
  return hit?.name ?? "（未選択）";
}

export function parseFamilySupportAiSections(text) {
  const raw = String(text ?? "").trim();
  const sections = { aiRecordText: "", aiNextSuggestion: "" };
  if (!raw) return sections;

  const markers = [];
  const patterns = [
    { key: "aiRecordText", re: /##\s*相談援助の記録/i },
    { key: "aiNextSuggestion", re: /##\s*次回の支援提案/i },
  ];
  for (const { key, re } of patterns) {
    const m = raw.match(re);
    if (m?.index != null) {
      markers.push({ key, idx: m.index, len: m[0].length });
    }
  }
  markers.sort((a, b) => a.idx - b.idx);
  if (markers.length === 0) {
    sections.aiRecordText = raw;
    return sections;
  }
  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].idx + markers[i].len;
    const end = i + 1 < markers.length ? markers[i + 1].idx : raw.length;
    sections[markers[i].key] = raw.slice(start, end).trim();
  }
  return sections;
}
