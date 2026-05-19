import {
  SPECIALIZED_SUPPORT_DOMAINS,
  formatSpecializedDomains,
} from "./specializedPlanConfig.js";

function SectionHeading({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#2d5a3d",
        marginBottom: 12,
        marginTop: 4,
        paddingBottom: 6,
        borderBottom: "1px solid #e0eae0",
      }}
    >
      {children}
    </div>
  );
}

function GoalFields({ goalKey, goal, setForm, s, VoiceField }) {
  const toggleDomain = (domainId) => {
    setForm((f) => {
      const g = f[goalKey] ?? {};
      const set = new Set(g.domains ?? []);
      if (set.has(domainId)) set.delete(domainId);
      else set.add(domainId);
      return {
        ...f,
        [goalKey]: { ...g, domains: [...set] },
      };
    });
  };

  const setGoalField = (field, value) => {
    setForm((f) => ({
      ...f,
      [goalKey]: { ...(f[goalKey] ?? {}), [field]: value },
    }));
  };

  const label = goalKey === "goal1" ? "目標1" : "目標2";

  return (
    <div style={{ ...s.card, marginBottom: 12 }}>
      <SectionHeading>{label}</SectionHeading>
      <div style={{ marginBottom: 10 }}>
        <label style={s.label}>5領域（複数選択可）</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SPECIALIZED_SUPPORT_DOMAINS.map((d) => {
            const checked = (goal?.domains ?? []).includes(d.id);
            return (
              <label
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDomain(d.id)}
                />
                {d.label}
              </label>
            );
          })}
        </div>
        {(goal?.domains ?? []).length > 0 ? (
          <div style={{ fontSize: 12, color: "#6a7a6a", marginTop: 6 }}>
            選択中：{formatSpecializedDomains(goal.domains).join("、")}
          </div>
        ) : null}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={s.label}>実施タイミング</label>
        <VoiceField
          value={goal?.timing ?? ""}
          onValueChange={(v) => setGoalField("timing", v)}
          placeholder="例：粗大運動の時間、自由遊びの時間"
          rows={2}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={s.label}>ねらい</label>
        <VoiceField
          value={goal?.aim ?? ""}
          onValueChange={(v) => setGoalField("aim", v)}
          placeholder="例：情緒の安定、抵抗の軽減"
          rows={3}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={s.label}>活動例</label>
        <VoiceField
          value={goal?.activityExamples ?? ""}
          onValueChange={(v) => setGoalField("activityExamples", v)}
          placeholder="例：サーキットトレーニング、ボール投げ"
          rows={3}
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={s.label}>実施方法</label>
        <VoiceField
          value={goal?.implementationMethod ?? ""}
          onValueChange={(v) => setGoalField("implementationMethod", v)}
          placeholder="例：写真で流れを見せてから、モデリングして一緒に行う"
          rows={3}
        />
      </div>
    </div>
  );
}

/**
 * @param {object} props
 */
