/** 欠席時対応加算：月4回上限・1回94単位 */
export const ABSENCE_SUPPORT_MONTHLY_LIMIT = 4;
export const ABSENCE_SUPPORT_UNITS_PER_CASE = 94;
/** 概算金額用（地域により異なる。10.91円/単位は目安） */
export const ABSENCE_UNIT_YEN_ESTIMATE = 10.91;

export const WEEKDAY_OPTIONS = [
  { id: 0, label: "日" },
  { id: 1, label: "月" },
  { id: 2, label: "火" },
  { id: 3, label: "水" },
  { id: 4, label: "木" },
  { id: 5, label: "金" },
  { id: 6, label: "土" },
];

export function todayYyyyMmDd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentYearMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function previousYearMonth(fromYm = currentYearMonth()) {
  const [y, m] = fromYm.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

export function yearMonthFromDateStr(dateStr) {
  const d = String(dateStr ?? "").trim();
  return d.length >= 7 ? d.slice(0, 7) : "";
}

export function formatYearMonthLabel(yearMonth) {
  const [y, m] = yearMonth.split("-");
  return `${y}年${Number(m)}月`;
}

export function weekdayLabel(dayOfWeek) {
  return WEEKDAY_OPTIONS.find((o) => o.id === dayOfWeek)?.label ?? "";
}

export function createDefaultAbsenceForm() {
  return {
    childId: "",
    absenceDate: todayYyyyMmDd(),
    reason: "",
    staffName: "",
  };
}

export function createDefaultScheduleForm() {
  return {
    childId: "",
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "11:30",
    notes: "",
  };
}

/** 算定対象として登録済みの欠席（連絡前も含む）を月上限カウント */
export function countBillableAbsencesInMonth(records, childId, yearMonth) {
  if (!childId || !yearMonth) return 0;
  return records.filter((r) => {
    if (String(r.childId) !== String(childId)) return false;
    if (yearMonthFromDateStr(r.absenceDate) !== yearMonth) return false;
    return r.billable;
  }).length;
}

/** 連絡済み・算定対象のみ（月次サマリー用） */
export function countSettledBillableInMonth(records, childId, yearMonth) {
  if (!childId || !yearMonth) return 0;
  return records.filter((r) => {
    if (String(r.childId) !== String(childId)) return false;
    if (yearMonthFromDateStr(r.absenceDate) !== yearMonth) return false;
    return r.billable && r.contactedAt;
  }).length;
}

export function remainingAbsenceBillableSlots(usedCount) {
  return Math.max(0, ABSENCE_SUPPORT_MONTHLY_LIMIT - usedCount);
}

/** 新規欠席の算定可否を判定 */
export function resolveBillableForNewAbsence(records, childId, absenceDate) {
  const ym = yearMonthFromDateStr(absenceDate);
  const used = countBillableAbsencesInMonth(records, childId, ym);
  if (used >= ABSENCE_SUPPORT_MONTHLY_LIMIT) {
    return {
      billable: false,
      billableNote: `月上限（${ABSENCE_SUPPORT_MONTHLY_LIMIT}回）に達しています`,
    };
  }
  return { billable: true, billableNote: "" };
}

export function estimateAbsenceAmountYen(billableCount) {
  const units = billableCount * ABSENCE_SUPPORT_UNITS_PER_CASE;
  const yen = Math.round(units * ABSENCE_UNIT_YEN_ESTIMATE);
  return { units, yen };
}

/** 前月分の加算サマリー（連絡済み・算定対象のみ） */
export function buildPreviousMonthSummary(records, childrenList, targetYm) {
  const monthRecords = records.filter(
    (r) =>
      yearMonthFromDateStr(r.absenceDate) === targetYm &&
      r.billable &&
      r.contactedAt,
  );

  /** @type {Map<string, { childId: string, childName: string, count: number }>} */
  const byChild = new Map();
  for (const r of monthRecords) {
    const key = String(r.childId || r.childName);
    if (!byChild.has(key)) {
      byChild.set(key, {
        childId: r.childId,
        childName: r.childName || "（不明）",
        count: 0,
      });
    }
    byChild.get(key).count += 1;
  }

  const perChild = [...byChild.values()].sort((a, b) =>
    a.childName.localeCompare(b.childName, "ja"),
  );
  const totalCount = monthRecords.length;
  const { units, yen } = estimateAbsenceAmountYen(totalCount);

  return {
    yearMonth: targetYm,
    totalCount,
    totalUnits: units,
    estimatedYen: yen,
    perChild,
    unlinkedChildren: childrenList.length - perChild.length,
  };
}

export function absencesForDate(records, dateStr) {
  return records.filter((r) => r.absenceDate === dateStr);
}

export function schedulesForWeekday(schedules, dayOfWeek) {
  return schedules.filter((s) => s.dayOfWeek === dayOfWeek);
}

export function scheduledChildrenOnDate(schedules, dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const wd = d.getDay();
  return schedulesForWeekday(schedules, wd);
}

export function matchChildByName(nameHint, childrenList) {
  const hint = String(nameHint ?? "").trim();
  if (!hint) return null;
  const exact = childrenList.find((c) => c.name === hint);
  if (exact) return exact;
  const partial = childrenList.find(
    (c) => c.name.includes(hint) || hint.includes(c.name),
  );
  return partial ?? null;
}

export function sortAbsencesDesc(records) {
  return [...records].sort((a, b) => {
    const dc = String(b.absenceDate).localeCompare(String(a.absenceDate));
    if (dc !== 0) return dc;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

export function formatJaDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y) return dateStr;
  const wd = new Date(y, m - 1, d).getDay();
  return `${y}年${m}月${d}日（${weekdayLabel(wd)}）`;
}
