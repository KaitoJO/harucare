import {
  ACCIDENT_TYPE_OPTIONS,
  MAJOR_FLAG_OPTIONS,
  isAccidentFieldEnabled,
} from "./accidentReportConfig.js";

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

/**
 * @param {object} props
 */
export default function AccidentReportScreen(props) {
  const {
    s,
    fieldConfig,
    onToggleAccidentField,
    accidentForm,
    setAccidentForm,
    workspaceSettingsOpen,
    setWorkspaceSettingsOpen,
    facilityNameInput,
    setFacilityNameInput,
    defaultAuthorInput,
    setDefaultAuthorInput,
    onSaveWorkspaceSettings,
    childrenList,
    VoiceTextarea,
    hasMajor,
    accidentAiLoading,
    onAnalyze,
    accidentSaveBusy,
    onSave,
    accidentPdfBusy,
    onExportPdf,
    canSave,
    accidentRecords,
    formatJaDateTime,
    onOpenRecord,
  } = props;
  const VoiceField = VoiceTextarea;
  const fe = (id) => isAccidentFieldEnabled(fieldConfig, id);

  const toggleAccidentType = (typeId) => {
    setAccidentForm((f) => {
      const set = new Set(f.accidentTypes ?? []);
      if (set.has(typeId)) set.delete(typeId);
      else set.add(typeId);
      return { ...f, accidentTypes: [...set] };
    });
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
          事故報告書
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#6a7a6a",
            lineHeight: 1.55,
          }}
        >
          東京都・放課後等デイサービス向けの事故報告（他自治体は設定で様式を調整できます）
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
                placeholder="放課後等デイサービス ○○"
                style={s.input}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={s.label}>作成者名（初期値）</label>
              <input
                type="text"
                value={defaultAuthorInput}
                onChange={(e) => setDefaultAuthorInput(e.target.value)}
                placeholder="児童発達支援管理責任者 など"
                style={s.input}
              />
            </div>
            <button type="button" onClick={onSaveWorkspaceSettings} style={s.btn}>
              設定を保存
            </button>
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid #e0eae0",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#2d5a3d",
                  marginBottom: 8,
                }}
              >
                様式の項目（自治体カスタマイズ）
              </div>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 11,
                  color: "#7a8a7a",
                  lineHeight: 1.5,
                }}
              >
                不要な項目はオフにできます（東京都様式ベース。他自治体は後から調整可能）
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fieldConfig.map((f) => (
                  <label
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "#2a3a2a",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={f.enabled !== false}
                      onChange={() => onToggleAccidentField(f.id)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {hasMajor ? (
        <div
          style={{
            ...s.card,
            marginBottom: 12,
            background: "#fff5f5",
            border: "2px solid #c62828",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#b71c1c",
              marginBottom: 4,
            }}
          >
            直ちに自治体報告が必要です
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#c62828", lineHeight: 1.55 }}>
            重大事故（死亡・骨折・虐待）に該当するフラグがオンです。所定の手続きに従い、速やかに自治体へ報告してください。
          </p>
        </div>
      ) : null}

      <div style={s.card}>
        <SectionHeading>■ 基本情報</SectionHeading>
        {fe("facilityName") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>事業所名</label>
            <input
              type="text"
              value={accidentForm.facilityName}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, facilityName: e.target.value }))
              }
              style={s.input}
            />
          </div>
        ) : null}
        {fe("reportDate") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>報告日</label>
            <input
              type="date"
              value={accidentForm.reportDate}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, reportDate: e.target.value }))
              }
              style={s.input}
            />
          </div>
        ) : null}
        {fe("authorName") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>作成者名</label>
            <input
              type="text"
              value={accidentForm.authorName}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, authorName: e.target.value }))
              }
              style={s.input}
            />
          </div>
        ) : null}

        <SectionHeading>■ 事故情報</SectionHeading>
        {fe("occurredAt") ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={s.label}>発生日</label>
              <input
                type="date"
                value={accidentForm.occurredDate}
                onChange={(e) =>
                  setAccidentForm((f) => ({ ...f, occurredDate: e.target.value }))
                }
                style={s.input}
              />
            </div>
            <div>
              <label style={s.label}>発生時間</label>
              <input
                type="time"
                value={accidentForm.occurredTime}
                onChange={(e) =>
                  setAccidentForm((f) => ({ ...f, occurredTime: e.target.value }))
                }
                style={s.input}
              />
            </div>
          </div>
        ) : null}
        {fe("location") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>発生場所</label>
            <input
              type="text"
              value={accidentForm.location}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="例：送迎車内、ホール など"
              style={s.input}
            />
          </div>
        ) : null}
        {fe("childId") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>対象児童</label>
            <select
              value={accidentForm.childId}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, childId: e.target.value }))
              }
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
        ) : null}
        {fe("accidentTypes") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>事故種別（複数選択可）</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACCIDENT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#2a3a2a",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={(accidentForm.accidentTypes ?? []).includes(opt.id)}
                    onChange={() => toggleAccidentType(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {fe("majorFlags") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>重大事故フラグ</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MAJOR_FLAG_OPTIONS.map((opt) => {
                const key =
                  opt.id === "death"
                    ? "majorDeath"
                    : opt.id === "fracture"
                      ? "majorFracture"
                      : "majorAbuse";
                return (
                  <label
                    key={opt.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#b71c1c",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(accidentForm[key])}
                      onChange={(e) =>
                        setAccidentForm((f) => ({
                          ...f,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <SectionHeading>■ 発生状況</SectionHeading>
        {fe("situation") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>発生状況</label>
            <div
              style={{
                fontSize: 11,
                color: "#7a8a7a",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              何が起きたかを具体的に（音声入力可）
            </div>
            <VoiceField
              value={accidentForm.situation}
              onValueChange={(v) =>
                setAccidentForm((f) => ({ ...f, situation: v }))
              }
              rows={6}
              placeholder="事故の経緯・状況を記入"
            />
          </div>
        ) : null}
        {fe("discovererName") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>発見者名</label>
            <input
              type="text"
              value={accidentForm.discovererName}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, discovererName: e.target.value }))
              }
              style={s.input}
            />
          </div>
        ) : null}
        {fe("discoverySituation") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>発見時の状況</label>
            <textarea
              value={accidentForm.discoverySituation}
              onChange={(e) =>
                setAccidentForm((f) => ({
                  ...f,
                  discoverySituation: e.target.value,
                }))
              }
              rows={3}
              style={s.textarea}
            />
          </div>
        ) : null}

        <SectionHeading>■ 対応記録</SectionHeading>
        {fe("initialResponse") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>初期対応内容</label>
            <textarea
              value={accidentForm.initialResponse}
              onChange={(e) =>
                setAccidentForm((f) => ({ ...f, initialResponse: e.target.value }))
              }
              rows={4}
              style={s.textarea}
            />
          </div>
        ) : null}
        {fe("parentContactAt") ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={s.label}>保護者連絡日</label>
              <input
                type="date"
                value={accidentForm.parentContactDate}
                onChange={(e) =>
                  setAccidentForm((f) => ({
                    ...f,
                    parentContactDate: e.target.value,
                  }))
                }
                style={s.input}
              />
            </div>
            <div>
              <label style={s.label}>保護者連絡時間</label>
              <input
                type="time"
                value={accidentForm.parentContactTime}
                onChange={(e) =>
                  setAccidentForm((f) => ({
                    ...f,
                    parentContactTime: e.target.value,
                  }))
                }
                style={s.input}
              />
            </div>
          </div>
        ) : null}
        {fe("medicalVisit") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>医療機関受診</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="medicalVisit"
                  value="no"
                  checked={accidentForm.medicalVisit === "no"}
                  onChange={() =>
                    setAccidentForm((f) => ({ ...f, medicalVisit: "no" }))
                  }
                />{" "}
                なし
              </label>
              <label style={{ fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="medicalVisit"
                  value="yes"
                  checked={accidentForm.medicalVisit === "yes"}
                  onChange={() =>
                    setAccidentForm((f) => ({ ...f, medicalVisit: "yes" }))
                  }
                />{" "}
                あり
              </label>
            </div>
          </div>
        ) : null}
        {fe("medicalDetails") && accidentForm.medicalVisit === "yes" ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>医療機関名</label>
              <input
                type="text"
                value={accidentForm.medicalFacilityName}
                onChange={(e) =>
                  setAccidentForm((f) => ({
                    ...f,
                    medicalFacilityName: e.target.value,
                  }))
                }
                style={s.input}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>診断結果</label>
              <textarea
                value={accidentForm.diagnosisResult}
                onChange={(e) =>
                  setAccidentForm((f) => ({
                    ...f,
                    diagnosisResult: e.target.value,
                  }))
                }
                rows={3}
                style={s.textarea}
              />
            </div>
          </>
        ) : null}

        {fe("aiSections") ? (
          <>
            <SectionHeading>■ AI生成</SectionHeading>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={accidentAiLoading || !accidentForm.situation.trim()}
              style={{
                ...s.btn,
                marginBottom: 14,
                opacity:
                  accidentAiLoading || !accidentForm.situation.trim() ? 0.65 : 1,
                cursor:
                  accidentAiLoading || !accidentForm.situation.trim()
                    ? "wait"
                    : "pointer",
              }}
            >
              {accidentAiLoading ? "生成中…" : "AIで分析・防止策・コメントを生成"}
            </button>
            {(accidentForm.causeAnalysis ||
              accidentForm.preventionMeasures ||
              accidentForm.managerComment) && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>事故原因の分析（編集可）</label>
                  <textarea
                    value={accidentForm.causeAnalysis}
                    onChange={(e) =>
                      setAccidentForm((f) => ({
                        ...f,
                        causeAnalysis: e.target.value,
                      }))
                    }
                    rows={5}
                    style={s.textarea}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>再発防止策（編集可）</label>
                  <textarea
                    value={accidentForm.preventionMeasures}
                    onChange={(e) =>
                      setAccidentForm((f) => ({
                        ...f,
                        preventionMeasures: e.target.value,
                      }))
                    }
                    rows={5}
                    style={s.textarea}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>管理者へのコメント（編集可）</label>
                  <textarea
                    value={accidentForm.managerComment}
                    onChange={(e) =>
                      setAccidentForm((f) => ({
                        ...f,
                        managerComment: e.target.value,
                      }))
                    }
                    rows={4}
                    style={s.textarea}
                  />
                </div>
              </>
            )}
          </>
        ) : null}

        <SectionHeading>■ 確認欄</SectionHeading>
        {fe("managerSignature") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>管理者署名</label>
            <input
              type="text"
              value={accidentForm.managerSignature}
              onChange={(e) =>
                setAccidentForm((f) => ({
                  ...f,
                  managerSignature: e.target.value,
                }))
              }
              style={s.input}
            />
          </div>
        ) : null}
        {fe("confirmationDate") ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>確認日</label>
            <input
              type="date"
              value={accidentForm.confirmationDate}
              onChange={(e) =>
                setAccidentForm((f) => ({
                  ...f,
                  confirmationDate: e.target.value,
                }))
              }
              style={s.input}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSave}
          disabled={accidentSaveBusy || !canSave}
          style={{
            ...s.btnGold,
            opacity: accidentSaveBusy || !canSave ? 0.65 : 1,
            cursor: accidentSaveBusy || !canSave ? "wait" : "pointer",
          }}
        >
          {accidentSaveBusy ? "保存中…" : "この内容で保存"}
        </button>
      </div>

      {accidentRecords.length > 0 ? (
        <div style={{ ...s.card, marginTop: 12 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#2a3a2a",
              marginBottom: 10,
            }}
          >
            保存済みの報告書
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {accidentRecords.slice(0, 10).map((r) => {
              const major = r.majorDeath || r.majorFracture || r.majorAbuse;
              return (
                <div
                  key={r.id}
                  style={{
                    border: major ? "2px solid #c62828" : "1px solid #e0eae0",
                    borderRadius: 12,
                    padding: 12,
                    background: major ? "#fff8f8" : "#fafcfa",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: major ? "#b71c1c" : "#2a3a2a",
                      marginBottom: 4,
                    }}
                  >
                    {formatJaDateTime(r.occurredAt)}
                    {r.childName ? ` · ${r.childName}` : ""}
                    {major ? " · 重大" : ""}
                  </div>
                  {r.location ? (
                    <div style={{ fontSize: 11, color: "#7a8a7a", marginBottom: 6 }}>
                      場所：{r.location}
                    </div>
                  ) : null}
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
                      disabled={accidentPdfBusy}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #c8e0cc",
                        background: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#2d5a3d",
                        cursor: accidentPdfBusy ? "wait" : "pointer",
                        fontFamily: "inherit",
                        opacity: accidentPdfBusy ? 0.6 : 1,
                      }}
                    >
                      PDF出力
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
