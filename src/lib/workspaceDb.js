function childFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    age: r.age ?? "4歳",
    disability: r.disability ?? "自閉スペクトラム症",
    severity: r.severity ?? "中度",
    motorLevel: r.motor_level ?? "中",
    communicationLevel: r.communication_level ?? "低",
    socialLevel: r.social_level ?? "低",
    birthDate: r.birth_date != null ? String(r.birth_date) : "",
    familyLifeIntentions:
      r.family_life_intentions != null ? String(r.family_life_intentions) : "",
    standardSupportProvision:
      r.standard_support_provision != null
        ? String(r.standard_support_provision)
        : "",
    managerName: r.manager_name != null ? String(r.manager_name) : "",
    currentIssues: r.current_issues ?? "",
    goals: r.goals ?? "",
    notes: r.notes ?? "",
    createdAt: r.created_at
      ? new Date(r.created_at).toLocaleDateString("ja-JP")
      : "",
    programs: [],
  };
}

function savedProgramFromRow(r) {
  return {
    id: r.id,
    childName: r.child_name,
    childId: r.child_id ?? null,
    createdAt: r.created_at,
    createdAtLabel: r.created_at_label ?? "",
    programText: r.program_text,
    title:
      r.title != null && String(r.title).trim()
        ? String(r.title).trim()
        : undefined,
    mappedPlan: r.mapped_plan ?? undefined,
  };
}

function supportRecordFromRow(r) {
  return {
    id: r.id,
    childName: r.child_name,
    childId: r.child_id ?? null,
    date: r.date,
    createdAt: r.created_at,
    mood: r.mood ?? "",
    success: r.success ?? "",
    challenges: r.challenges ?? "",
    handover: r.handover ?? "",
    title:
      r.title != null && String(r.title).trim()
        ? String(r.title).trim()
        : undefined,
  };
}

function isoDateFromDbTimestamp(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function diaryFromRow(r) {
  const dateRaw = r.entry_date != null ? String(r.entry_date).trim() : "";
  return {
    id: r.id,
    childName: r.child_name,
    childId: r.child_id ?? null,
    date: dateRaw || isoDateFromDbTimestamp(r.created_at),
    createdAt: r.created_at,
    createdAtLabel: r.created_at_label ?? "",
    programText: r.program_text,
    sourceInputs: r.source_inputs ?? undefined,
    title:
      r.title != null && String(r.title).trim()
        ? String(r.title).trim()
        : undefined,
  };
}

function contactFromRow(r) {
  return diaryFromRow(r);
}

function planFeedbackFromRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    programText: r.program_text,
    rating: r.rating,
    createdAt: r.created_at,
  };
}

