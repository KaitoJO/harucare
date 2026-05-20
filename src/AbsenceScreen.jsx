import {
  ABSENCE_SUPPORT_MONTHLY_LIMIT,
  ABSENCE_SUPPORT_UNITS_PER_CASE,
  WEEKDAY_OPTIONS,
  absencesForDate,
  buildPreviousMonthSummary,
  formatJaDate,
  formatYearMonthLabel,
  scheduledChildrenOnDate,
  sortAbsencesDesc,
  weekdayLabel,
} from "./absenceConfig.js";
import {
  WEEKDAY_LABELS,
  buildMonthCalendarCells,
  formatYearMonthLabel as shiftFormatYm,
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

export default function AbsenceScreen(props) {
  const {
    s,
    childrenList,
    absences,
    schedules,
    lineLinks,
    yearMonth,
    onPrevMonth,
    onNextMonth,
    selectedDate,
    onSelectDate,
    previousMonthSummary,
    absenceForm,
    setAbsenceForm,
    scheduleForm,
    setScheduleForm,
    lineLinkForm,
    setLineLinkForm,
    saveBusy,
    onSaveAbsence,
    onMarkContacted,
    onDeleteAbsence,
    onSaveSchedule,
    onDeleteSchedule,
    onSaveLineLink,
    onDeleteLineLink,
    staffName,
    setStaffName,
  } = props;

  const cells = buildMonthCalendarCells(yearMonth);
  const sortedAbsences = sortAbsencesDesc(absences);
  const dayAbsences = selectedDate ? absencesForDate(absences, selectedDate) : [];
  const daySchedules = selectedDate
    ? scheduledChildrenOnDate(schedules, selectedDate)
    : [];

  const btnPrimary = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: "#2d5a3d",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const btnGhost = {
    border: "1px solid #c8e0cc",
    background: "#fafcfa",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
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
          欠席管理（LINE連携）
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6a7a6a", lineHeight: 1.55 }}>
          保護者のLINE欠席連絡を自動反映。欠席時対応加算（月4回・94単位）を管理します。
        </p>
      </div>

      <div
        style={{
          ...s.card,
          marginBottom: 12,
          background: "#f0f7f2",
          border: "1px solid #c8e0cc",
        }}
      >
        <SectionHeading>
          月次サマリー（{formatYearMonthLabel(previousMonthSummary.yearMonth)}・自動集計）
        </SectionHeading>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#2d5a3d" }}>
          {previousMonthSummary.totalCount} 件
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#5a6a5a" }}>
          加算単位：{previousMonthSummary.totalUnits} 単位（1件
          {ABSENCE_SUPPORT_UNITS_PER_CASE}単位）
          <br />
          概算金額：約 {previousMonthSummary.estimatedYen.toLocaleString()} 円
          <span style={{ fontSize: 11, color: "#8a9a8a" }}>
            （連絡済み・算定対象のみ）
          </span>
        </p>
        {previousMonthSummary.perChild.length > 0 ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "#4a5a4a" }}>
            {previousMonthSummary.perChild.map((row) => (
              <div key={row.childId || row.childName}>
                {row.childName}：{row.count} 件
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#8a9a8a" }}>
            前月の算定対象欠席はありません
          </p>
        )}
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>■ 利用日程表</SectionHeading>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <button type="button" onClick={onPrevMonth} style={btnGhost}>
            ← 前月
          </button>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{shiftFormatYm(yearMonth)}</div>
          <button type="button" onClick={onNextMonth} style={btnGhost}>
            翌月 →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 8,
            fontSize: 10,
            color: "#8a9a8a",
            textAlign: "center",
          }}
        >
          {WEEKDAY_LABELS.map((lb) => (
            <div key={lb}>{lb}</div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 12,
          }}
        >
          {cells.map((cell) => {
            const scheduled = scheduledChildrenOnDate(schedules, cell.date);
            const absent = absencesForDate(absences, cell.date);
            const selected = selectedDate === cell.date;
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => onSelectDate(cell.date)}
                style={{
                  border: selected ? "2px solid #2d5a3d" : "1px solid #e0eae0",
                  background: !cell.inMonth
                    ? "#f8faf8"
                    : absent.length
                      ? "#fff0f0"
                      : scheduled.length
                        ? "#f0f7f2"
                        : "#fff",
                  borderRadius: 8,
                  padding: "6px 2px",
                  minHeight: 44,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  opacity: cell.inMonth ? 1 : 0.45,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{cell.day}</div>
                {scheduled.length > 0 ? (
                  <div style={{ fontSize: 9, color: "#2d5a3d" }}>
                    {scheduled.length}名
                  </div>
                ) : null}
                {absent.length > 0 ? (
                  <div style={{ fontSize: 9, color: "#c45c5c", fontWeight: 700 }}>
                    欠{absent.length}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        {selectedDate ? (
          <div style={{ background: "#fafcfa", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {formatJaDate(selectedDate)}
            </div>
            {daySchedules.length > 0 ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 4 }}>
                  利用予定
                </div>
                {daySchedules.map((sch) => (
                  <div key={sch.id} style={{ fontSize: 12, marginBottom: 2 }}>
                    {sch.childName} {sch.startTime}–{sch.endTime}
                    {absences.some(
                      (a) =>
                        a.absenceDate === selectedDate &&
                        String(a.childId) === String(sch.childId),
                    ) ? (
                      <span style={{ color: "#c45c5c", fontWeight: 700 }}>
                        {" "}
                        → 欠席
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#8a9a8a" }}>
                利用予定の登録なし
              </p>
            )}
            {dayAbsences.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 4 }}>
                  欠席
                </div>
                {dayAbsences.map((a) => (
                  <div key={a.id} style={{ fontSize: 12 }}>
                    {a.childName}：{a.reason}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>■ 欠席一覧</SectionHeading>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>担当者名（連絡済み記録用）</label>
          <input
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            style={s.input}
            placeholder="例：山田"
          />
        </div>

        {sortedAbsences.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#8a9a8a" }}>
            欠席記録はまだありません
          </p>
        ) : (
          sortedAbsences.map((record) => (
            <div
              key={record.id}
              style={{
                border: "1px solid #e0eae0",
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                background: record.contactedAt ? "#fafcfa" : "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {record.childName}
                  </div>
                  <div style={{ fontSize: 12, color: "#6a7a6a", marginTop: 2 }}>
                    {formatJaDate(record.absenceDate)}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>{record.reason}</div>
                  <div style={{ fontSize: 11, color: "#8a9a8a", marginTop: 4 }}>
                    {record.source === "line" ? "LINE受信" : "職員入力"}
                    {record.billable ? " · 加算対象" : " · 加算対象外"}
                    {record.billableNote ? `（${record.billableNote}）` : ""}
                  </div>
                  {record.contactedAt ? (
                    <div style={{ fontSize: 11, color: "#2d5a3d", marginTop: 4 }}>
                      連絡済み
                      {record.contactedBy ? `（${record.contactedBy}）` : ""}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {!record.contactedAt ? (
                    <button
                      type="button"
                      disabled={saveBusy}
                      onClick={() => onMarkContacted(record.id)}
                      style={{
                        ...btnPrimary,
                        padding: "8px 12px",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                        width: "auto",
                      }}
                    >
                      連絡済み
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={saveBusy}
                    onClick={() => onDeleteAbsence(record.id)}
                    style={{
                      border: "1px solid #e0c8c8",
                      background: "#fff",
                      color: "#a05050",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>■ 欠席を手動登録</SectionHeading>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>児童</label>
          <select
            value={absenceForm.childId}
            onChange={(e) =>
              setAbsenceForm((f) => ({ ...f, childId: e.target.value }))
            }
            style={s.input}
          >
            <option value="">選択</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>欠席日</label>
          <input
            type="date"
            value={absenceForm.absenceDate}
            onChange={(e) =>
              setAbsenceForm((f) => ({ ...f, absenceDate: e.target.value }))
            }
            style={s.input}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>理由</label>
          <input
            value={absenceForm.reason}
            onChange={(e) =>
              setAbsenceForm((f) => ({ ...f, reason: e.target.value }))
            }
            style={s.input}
            placeholder="発熱など"
          />
        </div>
        <button
          type="button"
          disabled={saveBusy || !absenceForm.childId || !absenceForm.reason.trim()}
          onClick={onSaveAbsence}
          style={btnPrimary}
        >
          登録
        </button>
      </div>

      <div style={{ ...s.card, marginBottom: 12 }}>
        <SectionHeading>■ 利用曜日の登録（日程表）</SectionHeading>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>児童</label>
          <select
            value={scheduleForm.childId}
            onChange={(e) =>
              setScheduleForm((f) => ({ ...f, childId: e.target.value }))
            }
            style={s.input}
          >
            <option value="">選択</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>曜日</label>
            <select
              value={scheduleForm.dayOfWeek}
              onChange={(e) =>
                setScheduleForm((f) => ({
                  ...f,
                  dayOfWeek: Number(e.target.value),
                }))
              }
              style={s.input}
            >
              {WEEKDAY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}曜
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>開始</label>
            <input
              type="time"
              value={scheduleForm.startTime}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, startTime: e.target.value }))
              }
              style={s.input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>終了</label>
            <input
              type="time"
              value={scheduleForm.endTime}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, endTime: e.target.value }))
              }
              style={s.input}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={saveBusy || !scheduleForm.childId}
          onClick={onSaveSchedule}
          style={btnPrimary}
        >
          曜日を追加
        </button>
        {schedules.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            {schedules.map((sch) => (
              <div
                key={sch.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  padding: "6px 0",
                  borderTop: "1px solid #eef2ee",
                }}
              >
                <span>
                  {sch.childName} · {weekdayLabel(sch.dayOfWeek)}曜 {sch.startTime}–
                  {sch.endTime}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteSchedule(sch.id)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#a05050",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={s.card}>
        <SectionHeading>■ LINE保護者紐付け</SectionHeading>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6a7a6a" }}>
          LINEユーザーIDと児童を紐付けると、児童名なしの連絡も受け付けられます。
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>LINEユーザーID</label>
          <input
            value={lineLinkForm.lineUserId}
            onChange={(e) =>
              setLineLinkForm((f) => ({ ...f, lineUserId: e.target.value }))
            }
            style={s.input}
            placeholder="Uxxxxxxxx..."
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>児童</label>
          <select
            value={lineLinkForm.childId}
            onChange={(e) =>
              setLineLinkForm((f) => ({ ...f, childId: e.target.value }))
            }
            style={s.input}
          >
            <option value="">選択</option>
            {childrenList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>保護者ラベル（任意）</label>
          <input
            value={lineLinkForm.guardianLabel}
            onChange={(e) =>
              setLineLinkForm((f) => ({ ...f, guardianLabel: e.target.value }))
            }
            style={s.input}
            placeholder="例：母"
          />
        </div>
        <button
          type="button"
          disabled={
            saveBusy || !lineLinkForm.lineUserId.trim() || !lineLinkForm.childId
          }
          onClick={onSaveLineLink}
          style={btnPrimary}
        >
          紐付けを追加
        </button>
        {lineLinks.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            {lineLinks.map((link) => (
              <div
                key={link.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "6px 0",
                  borderTop: "1px solid #eef2ee",
                }}
              >
                <span>
                  {link.childName}
                  {link.guardianLabel ? `（${link.guardianLabel}）` : ""} ·{" "}
                  {link.lineUserId.slice(0, 8)}…
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteLineLink(link.id)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#a05050",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
