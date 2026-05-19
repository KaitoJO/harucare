import {
  PARENTING_PARTICIPATION_OPTIONS,
  participationModeLabel,
} from "./parentingSupportConfig.js";

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

export default function ParentingSupportScreen(props) {
  const {
    s,
    form,
    setForm,
    childrenList,
    VoiceTextarea,
    durationMinutes,
    monthlyUsed,
    monthlyRemaining,
    familySupportSameDayAvailable,
    familySupportSameDayRecorded,
    parentingAiLoading,
    onGenerate,
    saveBusy,
    onSave,
    canSave,
    pdfBusy,
    onExportPdf,
    recordsByMonth,
    formatJaDateTime,
    onOpenRecord,
  } = props;

  const VoiceField = VoiceTextarea;

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
          子育てサポート加算
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6a7a6a", lineHeight: 1.55 }}>
          子育てサポートの実施記録・加算申請用文書の作成（月4回上限）
        </p>
      </div>

      {form.childId ? (
        <div
          style={{
            ...s.card,
            marginBottom: 12,
            background: "#f0f7f2",
            border: "1px solid #c8e0cc",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#2d5a3d" }}>
            今月あと {monthlyRemaining} 回算定可能
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#5a6a5a" }}>
            対象児童の今月の算定済み：{monthlyUsed} / 4 回
          </p>
        </div>
      ) : null}

      {familySupportSameDayAvailable ? (
        <div
          style={{
            ...s.card,
            marginBottom: 12,
            background: "#eef6ff",
            border: "1px solid #b8d4f0",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a5276" }}>
            本日家族支援加算も算定可能です
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#3a5a7a" }}>
            同日に家族支援加算の記録がまだありません。必要に応じて家族支援加算も記録してください。
          </p>
        </div>
      ) : null}

      {familySupportSameDayRecorded ? (
        <div
          style={{
            ...s.card,
            marginBottom: 12,
            background: "#fafcfa",
            border: "1px solid #e0eae0",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#5a6a5a" }}>
            本日は家族支援加算の記録あり
          </div>
        </div>
      ) : null}

      <div style={s.card}>
        <SectionHeading>■ 基本情報</SectionHeading>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>対象児童</label>
          <select
            value={form.childId}
            onChange={(e) => setForm((f) => ({ ...f, childId: e.target.value }))}
            style={s.input}
          >
            <option value="">選択してください</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={s.label}>実施日</label>
            <input
              type="date"
              value={form.conductedDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, conductedDate: e.target.value }))
              }
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>実施時刻</label>
            <input
              type="time"
              value={form.conductedTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, conductedTime: e.target.value }))
              }
              style={s.input}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>担当者名</label>
          <input
            type="text"
            value={form.staffName}
            onChange={(e) => setForm((f) => ({ ...f, staffName: e.target.value }))}
            placeholder="担当職員名"
            style={s.input}
          />
        </div>

        <SectionHeading>■ 実施内容</SectionHeading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={s.label}>参加保護者名</label>
            <input
              type="text"
              value={form.guardianName}
              onChange={(e) =>
                setForm((f) => ({ ...f, guardianName: e.target.value }))
              }
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>続柄</label>
            <input
              type="text"
              value={form.guardianRelation}
              onChange={(e) =>
                setForm((f) => ({ ...f, guardianRelation: e.target.value }))
              }
              placeholder="例：母、父"
              style={s.input}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>支援場面の種類</label>
          <input
            type="text"
            value={form.supportSceneType}
            onChange={(e) =>
              setForm((f) => ({ ...f, supportSceneType: e.target.value }))
            }
            placeholder="例：自由遊び、集団活動、送迎時"
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>保護者の参加形態</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PARENTING_PARTICIPATION_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="participationMode"
                  value={opt.id}
                  checked={form.participationMode === opt.id}
                  onChange={() =>
                    setForm((f) => ({ ...f, participationMode: opt.id }))
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={s.label}>参加開始</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>参加終了</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              style={s.input}
            />
          </div>
        </div>
        {durationMinutes != null ? (
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "#5a6a5a" }}>
            参加時間：{durationMinutes}分
          </p>
        ) : null}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>支援場面の観察・参加内容</label>
          <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 8 }}>
            観察・参加した内容（音声入力可）
          </div>
          <VoiceField
            value={form.observationContent}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, observationContent: v }))
            }
            rows={6}
            placeholder="保護者の参加の様子、児童の反応、支援場面での観察など"
          />
        </div>

        <SectionHeading>■ AI生成</SectionHeading>
        <button
          type="button"
          onClick={onGenerate}
          disabled={parentingAiLoading || !form.observationContent.trim()}
          style={{
            ...s.btn,
            marginBottom: 14,
            opacity: parentingAiLoading || !form.observationContent.trim() ? 0.65 : 1,
          }}
        >
          {parentingAiLoading ? "生成中…" : "生成する"}
        </button>
        {(form.aiConsultationRecord ||
          form.aiChildCharacteristics ||
          form.aiParentAdvice ||
          form.aiHomePractice) && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>相談援助の記録文（編集可）</label>
              <textarea
                value={form.aiConsultationRecord}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aiConsultationRecord: e.target.value }))
                }
                rows={7}
                style={s.textarea}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>児童の特性に関する説明文（編集可）</label>
              <textarea
                value={form.aiChildCharacteristics}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aiChildCharacteristics: e.target.value }))
                }
                rows={5}
                style={s.textarea}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>保護者へのアドバイス（編集可）</label>
              <textarea
                value={form.aiParentAdvice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aiParentAdvice: e.target.value }))
                }
                rows={5}
                style={s.textarea}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>家庭での実践ポイント（編集可）</label>
              <textarea
                value={form.aiHomePractice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aiHomePractice: e.target.value }))
                }
                rows={5}
                style={s.textarea}
              />
            </div>
          </>
        )}

        <SectionHeading>■ 確認欄</SectionHeading>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>保護者サイン</label>
          <input
            type="text"
            value={form.parentSignature}
            onChange={(e) =>
              setForm((f) => ({ ...f, parentSignature: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>担当者確認</label>
          <input
            type="text"
            value={form.staffConfirmation}
            onChange={(e) =>
              setForm((f) => ({ ...f, staffConfirmation: e.target.value }))
            }
            style={s.input}
          />
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saveBusy || !canSave}
          style={{
            ...s.btnGold,
            opacity: saveBusy || !canSave ? 0.65 : 1,
            cursor: saveBusy || !canSave ? "wait" : "pointer",
          }}
        >
          {saveBusy ? "保存中…" : "この内容で保存"}
        </button>
      </div>

      {recordsByMonth.length > 0 ? (
        <div style={{ ...s.card, marginTop: 12 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#2a3a2a",
              marginBottom: 12,
            }}
          >
            月別一覧
          </div>
          {recordsByMonth.map(([ym, rows]) => (
            <div key={ym} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#2d5a3d",
                  marginBottom: 8,
                }}
              >
                {ym.slice(0, 4)}年{ym.slice(5)}月
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid #e0eae0",
                      borderRadius: 12,
                      padding: 12,
                      background: "#fafcfa",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      {formatJaDateTime(r.conductedAt)} · {r.childName}
                    </div>
                    <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 8 }}>
                      {(r.payload?.supportSceneType || "—").slice(0, 40)}
                      {r.durationMinutes != null ? ` · ${r.durationMinutes}分` : ""}
                      {" · "}
                      {participationModeLabel(r.payload?.participationMode)}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => onOpenRecord(r)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #c8e0cc",
                          background: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#2d5a3d",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        内容を表示
                      </button>
                      <button
                        type="button"
                        onClick={() => onExportPdf(r)}
                        disabled={pdfBusy}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #c8e0cc",
                          background: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#2d5a3d",
                          cursor: pdfBusy ? "wait" : "pointer",
                          fontFamily: "inherit",
                          opacity: pdfBusy ? 0.6 : 1,
                        }}
                      >
                        PDF出力
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
