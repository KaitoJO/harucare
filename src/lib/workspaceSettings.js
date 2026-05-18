const STORAGE_KEY = "harucare_workspace_settings";

/** @typedef {{ facilityName: string, defaultAuthorName: string, municipalityId: string }} WorkspaceSettings */

/** @returns {WorkspaceSettings} */
export function getDefaultWorkspaceSettings() {
  return {
    facilityName: "",
    defaultAuthorName: "",
    municipalityId: "tokyo",
  };
}

/** @returns {WorkspaceSettings} */
export function loadWorkspaceSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultWorkspaceSettings();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultWorkspaceSettings(),
      ...parsed,
      facilityName: String(parsed?.facilityName ?? "").trim(),
      defaultAuthorName: String(parsed?.defaultAuthorName ?? "").trim(),
      municipalityId: String(parsed?.municipalityId ?? "tokyo").trim() || "tokyo",
    };
  } catch {
    return getDefaultWorkspaceSettings();
  }
}

/** @param {Partial<WorkspaceSettings>} patch */
export function saveWorkspaceSettings(patch) {
  const next = { ...loadWorkspaceSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
