/** シフト種別（拡張時はここに追加） */
export const SHIFT_TYPE_OPTIONS = [
  {
    id: "work",
    label: "通常勤務",
    hasTime: true,
    defaultStart: "09:00",
    defaultEnd: "18:00",
    countsAsWork: true,
  },
  {
    id: "early",
    label: "早番",
    hasTime: true,
    defaultStart: "07:00",
    defaultEnd: "15:00",
    countsAsWork: true,
  },
  {
    id: "late",
    label: "遅番",
    hasTime: true,
    defaultStart: "11:00",
    defaultEnd: "19:00",
    countsAsWork: true,
  },
  {
    id: "off",
    label: "休み",
    hasTime: false,
    countsAsWork: false,
  },
  {
    id: "paid_leave",
    label: "有給",
    hasTime: false,
    countsAsWork: false,
  },
];

export const STAFF_COLOR_PALETTE = [
  "#2d5a3d",
  "#4a7c9e",
  "#8e6b4a",
  "#7a5a8a",
  "#c45c5c",
  "#d4a017",
  "#5a8a7a",
  "#6a5a4a",
];

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function currentYearMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function shiftTypeOption(typeId) {
  return SHIFT_TYPE_OPTIONS.find((o) => o.id === typeId) ?? SHIFT_TYPE_OPTIONS[0];
}

export function shiftTypeLabel(typeId) {
  return shiftTypeOption(typeId).label;
}

export function shiftTypeHasTime(typeId) {
  return shiftTypeOption(typeId).hasTime;
}

export function createDefaultShiftEntryForm(dateStr) {
  const opt = SHIFT_TYPE_OPTIONS[0];
  return {
    staffId: "",
    shiftDate: dateStr ?? "",
    shiftType: opt.id,
    startTime: opt.defaultStart ?? "",
    endTime: opt.defaultEnd ?? "",
    notes: "",
  };
}

export function defaultTimesForShiftType(typeId) {
  const opt = shiftTypeOption(typeId);
  return {
    startTime: opt.defaultStart ?? "",
    endTime: opt.defaultEnd ?? "",
  };
}

export function calcShiftMinutes(start, end) {
  const s = String(start ?? "").trim();
  const e = String(end ?? "").trim();
  if (!s || !e) return 0;
  const [sh, sm] = s.split(":").map((x) => Number(x) || 0);
  const [eh, em] = e.split(":").map((x) => Number(x) || 0);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function formatMinutesAsHours(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export function addMonths(yearMonth, delta) {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

/** @returns {{ date: string, day: number, inMonth: boolean, weekday: number }[]} */
export function buildMonthCalendarCells(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const startPad = first.getDay();
  const cells = [];

  for (let i = 0; i < startPad; i += 1) {
    const d = new Date(y, m - 1, -startPad + i + 1);
    cells.push({
      date: formatDateYmd(d),
      day: d.getDate(),
      inMonth: false,
      weekday: d.getDay(),
    });
  }
  for (let day = 1; day <= lastDay; day += 1) {
    const d = new Date(y, m - 1, day);
    cells.push({
      date: formatDateYmd(d),
      day,
      inMonth: true,
      weekday: d.getDay(),
    });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const d = new Date(last.date);
    d.setDate(d.getDate() + 1);
    cells.push({
      date: formatDateYmd(d),
      day: d.getDate(),
      inMonth: false,
      weekday: d.getDay(),
    });
  }
  return cells;
}

function formatDateYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatYearMonthLabel(yearMonth) {
  const [y, m] = yearMonth.split("-");
  return `${y}年${Number(m)}月`;
}

export { WEEKDAY_LABELS };

/** @param {object[]} entries @param {string} yearMonth */
export function filterEntriesByMonth(entries, yearMonth) {
  return entries.filter((e) => String(e.shiftDate).startsWith(yearMonth));
}

/** @param {object[]} entries @param {object[]} staffList @param {string} yearMonth */
export function aggregateShiftMonth(entries, staffList, yearMonth) {
  const monthEntries = filterEntriesByMonth(entries, yearMonth);
  return staffList.map((staff) => {
    const mine = monthEntries.filter((e) => String(e.staffId) === String(staff.id));
    let workDays = 0;
    let totalMinutes = 0;
    for (const e of mine) {
      const opt = shiftTypeOption(e.shiftType);
      if (opt.countsAsWork) {
        workDays += 1;
        totalMinutes += calcShiftMinutes(e.startTime, e.endTime);
      }
    }
    return {
      staffId: staff.id,
      staffName: staff.name,
      color: staff.color,
      workDays,
      totalMinutes,
      totalHoursLabel: formatMinutesAsHours(totalMinutes),
    };
  });
}

export function entriesForDate(entries, dateStr) {
  return entries.filter((e) => e.shiftDate === dateStr);
}

export function pickStaffColor(existingStaff) {
  const used = new Set(existingStaff.map((s) => s.color));
  const free = STAFF_COLOR_PALETTE.find((c) => !used.has(c));
  return free ?? STAFF_COLOR_PALETTE[existingStaff.length % STAFF_COLOR_PALETTE.length];
}
