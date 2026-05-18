import {
  FAMILY_SUPPORT_TYPE_OPTIONS,
  supportTypeLabel,
} from "./familySupportConfig.js";

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

export default function FamilySupportScreen(props) {
  const {
    s,
    form,
    setForm,
    childrenList,
    VoiceTextarea,
    durationMinutes,
    durationWarning,
    monthlyUsed,
    monthlyRemaining,
    familyAiLoading,
    onAnalyze,
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
          家族支援加算
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6a7a6a", lineHeight: 1.55 }}>
          家族支援の実施記録・加算申請用文書の作成（月4回上限）
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
            対象児童の今月の算定済み：{monthlyUsed} / 4 回（30分以上の記録のみカウント）
          </p>
        </div>
      ) : null}

      {durationWarning ? (
        <div
          style={{
            ...s.card,
            marginBottom: 12,
            background: "#fff8e6",
            border: "2px solid #e6a700",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8a6d00" }}>
            加算算定不可（30分以上必要）
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7a6500" }}>
            実施時間が{durationMinutes != null ? `${durationMinutes}分` : "30分未満"}
            です。家族支援加算は30分以上の実施が必要です。
          </p>
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
          <label style={s.label}>担当者名（児発管等）</label>
          <input
            type="text"
            value={form.staffName}
            onChange={(e) => setForm((f) => ({ ...f, staffName: e.target.value }))}
            placeholder="児童発達支援管理責任者 など"
            style={s.input}
          />
        </div>

        <SectionHeading>■ 支援種別</SectionHeading>
        <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {FAMILY_SUPPORT_TYPE_OPTIONS.map((opt) => (
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
                name="supportType"
                value={opt.id}
                checked={form.supportType === opt.id}
                onChange={() => setForm((f) => ({ ...f, supportType: opt.id }))}
              />
              {opt.label}
            </label>
          ))}
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
            <label style={s.label}>参加者（保護者名）</label>
            <input
              type="text"
              value={form.participantName}
              onChange={(e) =>
                setForm((f) => ({ ...f, participantName: e.target.value }))
              }
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>続柄</label>
            <input
              type="text"
              value={form.participantRelation}
              onChange={(e) =>
                setForm((f) => ({ ...f, participantRelation: e.target.value }))
              }
              placeholder="例：母、父"
              style={s.input}
            />
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
            <label style={s.label}>開始時刻</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              style={s.input}
            />
          </div>
          <div>
            <label style={s.label}>終了時刻</label>
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
            実施時間：{durationMinutes}分
          </p>
        ) : null}
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>相談内容</label>
          <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 8 }}>
            相談・支援の内容（音声入力可）
          </div>
          <VoiceField
            value={form.consultationContent}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, consultationContent: v }))
            }
            rows={6}
            placeholder="保護者との相談内容、支援の経過など"
          />
        </div>

        <SectionHeading>■ AI生成</SectionHeading>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={familyAiLoading || !form.consultationContent.trim()}
          style={{
            ...s.btn,
            marginBottom: 14,
            opacity: familyAiLoading || !form.consultationContent.trim() ? 0.65 : 1,
          }}
        >
          {familyAiLoading ? "生成中…" : "AIで記録文・次回提案を生成"}
        </button>
        {(form.aiRecordText || form.aiNextSuggestion) && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>相談援助の記録文（編集可）</label>
              <textarea
                value={form.aiRecordText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aiRecordText: e.target.value }))
                }
                rows={8}
                style={s.textarea}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>次回の支援提案（編集可）</label>
              <textarea
                value={form.aiNextSuggestion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aiNextSuggestion: e.target.value }))
                }
                rows={5}
                style={s.textarea}
              />
            </div>
          </>
        )}

        <SectionHeading>■ 確認欄</SectionHeading>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>保護者サイン欄</label>
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
                      {supportTypeLabel(r.supportType)}
                      {r.durationMinutes != null ? ` · ${r.durationMinutes}分` : ""}
                      {!r.billable ? " · 算定不可" : ""}
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
