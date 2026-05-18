import {
  SHIFT_TYPE_OPTIONS,
  STAFF_COLOR_PALETTE,
  WEEKDAY_LABELS,
  buildMonthCalendarCells,
  defaultTimesForShiftType,
  entriesForDate,
  formatYearMonthLabel,
  shiftTypeHasTime,
  shiftTypeLabel,
} from "./shiftConfig.js";

function SectionHeading({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#2d5a3d",
        marginBottom: 10,
        marginTop: 4,
        paddingBottom: 6,
        borderBottom: "1px solid #e0eae0",
      }}
    >
      {children}
    </div>
  );
}

export default function ShiftScreen(props) {
  const {
    s,
    staff,
    entries,
    yearMonth,
    onPrevMonth,
    onNextMonth,
    selectedDate,
    onSelectDate,
    entryForm,
    setEntryForm,
    editingEntryId,
    onClearEntryEdit,
    staffDraft,
    setStaffDraft,
    editingStaffId,
    onEditEntry,
    onStartEditStaff,
    onClearStaffEdit,
    staffPanelOpen,
    setStaffPanelOpen,
    summary,
    saveBusy,
    onSaveEntry,
    onDeleteEntry,
    onSaveStaff,
    onDeleteStaff,
  } = props;

  const cells = buildMonthCalendarCells(yearMonth);
  const dayEntries = selectedDate ? entriesForDate(entries, selectedDate) : [];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#2a3a2a", marginBottom: 4 }}>
          シフト作成
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6a7a6a", lineHeight: 1.55 }}>
          月間カレンダーでシフトを管理し、勤務時間を自動集計します。
        </p>
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={onPrevMonth}
            style={{
              border: "1px solid #c8e0cc",
              background: "#fafcfa",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          >
            ← 前月
          </button>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#2a3a2a" }}>
            {formatYearMonthLabel(yearMonth)}
          </div>
          <button
            type="button"
            onClick={onNextMonth}
            style={{
              border: "1px solid #c8e0cc",
              background: "#fafcfa",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          >
            翌月 →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 4,
          }}
        >
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: w === "日" ? "#c45c5c" : w === "土" ? "#4a7c9e" : "#6a7a6a",
                padding: 4,
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((cell) => {
            const dayShifts = cell.inMonth ? entriesForDate(entries, cell.date) : [];
            const isSelected = selectedDate === cell.date;
            return (
              <button
                key={cell.date}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => cell.inMonth && onSelectDate(cell.date)}
                style={{
                  minHeight: 52,
                  padding: 4,
                  borderRadius: 8,
                  border: isSelected
                    ? "2px solid #2d5a3d"
                    : "1px solid #e0eae0",
                  background: cell.inMonth
                    ? isSelected
                      ? "#e8f4ec"
                      : "#fafcfa"
                    : "#f4f4f4",
                  opacity: cell.inMonth ? 1 : 0.45,
                  cursor: cell.inMonth ? "pointer" : "default",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: cell.inMonth ? "#2a3a2a" : "#aaa",
                    marginBottom: 4,
                  }}
                >
                  {cell.day}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {dayShifts.slice(0, 4).map((e) => {
                    const st = staff.find((x) => String(x.id) === String(e.staffId));
                    return (
                      <span
                        key={e.id}
                        title={st?.name}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: st?.color ?? "#2d5a3d",
                          display: "inline-block",
                        }}
                      />
                    );
                  })}
                  {dayShifts.length > 4 ? (
                    <span style={{ fontSize: 9, color: "#7a8a7a" }}>+{dayShifts.length - 4}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div style={{ ...s.card, marginBottom: 12 }}>
          <SectionHeading>
            {selectedDate} のシフト
            <button
              type="button"
              onClick={onClearEntryEdit}
              style={{
                float: "right",
                border: "none",
                background: "none",
                color: "#6a7a6a",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              新規入力に戻す
            </button>
          </SectionHeading>

          {dayEntries.length > 0 ? (
            <div style={{ marginBottom: 14 }}>
              {dayEntries.map((e) => {
                const st = staff.find((x) => String(x.id) === String(e.staffId));
                return (
                  <div
                    key={e.id}
                    style={{
                      border: "1px solid #e0eae0",
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 8,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: st?.color ?? "#2d5a3d",
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{st?.name ?? "—"}</span>
                      <span style={{ fontSize: 12, color: "#6a7a6a" }}>
                        {shiftTypeLabel(e.shiftType)}
                        {shiftTypeHasTime(e.shiftType)
                          ? ` ${e.startTime}〜${e.endTime}`
                          : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => onEditEntry(e)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                          borderRadius: 6,
                          border: "1px solid #c8e0cc",
                          background: "#fafcfa",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(e.id)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                          borderRadius: 6,
                          border: "1px solid #e8c8c8",
                          background: "#fff8f8",
                          color: "#b71c1c",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#7a8a7a", margin: "0 0 12px" }}>
              この日のシフトはまだありません。
            </p>
          )}

          <SectionHeading>{editingEntryId ? "シフトを編集" : "シフトを追加"}</SectionHeading>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>職員</label>
            <select
              value={entryForm.staffId}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, staffId: e.target.value }))
              }
              style={s.input}
            >
              <option value="">選択してください</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={s.label}>シフト種別</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SHIFT_TYPE_OPTIONS.map((opt) => (
                <label key={opt.id} style={{ fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="shiftType"
                    checked={entryForm.shiftType === opt.id}
                    onChange={() => {
                      const times = defaultTimesForShiftType(opt.id);
                      setEntryForm((f) => ({
                        ...f,
                        shiftType: opt.id,
                        startTime: opt.hasTime ? times.startTime : "",
                        endTime: opt.hasTime ? times.endTime : "",
                      }));
                    }}
                  />{" "}
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          {shiftTypeHasTime(entryForm.shiftType) ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <label style={s.label}>出勤</label>
                <input
                  type="time"
                  value={entryForm.startTime}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                  style={s.input}
                />
              </div>
              <div>
                <label style={s.label}>退勤</label>
                <input
                  type="time"
                  value={entryForm.endTime}
                  onChange={(e) =>
                    setEntryForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                  style={s.input}
                />
              </div>
            </div>
          ) : null}
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>メモ（任意）</label>
            <input
              type="text"
              value={entryForm.notes}
              onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))}
              style={s.input}
            />
          </div>
          <button
            type="button"
            onClick={onSaveEntry}
            disabled={saveBusy || !entryForm.staffId}
            style={{
              ...s.btn,
              opacity: saveBusy || !entryForm.staffId ? 0.65 : 1,
            }}
          >
            {saveBusy ? "保存中…" : editingEntryId ? "更新する" : "登録する"}
          </button>
        </div>
      ) : null}

      <div style={{ ...s.card, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setStaffPanelOpen((v) => !v)}
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
          {staffPanelOpen ? "▼" : "▶"} 職員管理（{staff.length}名）
        </button>
        {staffPanelOpen ? (
          <div style={{ marginTop: 12 }}>
            {staff.map((st) => (
              <div
                key={st.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid #eef4ee",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: st.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{st.name}</span>
                <button
                  type="button"
                  onClick={() => onStartEditStaff(st)}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    border: "1px solid #c8e0cc",
                    borderRadius: 6,
                    background: "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteStaff(st.id)}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    border: "1px solid #e8c8c8",
                    borderRadius: 6,
                    background: "#fff8f8",
                    color: "#b71c1c",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  削除
                </button>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e0eae0" }}>
              <label style={s.label}>{editingStaffId ? "職員名を編集" : "職員を追加"}</label>
              <input
                type="text"
                value={staffDraft.name}
                onChange={(e) =>
                  setStaffDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="職員名"
                style={{ ...s.input, marginBottom: 8 }}
              />
              <label style={s.label}>表示色</label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {STAFF_COLOR_PALETTE.map((c) => {
                  const selected = staffDraft.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      aria-label={`色 ${c}`}
                      aria-pressed={selected}
                      onClick={() => setStaffDraft((d) => ({ ...d, color: c }))}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: c,
                        border: selected
                          ? "3px solid #2a3a2a"
                          : "2px solid #e0eae0",
                        boxShadow: selected
                          ? "0 0 0 2px #fff, 0 0 0 4px #2d5a3d"
                          : "none",
                        cursor: "pointer",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={onSaveStaff} style={s.btn}>
                  {editingStaffId ? "更新" : "追加"}
                </button>
                {editingStaffId ? (
                  <button
                    type="button"
                    onClick={onClearStaffEdit}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #c8e0cc",
                      background: "#fff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                    }}
                  >
                    キャンセル
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={s.card}>
        <SectionHeading>月間集計（{formatYearMonthLabel(yearMonth)}）</SectionHeading>
        {staff.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "#7a8a7a" }}>
            職員を登録すると集計が表示されます。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e0eae0" }}>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>職員</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>出勤日数</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>勤務時間</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.staffId} style={{ borderBottom: "1px solid #eef4ee" }}>
                    <td style={{ padding: "8px 4px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: row.color,
                          marginRight: 6,
                        }}
                      />
                      {row.staffName}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 4px" }}>
                      {row.workDays}日
                    </td>
                    <td style={{ textAlign: "right", padding: "8px 4px" }}>
                      {row.totalHoursLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
