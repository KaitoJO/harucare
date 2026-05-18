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

export default function CaseExampleScreen(props) {
  const {
    s,
    form,
    setForm,
    childrenList,
    disabilityTypes,
    ageOptions,
    VoiceTextarea,
    caseAiLoading,
    onAnalyze,
    saveBusy,
    onSave,
    canSave,
    filterDisability,
    setFilterDisability,
    filterSceneQuery,
    setFilterSceneQuery,
    filteredRecords,
    totalCount,
    formatJaDateTime,
    onOpenRecord,
    onNewRecord,
  } = props;

  const VoiceField = VoiceTextarea;

  const handleSelectChild = (childId) => {
    const child = childrenList.find((c) => String(c.id) === String(childId));
    setForm((f) => ({
      ...f,
      childId,
      ...(child
        ? { disability: child.disability ?? f.disability, age: child.age ?? f.age }
        : {}),
    }));
  };

  const hasAi =
    form.aiSummary.trim() ||
    form.aiEffectiveMethods.trim() ||
    form.aiStaffAdvice.trim() ||
    form.aiHandover.trim();

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
          療育の事例出し
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6a7a6a", lineHeight: 1.55 }}>
          支援場面・課題を入力し、AIで事例を整理。保存した事例は職員間で共有できます（同一アカウント）。
        </p>
      </div>

      <div style={s.card}>
        <SectionHeading>■ 入力</SectionHeading>

        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>対象児童</label>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, childMode: "select" }))}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                border:
                  form.childMode === "select"
                    ? "2px solid #2d5a3d"
                    : "2px solid #c8e0cc",
                background: form.childMode === "select" ? "#2d5a3d" : "#fafcfa",
                color: form.childMode === "select" ? "#fff" : "#2d5a3d",
              }}
            >
              一覧から選択
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, childMode: "custom" }))}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                border:
                  form.childMode === "custom"
                    ? "2px solid #2d5a3d"
                    : "2px solid #c8e0cc",
                background: form.childMode === "custom" ? "#2d5a3d" : "#fafcfa",
                color: form.childMode === "custom" ? "#fff" : "#2d5a3d",
              }}
            >
              直接入力
            </button>
          </div>
          {form.childMode === "select" ? (
            <select
              value={form.childId}
              onChange={(e) => handleSelectChild(e.target.value)}
              style={s.input}
            >
              <option value="">選択してください</option>
              {childrenList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.childNameCustom}
              onChange={(e) =>
                setForm((f) => ({ ...f, childNameCustom: e.target.value }))
              }
              placeholder="児童名を入力"
              style={s.input}
              autoComplete="off"
            />
          )}
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
            <label style={s.label}>障害種別</label>
            <select
              value={form.disability}
              onChange={(e) =>
                setForm((f) => ({ ...f, disability: e.target.value }))
              }
              style={s.input}
            >
              {disabilityTypes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>年齢</label>
            <select
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              style={s.input}
            >
              {ageOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>支援場面</label>
          <VoiceField
            value={form.supportScene}
            onValueChange={(v) => setForm((f) => ({ ...f, supportScene: v }))}
            rows={4}
            placeholder="例：集団活動での輪番待ち、送迎時の乗り降り など（🎤音声入力可）"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>課題・困りごと</label>
          <textarea
            value={form.challenges}
            onChange={(e) =>
              setForm((f) => ({ ...f, challenges: e.target.value }))
            }
            rows={4}
            placeholder="観察された課題・保護者・職員の困りごとなど"
            style={s.textarea}
          />
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={caseAiLoading}
          style={{
            ...s.btn,
            width: "100%",
            opacity: caseAiLoading ? 0.7 : 1,
          }}
        >
          {caseAiLoading ? "AI生成中…" : "✨ AIで事例を生成"}
        </button>
      </div>

      {hasAi ? (
        <div style={{ ...s.card, marginTop: 12 }}>
          <SectionHeading>■ AI生成（編集可）</SectionHeading>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>支援事例のまとめ</label>
            <textarea
              value={form.aiSummary}
              onChange={(e) =>
                setForm((f) => ({ ...f, aiSummary: e.target.value }))
              }
              rows={5}
              style={s.textarea}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>有効だった支援方法</label>
            <textarea
              value={form.aiEffectiveMethods}
              onChange={(e) =>
                setForm((f) => ({ ...f, aiEffectiveMethods: e.target.value }))
              }
              rows={5}
              style={s.textarea}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>他職員へのアドバイス</label>
            <textarea
              value={form.aiStaffAdvice}
              onChange={(e) =>
                setForm((f) => ({ ...f, aiStaffAdvice: e.target.value }))
              }
              rows={4}
              style={s.textarea}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>次回への引き継ぎ事項</label>
            <textarea
              value={form.aiHandover}
              onChange={(e) =>
                setForm((f) => ({ ...f, aiHandover: e.target.value }))
              }
              rows={4}
              style={s.textarea}
            />
          </div>
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
            {saveBusy ? "保存中…" : "💾 事例を保存"}
          </button>
        </div>
      ) : null}

      <div style={{ ...s.card, marginTop: 12 }}>
        <SectionHeading>■ 保存済み事例</SectionHeading>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6a7a6a" }}>
          {filteredRecords.length} 件表示（全 {totalCount} 件）
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={s.label}>障害種別で絞り込み</label>
            <select
              value={filterDisability}
              onChange={(e) => setFilterDisability(e.target.value)}
              style={s.input}
            >
              <option value="all">すべて</option>
              {disabilityTypes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>場面・課題で検索</label>
            <input
              type="text"
              value={filterSceneQuery}
              onChange={(e) => setFilterSceneQuery(e.target.value)}
              placeholder="キーワード"
              style={s.input}
              autoComplete="off"
            />
          </div>
        </div>
        {filteredRecords.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredRecords.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpenRecord(r)}
                style={{
                  ...s.card,
                  marginBottom: 0,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  border: "2px solid #e0eae0",
                  fontFamily: "inherit",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#2a3a2a" }}>
                    {r.childName || "（児童名未記入）"}
                  </div>
                  <div style={{ fontSize: 11, color: "#7a8a7a" }}>
                    {formatJaDateTime(r.createdAt)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#5a6a5a", marginTop: 4 }}>
                  {r.disability} · {r.age}
                  {r.authorName ? ` · ${r.authorName}` : ""}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#4a5a4a",
                    marginTop: 6,
                    lineHeight: 1.45,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {r.supportScene || r.aiSummary || "（場面未記入）"}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#7a8a7a" }}>
            {totalCount === 0
              ? "まだ保存された事例がありません。"
              : "条件に一致する事例がありません。"}
          </p>
        )}
        <button
          type="button"
          onClick={onNewRecord}
          style={{
            ...s.btn,
            width: "100%",
            marginTop: 12,
            background: "#fafcfa",
            color: "#2d5a3d",
            border: "2px solid #c8e0cc",
          }}
        >
          新規入力を開始
        </button>
      </div>
    </div>
  );
}
