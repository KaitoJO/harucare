export function createDefaultCaseExampleForm() {
  return {
    childMode: "select",
    childId: "",
    childNameCustom: "",
    disability: "自閉スペクトラム症",
    age: "4歳",
    supportScene: "",
    challenges: "",
    aiSummary: "",
    aiEffectiveMethods: "",
    aiStaffAdvice: "",
    aiHandover: "",
  };
}

export function resolveCaseChildLabel(form, childrenList) {
  if (form.childMode === "custom") {
    return String(form.childNameCustom ?? "").trim() || "（直接入力・未記入）";
  }
  const hit = childrenList.find((c) => String(c.id) === String(form.childId));
  return hit?.name ?? "（未選択）";
}

export function parseCaseAiSections(text) {
  const raw = String(text ?? "").trim();
  const sections = {
    aiSummary: "",
    aiEffectiveMethods: "",
    aiStaffAdvice: "",
    aiHandover: "",
  };
  if (!raw) return sections;

  const patterns = [
    { key: "aiSummary", re: /##\s*支援事例のまとめ/i },
    { key: "aiEffectiveMethods", re: /##\s*有効だった支援方法/i },
    { key: "aiStaffAdvice", re: /##\s*他職員へのアドバイス/i },
    { key: "aiHandover", re: /##\s*次回への引き継ぎ事項/i },
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
    sections.aiSummary = raw;
    return sections;
  }
  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].idx + markers[i].len;
    const end = i + 1 < markers.length ? markers[i + 1].idx : raw.length;
    sections[markers[i].key] = raw.slice(start, end).trim();
  }
  return sections;
}

export function caseExampleFormFromRecord(record) {
  return {
    childMode: record.childMode ?? (record.childId ? "select" : "custom"),
    childId: record.childId ?? "",
    childNameCustom:
      record.childMode === "custom" ? record.childName ?? "" : "",
    disability: record.disability ?? "",
    age: record.age ?? "",
    supportScene: record.supportScene ?? "",
    challenges: record.challenges ?? "",
    aiSummary: record.aiSummary ?? "",
    aiEffectiveMethods: record.aiEffectiveMethods ?? "",
    aiStaffAdvice: record.aiStaffAdvice ?? "",
    aiHandover: record.aiHandover ?? "",
  };
}

/** @param {object[]} records @param {{ disability: string, sceneQuery: string }} filters */
export function filterCaseExamples(records, filters) {
  const disability = filters?.disability ?? "all";
  const sceneQuery = String(filters?.sceneQuery ?? "")
    .trim()
    .toLowerCase();
  return records.filter((r) => {
    if (disability !== "all" && r.disability !== disability) return false;
    if (sceneQuery) {
      const hay = `${r.supportScene} ${r.challenges}`.toLowerCase();
      if (!hay.includes(sceneQuery)) return false;
    }
    return true;
  });
}
