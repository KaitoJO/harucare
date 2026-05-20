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

function savedSpecializedPlanFromRow(r) {
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

function shiftStaffFromRow(r) {
  return {
    id: r.id,
    name: r.name ?? "",
    color: r.color ?? "#2d5a3d",
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at,
  };
}

function shiftEntryFromRow(r) {
  const shiftDate = r.shift_date ? String(r.shift_date).slice(0, 10) : "";
  return {
    id: r.id,
    staffId: r.staff_id,
    shiftDate,
    shiftType: r.shift_type ?? "work",
    startTime: r.start_time ?? "",
    endTime: r.end_time ?? "",
    notes: r.notes ?? "",
    createdAt: r.created_at,
  };
}

function therapyCaseExampleFromRow(r) {
  return {
    id: r.id,
    childId: r.child_id ?? null,
    childName: r.child_name ?? "",
    childMode: r.child_mode ?? "select",
    disability: r.disability ?? "",
    age: r.age ?? "",
    supportScene: r.support_scene ?? "",
    challenges: r.challenges ?? "",
    aiSummary: r.ai_summary ?? "",
    aiEffectiveMethods: r.ai_effective_methods ?? "",
    aiStaffAdvice: r.ai_staff_advice ?? "",
    aiHandover: r.ai_handover ?? "",
    authorName: r.author_name ?? "",
    createdAt: r.created_at,
  };
}

function familySupportFromRow(r) {
  return {
    id: r.id,
    childId: r.child_id ?? null,
    childName: r.child_name ?? "",
    conductedAt: r.conducted_at,
    staffName: r.staff_name ?? "",
    supportType: r.support_type ?? "home_visit",
    durationMinutes: r.duration_minutes ?? 0,
    billable: Boolean(r.billable),
    payload: r.payload ?? {},
    aiRecordText: r.ai_record_text ?? "",
    aiNextSuggestion: r.ai_next_suggestion ?? "",
    createdAt: r.created_at,
  };
}

function parentingSupportFromRow(r) {
  return {
    id: r.id,
    childId: r.child_id ?? null,
    childName: r.child_name ?? "",
    conductedAt: r.conducted_at,
    staffName: r.staff_name ?? "",
    durationMinutes: r.duration_minutes ?? 0,
    billable: Boolean(r.billable),
    payload: r.payload ?? {},
    aiConsultationRecord: r.ai_consultation_record ?? "",
    aiChildCharacteristics: r.ai_child_characteristics ?? "",
    aiParentAdvice: r.ai_parent_advice ?? "",
    aiHomePractice: r.ai_home_practice ?? "",
    createdAt: r.created_at,
  };
}

function absenceRecordFromRow(r) {
  const absenceDate = r.absence_date
    ? String(r.absence_date).slice(0, 10)
    : "";
  return {
    id: r.id,
    childId: r.child_id ?? null,
    childName: r.child_name ?? "",
    absenceDate,
    reason: r.reason ?? "",
    source: r.source ?? "staff",
    lineUserId: r.line_user_id ?? "",
    lineMessage: r.line_message ?? "",
    aiParsed: r.ai_parsed ?? {},
    contactedAt: r.contacted_at ?? null,
    contactedBy: r.contacted_by ?? "",
    billable: Boolean(r.billable),
    billableNote: r.billable_note ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function childServiceScheduleFromRow(r) {
  return {
    id: r.id,
    childId: r.child_id,
    childName: r.child_name ?? "",
    dayOfWeek: r.day_of_week ?? 0,
    startTime: r.start_time ?? "",
    endTime: r.end_time ?? "",
    notes: r.notes ?? "",
    createdAt: r.created_at,
  };
}

function lineGuardianLinkFromRow(r) {
  return {
    id: r.id,
    lineUserId: r.line_user_id ?? "",
    childId: r.child_id,
    childName: r.child_name ?? "",
    guardianLabel: r.guardian_label ?? "",
    createdAt: r.created_at,
  };
}

function accidentReportFromRow(r) {
  const reportDate = r.report_date
    ? String(r.report_date).slice(0, 10)
    : "";
  return {
    id: r.id,
    childId: r.child_id ?? null,
    childName: r.child_name ?? "",
    occurredAt: r.occurred_at,
    reportDate,
    facilityName: r.facility_name ?? "",
    authorName: r.author_name ?? "",
    location: r.location ?? "",
    payload: r.payload ?? {},
    majorDeath: Boolean(r.major_death),
    majorFracture: Boolean(r.major_fracture),
    majorAbuse: Boolean(r.major_abuse),
    aiCauseAnalysis: r.ai_cause_analysis ?? "",
    aiPrevention: r.ai_prevention ?? "",
    aiManagerComment: r.ai_manager_comment ?? "",
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
    { data: arRows, error: e8 },
    { data: fsRows, error: e9 },
    { data: ssRows, error: e10 },
    { data: seRows, error: e11 },
    { data: tcRows, error: e12 },
    { data: sspRows, error: e13 },
    { data: psRows, error: e14 },
    { data: abRows, error: e15 },
    { data: csRows, error: e16 },
    { data: lgRows, error: e17 },
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
    supabase
      .from("accident_reports")
      .select("*")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("family_support_records")
      .select("*")
      .eq("user_id", userId)
      .order("conducted_at", { ascending: false }),
    supabase
      .from("shift_staff")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("shift_entries")
      .select("*")
      .eq("user_id", userId)
      .order("shift_date", { ascending: true }),
    supabase
      .from("therapy_case_examples")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_specialized_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("parenting_support_records")
      .select("*")
      .eq("user_id", userId)
      .order("conducted_at", { ascending: false }),
    supabase
      .from("absence_records")
      .select("*")
      .eq("user_id", userId)
      .order("absence_date", { ascending: false }),
    supabase
      .from("child_service_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("line_guardian_links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  const err =
    e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e14 || e15 || e16 || e17;
  if (err) throw err;
  return {
    children: (chRows ?? []).map(childFromRow),
    savedPrograms: (spRows ?? []).map(savedProgramFromRow),
    supportRecords: (srRows ?? []).map(supportRecordFromRow),
    savedSupportDiaries: (sdRows ?? []).map(diaryFromRow),
    savedParentContacts: (pcRows ?? []).map(contactFromRow),
    planFeedbacks: (pfRows ?? []).map(planFeedbackFromRow),
    hiyariHattoRecords: (hhRows ?? []).map(hiyariHattoFromRow),
    accidentReports: (arRows ?? []).map(accidentReportFromRow),
    familySupportRecords: (fsRows ?? []).map(familySupportFromRow),
    shiftStaff: (ssRows ?? []).map(shiftStaffFromRow),
    shiftEntries: (seRows ?? []).map(shiftEntryFromRow),
    therapyCaseExamples: (tcRows ?? []).map(therapyCaseExampleFromRow),
    savedSpecializedPlans: (sspRows ?? []).map(savedSpecializedPlanFromRow),
    parentingSupportRecords: (psRows ?? []).map(parentingSupportFromRow),
    absenceRecords: (abRows ?? []).map(absenceRecordFromRow),
    childServiceSchedules: (csRows ?? []).map(childServiceScheduleFromRow),
    lineGuardianLinks: (lgRows ?? []).map(lineGuardianLinkFromRow),
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
    supabase
      .from("saved_specialized_plans")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("parenting_support_records")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("absence_records")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("child_service_schedules")
      .update({ child_name: newName })
      .eq("user_id", userId)
      .eq("child_id", cid),
    supabase
      .from("line_guardian_links")
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

export async function insertSavedSpecializedPlan(supabase, userId, entry) {
  const { error } = await supabase.from("saved_specialized_plans").insert({
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

export async function insertFamilySupportRecord(supabase, userId, entry) {
  const { error } = await supabase.from("family_support_records").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName ?? "",
    conducted_at: entry.conductedAt,
    staff_name: entry.staffName ?? "",
    support_type: entry.supportType ?? "home_visit",
    duration_minutes: entry.durationMinutes ?? 0,
    billable: Boolean(entry.billable),
    payload: entry.payload ?? {},
    ai_record_text: entry.aiRecordText ?? "",
    ai_next_suggestion: entry.aiNextSuggestion ?? "",
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function insertParentingSupportRecord(supabase, userId, entry) {
  const { error } = await supabase.from("parenting_support_records").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName ?? "",
    conducted_at: entry.conductedAt,
    staff_name: entry.staffName ?? "",
    duration_minutes: entry.durationMinutes ?? 0,
    billable: Boolean(entry.billable),
    payload: entry.payload ?? {},
    ai_consultation_record: entry.aiConsultationRecord ?? "",
    ai_child_characteristics: entry.aiChildCharacteristics ?? "",
    ai_parent_advice: entry.aiParentAdvice ?? "",
    ai_home_practice: entry.aiHomePractice ?? "",
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function insertAccidentReport(supabase, userId, entry) {
  const { error } = await supabase.from("accident_reports").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName ?? "",
    occurred_at: entry.occurredAt,
    report_date: entry.reportDate,
    facility_name: entry.facilityName ?? "",
    author_name: entry.authorName ?? "",
    location: entry.location ?? "",
    payload: entry.payload ?? {},
    major_death: Boolean(entry.majorDeath),
    major_fracture: Boolean(entry.majorFracture),
    major_abuse: Boolean(entry.majorAbuse),
    ai_cause_analysis: entry.aiCauseAnalysis ?? "",
    ai_prevention: entry.aiPrevention ?? "",
    ai_manager_comment: entry.aiManagerComment ?? "",
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function insertShiftStaff(supabase, userId, staff) {
  const { data, error } = await supabase
    .from("shift_staff")
    .insert({
      user_id: userId,
      name: staff.name.trim(),
      color: staff.color ?? "#2d5a3d",
      sort_order: staff.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return shiftStaffFromRow(data);
}

export async function updateShiftStaff(supabase, userId, staffId, patch) {
  const row = {};
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.color != null) row.color = patch.color;
  if (patch.sortOrder != null) row.sort_order = patch.sortOrder;
  const { error } = await supabase
    .from("shift_staff")
    .update(row)
    .eq("id", staffId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteShiftStaff(supabase, userId, staffId) {
  const { error } = await supabase
    .from("shift_staff")
    .delete()
    .eq("id", staffId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertShiftEntry(supabase, userId, entry) {
  const { error } = await supabase.from("shift_entries").insert({
    id: entry.id,
    user_id: userId,
    staff_id: entry.staffId,
    shift_date: entry.shiftDate,
    shift_type: entry.shiftType ?? "work",
    start_time: entry.startTime ?? "",
    end_time: entry.endTime ?? "",
    notes: entry.notes ?? "",
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

export async function updateShiftEntry(supabase, userId, entryId, patch) {
  const row = {};
  if (patch.staffId != null) row.staff_id = patch.staffId;
  if (patch.shiftDate != null) row.shift_date = patch.shiftDate;
  if (patch.shiftType != null) row.shift_type = patch.shiftType;
  if (patch.startTime != null) row.start_time = patch.startTime;
  if (patch.endTime != null) row.end_time = patch.endTime;
  if (patch.notes != null) row.notes = patch.notes;
  const { error } = await supabase
    .from("shift_entries")
    .update(row)
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteShiftEntry(supabase, userId, entryId) {
  const { error } = await supabase
    .from("shift_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertTherapyCaseExample(supabase, userId, entry) {
  const { error } = await supabase.from("therapy_case_examples").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName ?? "",
    child_mode: entry.childMode ?? "select",
    disability: entry.disability ?? "",
    age: entry.age ?? "",
    support_scene: entry.supportScene ?? "",
    challenges: entry.challenges ?? "",
    ai_summary: entry.aiSummary ?? "",
    ai_effective_methods: entry.aiEffectiveMethods ?? "",
    ai_staff_advice: entry.aiStaffAdvice ?? "",
    ai_handover: entry.aiHandover ?? "",
    author_name: entry.authorName ?? "",
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

export async function insertAbsenceRecord(supabase, userId, entry) {
  const { error } = await supabase.from("absence_records").insert({
    id: entry.id,
    user_id: userId,
    child_id: entry.childId ?? null,
    child_name: entry.childName ?? "",
    absence_date: entry.absenceDate,
    reason: entry.reason ?? "",
    source: entry.source ?? "staff",
    line_user_id: entry.lineUserId ?? "",
    line_message: entry.lineMessage ?? "",
    ai_parsed: entry.aiParsed ?? {},
    contacted_at: entry.contactedAt ?? null,
    contacted_by: entry.contactedBy ?? "",
    billable: Boolean(entry.billable),
    billable_note: entry.billableNote ?? "",
    created_at: entry.createdAt,
    updated_at: entry.updatedAt ?? entry.createdAt,
  });
  if (error) throw error;
}

export async function markAbsenceContacted(
  supabase,
  userId,
  absenceId,
  contactedBy,
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("absence_records")
    .update({
      contacted_at: now,
      contacted_by: contactedBy ?? "",
      updated_at: now,
    })
    .eq("id", absenceId)
    .eq("user_id", userId);
  if (error) throw error;
  return now;
}

export async function deleteAbsenceRecord(supabase, userId, absenceId) {
  const { error } = await supabase
    .from("absence_records")
    .delete()
    .eq("id", absenceId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertChildServiceSchedule(supabase, userId, entry) {
  const { data, error } = await supabase
    .from("child_service_schedules")
    .insert({
      user_id: userId,
      child_id: entry.childId,
      child_name: entry.childName ?? "",
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime ?? "",
      end_time: entry.endTime ?? "",
      notes: entry.notes ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return childServiceScheduleFromRow(data);
}

export async function deleteChildServiceSchedule(
  supabase,
  userId,
  scheduleId,
) {
  const { error } = await supabase
    .from("child_service_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function insertLineGuardianLink(supabase, userId, entry) {
  const { data, error } = await supabase
    .from("line_guardian_links")
    .insert({
      user_id: userId,
      line_user_id: entry.lineUserId.trim(),
      child_id: entry.childId,
      child_name: entry.childName ?? "",
      guardian_label: entry.guardianLabel ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return lineGuardianLinkFromRow(data);
}

export async function deleteLineGuardianLink(supabase, userId, linkId) {
  const { error } = await supabase
    .from("line_guardian_links")
    .delete()
    .eq("id", linkId)
    .eq("user_id", userId);
  if (error) throw error;
}
