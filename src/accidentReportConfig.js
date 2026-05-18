/** 東京都・放課後等デイサービス向け（他自治体は fieldConfig で差し替え可能） */
export const TOKYO_MUNICIPALITY_ID = "tokyo";

export const ACCIDENT_TYPE_OPTIONS = [
  { id: "fall", label: "転倒・転落" },
  { id: "ingestion", label: "誤飲・誤食・誤薬" },
  { id: "elopement", label: "飛び出し・無断外出" },
  { id: "peer_trouble", label: "他児とのトラブル（噛みつき等）" },
  { id: "transport", label: "送迎中の事故" },
  { id: "other", label: "その他" },
];

export const MAJOR_FLAG_OPTIONS = [
  { id: "death", label: "死亡" },
  { id: "fracture", label: "骨折" },
  { id: "abuse", label: "虐待" },
];

/**
 * 自治体・様式ごとのフィールド定義（設定画面で上書き可能な構造）
 * @type {{ id: string, section: string, label: string, enabled: boolean }[]}
 */
export const TOKYO_DEFAULT_ACCIDENT_FIELDS = [
  { id: "facilityName", section: "basic", label: "事業所名", enabled: true },
  { id: "reportDate", section: "basic", label: "報告日", enabled: true },
  { id: "authorName", section: "basic", label: "作成者名", enabled: true },
  { id: "occurredAt", section: "incident", label: "発生日時", enabled: true },
  { id: "location", section: "incident", label: "発生場所", enabled: true },
  { id: "childId", section: "incident", label: "対象児童", enabled: true },
  { id: "accidentTypes", section: "incident", label: "事故種別", enabled: true },
  { id: "majorFlags", section: "incident", label: "重大事故フラグ", enabled: true },
  { id: "situation", section: "situation", label: "発生状況", enabled: true },
  { id: "discovererName", section: "situation", label: "発見者名", enabled: true },
  { id: "discoverySituation", section: "situation", label: "発見時の状況", enabled: true },
  { id: "initialResponse", section: "response", label: "初期対応内容", enabled: true },
  { id: "parentContactAt", section: "response", label: "保護者への連絡日時", enabled: true },
  { id: "medicalVisit", section: "response", label: "医療機関受診", enabled: true },
  { id: "medicalDetails", section: "response", label: "医療機関名・診断結果", enabled: true },
  { id: "aiSections", section: "ai", label: "AI生成（原因・防止・コメント）", enabled: true },
  { id: "managerSignature", section: "confirm", label: "管理者署名", enabled: true },
  { id: "confirmationDate", section: "confirm", label: "確認日", enabled: true },
];

const FIELD_CONFIG_KEY = "harucare_accident_field_config";

export function loadAccidentFieldConfig() {
  try {
    const raw = localStorage.getItem(FIELD_CONFIG_KEY);
    if (!raw) return [...TOKYO_DEFAULT_ACCIDENT_FIELDS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...TOKYO_DEFAULT_ACCIDENT_FIELDS];
    const byId = new Map(TOKYO_DEFAULT_ACCIDENT_FIELDS.map((f) => [f.id, { ...f }]));
    for (const item of parsed) {
      if (!item?.id || !byId.has(item.id)) continue;
      const base = byId.get(item.id);
      byId.set(item.id, {
        ...base,
        enabled: item.enabled !== false,
        label: String(item.label ?? base.label).trim() || base.label,
      });
    }
    return [...byId.values()];
  } catch {
    return [...TOKYO_DEFAULT_ACCIDENT_FIELDS];
  }
}

export function saveAccidentFieldConfig(fields) {
  localStorage.setItem(FIELD_CONFIG_KEY, JSON.stringify(fields));
}

export function isAccidentFieldEnabled(fieldConfig, fieldId) {
  const hit = fieldConfig.find((f) => f.id === fieldId);
  return hit ? hit.enabled !== false : true;
}

export function todayYyyyMmDdAccident() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowTimeHmAccident() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** @param {import('./lib/workspaceSettings.js').WorkspaceSettings} settings */
export function createDefaultAccidentForm(settings) {
  return {
    facilityName: settings.facilityName ?? "",
    reportDate: todayYyyyMmDdAccident(),
    authorName: settings.defaultAuthorName ?? "",
    occurredDate: todayYyyyMmDdAccident(),
    occurredTime: nowTimeHmAccident(),
    location: "",
    childId: "",
    accidentTypes: [],
    majorDeath: false,
    majorFracture: false,
    majorAbuse: false,
    situation: "",
    discovererName: "",
    discoverySituation: "",
    initialResponse: "",
    parentContactDate: "",
    parentContactTime: "",
    medicalVisit: "no",
    medicalFacilityName: "",
    diagnosisResult: "",
    causeAnalysis: "",
    preventionMeasures: "",
    managerComment: "",
    managerSignature: "",
    confirmationDate: "",
  };
}

export function buildAccidentOccurredIso(dateStr, timeStr) {
  const d = String(dateStr || todayYyyyMmDdAccident()).trim();
  const t = String(timeStr || "12:00").trim();
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map((x) => Number(x) || 0);
  return new Date(y, m - 1, day, hh, mm, 0, 0).toISOString();
}

export function buildParentContactIso(dateStr, timeStr) {
  const d = String(dateStr ?? "").trim();
  if (!d) return null;
  const t = String(timeStr ?? "12:00").trim();
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map((x) => Number(x) || 0);
  return new Date(y, m - 1, day, hh, mm, 0, 0).toISOString();
}