function hiyariHattoFromRow(r) {
  return {
    id: r.id,
    childId: r.child_id ?? null,
    childName: r.child_name ?? "",
    occurredAt: r.occurred_at,
    location: r.location ?? "",
    situation: r.situation ?? "",
    analysisText: r.analysis_text ?? "",
    createdAt: r.created_at,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function fetchWorkspace(supabase, userId) {
  const [
    { data: chRows, error: e1 },
    { data: spRows, error: e2 },
    { data: srRows, error: e3 },
    { data: sdRows, error: e4 },
    { data: pcRows, error: e5 },
    { data: pfRows, error: e6 },
    { data: hhRows, error: e7 },
  ] = await Promise.all([
    supabase
      .from("children")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("saved_programs").select("*").eq("user_id", userId),
    supabase.from("support_records").select("*").eq("user_id", userId),
    supabase.from("saved_support_diaries").select("*").eq("user_id", userId),
    supabase.from("saved_parent_contacts").select("*").eq("user_id", userId),
    supabase.from("plan_feedbacks").select("*").eq("user_id", userId),
    supabase
      .from("hiyari_hatto_records")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
  ]);
  const err = e1 || e2 || e3 || e4 || e5 || e6 || e7;
  if (err) throw err;
  return {
    children: (chRows ?? []).map(childFromRow),
    savedPrograms: (spRows ?? []).map(savedProgramFromRow),
    supportRecords: (srRows ?? []).map(supportRecordFromRow),
    savedSupportDiaries: (sdRows ?? []).map(diaryFromRow),
    savedParentContacts: (pcRows ?? []).map(contactFromRow),
    planFeedbacks: (pfRows ?? []).map(planFeedbackFromRow),
    hiyariHattoRecords: (hhRows ?? []).map(hiyariHattoFromRow),
  };
}

export async function insertChild(supabase, userId, form) {
  const row = {
    user_id: userId,
    name: form.name.trim(),
    age: form.age,
    disability: form.disability,
    severity: form.severity,
    motor_level: form.motorLevel,
    communication_level: form.communicationLevel,
    social_level: form.socialLevel,
    birth_date: form.birthDate?.trim() || "",
    family_life_intentions: form.familyLifeIntentions?.trim() || "",
    standard_support_provision: form.standardSupportProvision?.trim() || "",
    manager_name: form.managerName?.trim() || "",
    current_issues: form.currentIssues ?? "",
    goals: form.goals ?? "",
    notes: form.notes ?? "",
  };
  const { data, error } = await supabase
    .from("children")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return childFromRow(data);
}

export async function updateChild(supabase, userId, childId, form) {
  const row = {
    name: form.name.trim(),
    age: form.age,
    disability: form.disability,
    severity: form.severity,
    motor_level: form.motorLevel,
    communication_level: form.communicationLevel,
    social_level: form.socialLevel,
    birth_date: form.birthDate?.trim() || "",
    family_life_intentions: form.familyLifeIntentions?.trim() || "",
    standard_support_provision: form.standardSupportProvision?.trim() || "",
    manager_name: form.managerName?.trim() || "",
    current_issues: form.currentIssues ?? "",
    goals: form.goals ?? "",
    notes: form.notes ?? "",
  };
  const { error } = await supabase
    .from("children")
    .update(row)
    .eq("id", childId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function syncChildNameAcrossWorkspace(supabase, userId, childId, newName) {
  const cid = childId;
  const tasks = [
    supabase
      .from("saved_programs")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("support_records")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("saved_support_diaries")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("saved_parent_contacts")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
  ];
  const results = await Promise.all(tasks);
  const err = results.find((r) => r.error)?.error;
  if (err) throw err;
}

export async function deleteChild(supabase, userId, childId) {
  const cid = String(childId);
  const { error: e0 } = await supabase
    .from("plan_feedbacks")
    .delete()
    .eq("user_id", userId)
    .eq("child_id", cid);
  if (e0) throw e0;
  const { error } = await supabase
    .from("children")
    .delete()
    .eq("id", childId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertSavedProgram(supabase, userId, entry) {
  const { error } = await supabase.from("saved_programs").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName,
    created_at: entry.createdAt,
    created_at_label: entry.createdAtLabel,
    program_text: entry.programText,
    title: entry.title ?? null,
    mapped_plan: entry.mappedPlan ?? null,
  });
  if (error) throw error;
}

export async function insertSupportRecord(supabase, userId, entry) {
  const { error } = await supabase.from("support_records").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName,
    date: entry.date,
    created_at: entry.createdAt,
    mood: entry.mood,
    success: entry.success,
    challenges: entry.challenges,
    handover: entry.handover,
  });
  if (error) throw error;
}

export async function insertSavedSupportDiary(supabase, userId, entry) {
  const { error } = await supabase.from("saved_support_diaries").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName,
    entry_date: entry.date ?? null,
    created_at: entry.createdAt,
    created_at_label: entry.createdAtLabel,
    program_text: entry.programText,
    source_inputs: entry.sourceInputs ?? null,
  });
  if (error) throw error;
}

export async function insertSavedParentContact(supabase, userId, entry) {
  const { error } = await supabase.from("saved_parent_contacts").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName,
    created_at: entry.createdAt,
    created_at_label: entry.createdAtLabel,
    program_text: entry.programText,
    source_inputs: entry.sourceInputs ?? null,
  });
  if (error) throw error;
}

export async function insertPlanFeedback(supabase, userId, entry) {
  const { error } = await supabase.from("plan_feedbacks").insert({
    id: entry.id,
    user_id: userId,
    child_id: String(entry.childId),
    program_text: entry.programText,
    rating: entry.rating,
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function insertHiyariHattoRecord(supabase, userId, entry) {
  const { error } = await supabase.from("hiyari_hatto_records").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName ?? "",
    occurred_at: entry.occurredAt,
    location: entry.location ?? "",
    situation: entry.situation ?? "",
    analysis_text: entry.analysisText ?? "",
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function insertProgramEditFeedback(supabase, userId, entry) {
  const { error } = await supabase.from("program_edit_feedback").insert({
    user_id: userId,
    original: entry.original,
    edited: entry.edited,
    child_name: entry.childName,
    created_at: entry.date,
  });
  if (error) throw error;
}