export default function SpecializedSupportPlanScreen(props) {
  const {
    s,
    form,
    setForm,
    childrenList,
    workspaceSettingsOpen,
    setWorkspaceSettingsOpen,
    facilityNameInput,
    setFacilityNameInput,
    defaultAuthorInput,
    setDefaultAuthorInput,
    onSaveWorkspaceSettings,
    VoiceTextarea,
    aiLoading,
    onGenerateGoals,
    saveBusy,
    onSave,
    pdfBusy,
    onExportPdf,
    canSave,
    savedRecords,
    formatJaDateTime,
    onOpenRecord,
  } = props;
  const VoiceField = VoiceTextarea;

  const setStaff = (index, value) => {
    setForm((f) => {
      const staff = [...(f.supportStaff ?? ["", "", "", ""])];
      staff[index] = value;
      return { ...f, supportStaff: staff };
    });
  };

  const onChildChange = (childId) => {
    const child = childrenList.find((c) => String(c.id) === String(childId));
    setForm((f) => ({
      ...f,
      childId,
      childName: child?.name ?? f.childName,
      birthDate: child?.birthDate ?? f.birthDate,
    }));
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#2a3a2a",
            marginBottom: 4,
          }}
        >
          専門的支援計画書
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#6a7a6a",
            lineHeight: 1.55,
          }}
        >
          専門的支援計画の作成・AI目標生成・PDF出力・保存
        </p>
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setWorkspaceSettingsOpen((v) => !v)}
          style={{
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            color: "#2d5a3d",
          }}
        >
          {workspaceSettingsOpen ? "▼" : "▶"} 事業所設定（事業所名・作成者の初期値）
        </button>
        {workspaceSettingsOpen ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>事業所名</label>
              <input
                type="text"
                value={facilityNameInput}
                onChange={(e) => setFacilityNameInput(e.target.value)}
                placeholder="スマイルキッズ北赤羽教室"
                style={s.input}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>作成者名（初期値）</label>
              <input
                type="text"
                value={defaultAuthorInput}
                onChange={(e) => setDefaultAuthorInput(e.target.value)}
                placeholder="専門的支援職員名"
                style={s.input}
              />
            </div>
            <button type="button" onClick={onSaveWorkspaceSettings} style={s.btn}>
              設定を保存
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>基本情報</SectionHeading>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>登録児童から選択（任意）</label>
          <select
            value={form.childId ?? ""}
            onChange={(e) => onChildChange(e.target.value)}
            style={s.input}
          >
            <option value="">— 手入力 —</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>ふりがな</label>
          <input
            type="text"
            value={form.childFurigana ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, childFurigana: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>児童名</label>
          <input
            type="text"
            value={form.childName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, childName: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>生年月日</label>
          <input
            type="date"
            value={form.birthDate ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, birthDate: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>事業所名</label>
          <input
            type="text"
            value={form.facilityName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, facilityName: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>専門的支援担当職員（最大4名）</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="text"
                value={form.supportStaff?.[i] ?? ""}
                onChange={(e) => setStaff(i, e.target.value)}
                placeholder={`担当${i + 1}`}
                style={s.input}
              />
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>作成日</label>
          <input
            type="date"
            value={form.creationDate ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, creationDate: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>作成者名</label>
          <input
            type="text"
            value={form.authorName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, authorName: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 0 }}>
          <label style={s.label}>起算日</label>
          <input
            type="date"
            value={form.calculationStartDate ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, calculationStartDate: e.target.value }))
            }
            style={s.input}
          />
        </div>
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>現在の状況</SectionHeading>
        <VoiceField
          value={form.currentStatus ?? ""}
          onValueChange={(v) => setForm((f) => ({ ...f, currentStatus: v }))}
          placeholder="児童の現在の発達段階、コミュニケーション・社会性・認知面の課題など"
          rows={8}
        />
        <button
          type="button"
          onClick={onGenerateGoals}
          disabled={aiLoading || !form.currentStatus?.trim()}
          style={{
            ...s.btn,
            marginTop: 12,
            width: "100%",
            opacity: aiLoading || !form.currentStatus?.trim() ? 0.6 : 1,
          }}
        >
          {aiLoading ? "生成中…" : "生成する（目標1・2をAI生成）"}
        </button>
      </div>

      <GoalFields
        goalKey="goal1"
        goal={form.goal1}
        setForm={setForm}
        s={s}
        VoiceField={VoiceField}
      />
      <GoalFields
        goalKey="goal2"
        goal={form.goal2}
        setForm={setForm}
        s={s}
        VoiceField={VoiceField}
      />

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>保護者同意欄（PDF用）</SectionHeading>
        <div style={{ marginBottom: 10 }}>
          <label style={s.label}>同意日</label>
          <input
            type="date"
            value={form.consentDate ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, consentDate: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 0 }}>
          <label style={s.label}>保護者氏名</label>
          <input
            type="text"
            value={form.guardianName ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, guardianName: e.target.value }))
            }
            style={s.input}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => onExportPdf(form)}
          disabled={pdfBusy}
          style={{
            ...s.btn,
            width: "100%",
            background: "transparent",
            color: "#2d5a3d",
            border: "2px solid #c8e0cc",
            opacity: pdfBusy ? 0.6 : 1,
          }}
        >
          {pdfBusy ? "PDF作成中…" : "PDF出力"}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveBusy || !canSave}
          style={{
            ...s.btn,
            width: "100%",
            opacity: saveBusy || !canSave ? 0.6 : 1,
          }}
        >
          {saveBusy ? "保存中…" : "保存する"}
        </button>
      </div>

      {savedRecords.length > 0 ? (
        <div style={s.card}>
          <SectionHeading>保存済み（履歴）</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {savedRecords.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => onOpenRecord(rec)}
                style={{
                  textAlign: "left",
                  background: "#f8fbf8",
                  border: "1px solid #e0eae0",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: "#2a3a2a" }}>
                  {rec.childName || "（児童名なし）"}
                </div>
                <div style={{ fontSize: 12, color: "#6a7a6a", marginTop: 2 }}>
                  {rec.createdAtLabel ||
                    (rec.createdAt && formatJaDateTime
                      ? formatJaDateTime(rec.createdAt)
                      : "")}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