export function resolveAccidentChildName(form, childrenList) {
  const hit = childrenList.find((c) => String(c.id) === String(form.childId));
  return hit?.name ?? "（未選択）";
}

export function hasMajorAccidentFlag(form) {
  return Boolean(form.majorDeath || form.majorFracture || form.majorAbuse);
}

export function formatAccidentTypes(types) {
  const set = new Set(types ?? []);
  return ACCIDENT_TYPE_OPTIONS.filter((o) => set.has(o.id)).map((o) => o.label);
}

export function parseAccidentAiSections(text) {
  const raw = String(text ?? "").trim();
  const sections = {
    causeAnalysis: "",
    preventionMeasures: "",
    managerComment: "",
  };
  if (!raw) return sections;

  const headers = [
    { key: "causeAnalysis", patterns: [/##\s*事故原因の分析/i, /##\s*原因分析/i] },
    {
      key: "preventionMeasures",
      patterns: [/##\s*再発防止策/i, /##\s*防止策/i],
    },
    {
      key: "managerComment",
      patterns: [/##\s*管理者へのコメント/i, /##\s*管理者コメント/i],
    },
  ];

  const findIndex = (pattern) => {
    const m = raw.match(pattern);
    return m?.index ?? -1;
  };

  const markers = [];
  for (const h of headers) {
    for (const p of h.patterns) {
      const idx = findIndex(p);
      if (idx >= 0) {
        markers.push({ key: h.key, idx, len: raw.match(p)?.[0]?.length ?? 0 });
        break;
      }
    }
  }
  markers.sort((a, b) => a.idx - b.idx);

  if (markers.length === 0) {
    sections.causeAnalysis = raw;
    return sections;
  }

  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].idx + markers[i].len;
    const end = i + 1 < markers.length ? markers[i + 1].idx : raw.length;
    sections[markers[i].key] = raw.slice(start, end).trim();
  }
  return sections;
}

export function buildAccidentPayload(form) {
  return {
    accidentTypes: [...(form.accidentTypes ?? [])],
    majorDeath: Boolean(form.majorDeath),
    majorFracture: Boolean(form.majorFracture),
    majorAbuse: Boolean(form.majorAbuse),
    situation: String(form.situation ?? "").trim(),
    discovererName: String(form.discovererName ?? "").trim(),
    discoverySituation: String(form.discoverySituation ?? "").trim(),
    initialResponse: String(form.initialResponse ?? "").trim(),
    parentContactDate: form.parentContactDate ?? "",
    parentContactTime: form.parentContactTime ?? "",
    parentContactAt: buildParentContactIso(
      form.parentContactDate,
      form.parentContactTime,
    ),
    medicalVisit: form.medicalVisit === "yes" ? "yes" : "no",
    medicalFacilityName: String(form.medicalFacilityName ?? "").trim(),
    diagnosisResult: String(form.diagnosisResult ?? "").trim(),
    managerSignature: String(form.managerSignature ?? "").trim(),
    confirmationDate: form.confirmationDate ?? "",
  };
}

export function accidentFormFromRecord(record) {
  const p = record.payload ?? {};
  const occurred = record.occurredAt ? new Date(record.occurredAt) : new Date();
  const y = occurred.getFullYear();
  const m = String(occurred.getMonth() + 1).padStart(2, "0");
  const day = String(occurred.getDate()).padStart(2, "0");
  const hh = String(occurred.getHours()).padStart(2, "0");
  const mm = String(occurred.getMinutes()).padStart(2, "0");

  let parentContactDate = p.parentContactDate ?? "";
  let parentContactTime = p.parentContactTime ?? "";
  if (p.parentContactAt && !parentContactDate) {
    try {
      const pc = new Date(p.parentContactAt);
      parentContactDate = `${pc.getFullYear()}-${String(pc.getMonth() + 1).padStart(2, "0")}-${String(pc.getDate()).padStart(2, "0")}`;
      parentContactTime = `${String(pc.getHours()).padStart(2, "0")}:${String(pc.getMinutes()).padStart(2, "0")}`;
    } catch {
      /* ignore */
    }
  }

  return {
    facilityName: record.facilityName ?? "",
    reportDate: record.reportDate ?? todayYyyyMmDdAccident(),
    authorName: record.authorName ?? "",
    occurredDate: `${y}-${m}-${day}`,
    occurredTime: `${hh}:${mm}`,
    location: record.location ?? "",
    childId: record.childId ?? "",
    accidentTypes: p.accidentTypes ?? [],
    majorDeath: Boolean(p.majorDeath ?? record.majorDeath),
    majorFracture: Boolean(p.majorFracture ?? record.majorFracture),
    majorAbuse: Boolean(p.majorAbuse ?? record.majorAbuse),
    situation: p.situation ?? "",
    discovererName: p.discovererName ?? "",
    discoverySituation: p.discoverySituation ?? "",
    initialResponse: p.initialResponse ?? "",
    parentContactDate,
    parentContactTime,
    medicalVisit: p.medicalVisit === "yes" ? "yes" : "no",
    medicalFacilityName: p.medicalFacilityName ?? "",
    diagnosisResult: p.diagnosisResult ?? "",
    causeAnalysis: record.aiCauseAnalysis ?? "",
    preventionMeasures: record.aiPrevention ?? "",
    managerComment: record.aiManagerComment ?? "",
    managerSignature: p.managerSignature ?? "",
    confirmationDate: p.confirmationDate ?? "",
  };
}
