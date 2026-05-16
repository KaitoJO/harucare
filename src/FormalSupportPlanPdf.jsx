const cellBd = {
  border: "1px solid #1a1a1a",
};

const tdBase = {
  ...cellBd,
  padding: "6px 8px",
  fontSize: 10.5,
  lineHeight: 1.55,
  verticalAlign: "top",
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
};

function SectionTitle({ children }) {
  return (
    <div
      style={{
        ...cellBd,
        background: "#e8ebe8",
        fontWeight: 700,
        fontSize: 10.8,
        padding: "6px 8px",
        marginBottom: 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * html2canvas 用・個別支援計画書レイアウト。
 * doc は {@link buildFormalPlanDocument} の戻り値。
 */
export function FormalSupportPlanPdfMount({ doc }) {
  const d = doc || {};
  const stm = Array.isArray(d.shortTermGoals) ? d.shortTermGoals : [];

  return (
    <div
      className="support-plan-pdf-root"
      style={{
        width: 800,
        maxWidth: 800,
        boxSizing: "border-box",
        padding: "8px 6px 14px",
        background: "#fff",
        color: "#111",
        fontFamily:
          "'Noto Sans JP', 'MS Mincho', 'Hiragino Mincho ProN', serif",
        fontSize: 10.6,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {d.titleLine || "個別支援計画書"}
        </div>
        <div style={{ fontSize: 9.2, color: "#333", marginTop: 6 }}>
          {d.footerNote}
        </div>
      </div>

      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          ...cellBd,
          borderCollapse: "collapse",
          width: "100%",
          marginBottom: 8,
        }}
      >
        <tbody>
          <tr>
            <th
              style={{
                ...tdBase,
                background: "#f2f5f2",
                width: "16%",
              }}
            >
              利用者氏名
            </th>
            <td style={{ ...tdBase, width: "44%" }}>
              {d.childName || "　　　　　　　　　　"}
              {"\n障害種別等："}
              {d.disabilityHint || "　　　　　　　　　　"}
            </td>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "14%" }}>
              作成日
            </th>
            <td style={{ ...tdBase, width: "26%" }}>
              {d.creationDateJp || "　　　　年　　月　　日"}
            </td>
          </tr>
          <tr>
            <th style={{ ...tdBase, background: "#f2f5f2" }}>生年月日</th>
            <td style={{ ...tdBase }}>
              {d.birthDateDisplay?.trim()
                ? d.birthDateDisplay
                : "　　　　　年　　　　月　　　　日"}
            </td>
            <th style={{ ...tdBase, background: "#f2f5f2" }}>満年齢</th>
            <td style={{ ...tdBase }}>{d.ageDisplay || ""}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ border: cellBd.border, marginBottom: 8 }}>
        <SectionTitle>
          （１）利用者及び家族の生活に対する意向並びに申告の内容、その他留意事項を踏まえたサービスが必要となる理由と目的
        </SectionTitle>
        <div style={{ ...tdBase, border: "none", minHeight: 56 }}>
          {d.familyIntentions}
        </div>
      </div>

      <div style={{ border: cellBd.border, marginBottom: 8 }}>
        <SectionTitle>
          （２）サービスにおいて総合的に目指すべき具体的なねらい及びサービスにおいて支援すべき項目等（総合的な支援の方針）
        </SectionTitle>
        <div style={{ ...tdBase, border: "none", minHeight: 52 }}>
          {d.comprehensiveSupportPolicy}
        </div>
      </div>

      <table
        cellPadding={0}
        cellSpacing={0}
        style={{
          borderCollapse: "collapse",
          width: "100%",
          ...cellBd,
          marginBottom: 8,
        }}
      >
        <tbody>
          <tr>
            <th rowSpan={2} style={{ ...tdBase, background: "#f2f5f2", width: "14%" }}>
              長期目標（内容・期間等）
            </th>
            <td style={{ ...tdBase, borderBottom: "none" }}>
              【内容】{d.longTermGoal?.content}
            </td>
          </tr>
          <tr>
            <td style={{ ...tdBase }}>
              【期間等】{d.longTermGoal?.period}
            </td>
          </tr>
          {[0, 1, 2].map((i) => {
            const row = stm[i];
            const content =
              row?.content ||
              "※短期的な到達項目を、アセスメントとAI出力に基づき具体的に記入してください。";
            const pd = row?.periodGuess || "計画開始から適宜見直す";
            return (
              <tr key={`stm-${i}`}>
                <th style={{ ...tdBase, background: "#f2f5f2" }}>
                  短期目標{i + 1}
                  {"\n"}
                  （内容・期間等）
                </th>
                <td style={{ ...tdBase }}>
                  【内容】{content}
                  {"\n"}
                  【期間等】{pd}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ border: cellBd.border, marginBottom: 8 }}>
        <SectionTitle>（３）支援の標準的な提供時間等（施設サービス）</SectionTitle>
        <div style={{ ...tdBase, border: "none", minHeight: 36 }}>
          {d.standardProvision}
        </div>
      </div>

      <div style={{ marginBottom: 4, fontWeight: 700 }}>
        （４）支援項目に応じた支援目標・具体的支援内容／優先順位
      </div>
      <table
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", width: "100%", marginBottom: 10 }}
      >
        <thead>
          <tr>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "12%" }}>
              項目区分
            </th>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "18%" }}>
              対象／領域
            </th>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "30%" }}>
              支援目標
            </th>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "31%" }}>
              支援内容（生活・運動／感覚・認知・言語／コミュニケーション・対人などの観点を含める）
            </th>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "9%" }}>順位</th>
          </tr>
        </thead>
        <tbody>
          {(d.domainRows || []).map((row, i) => (
            <tr key={`dr-${i}`}>
              <td style={{ ...tdBase }}>{row.category}</td>
              <td style={{ ...tdBase }}>{row.domain}</td>
              <td style={{ ...tdBase }}>{row.supportTarget}</td>
              <td style={{ ...tdBase }}>{row.supportContent}</td>
              <td style={{ ...tdBase }}>{row.priority}</td>
            </tr>
          ))}
          {d.transitionRow ? (
            <tr>
              <td style={{ ...tdBase }}>{d.transitionRow.category}</td>
              <td style={{ ...tdBase }}>{d.transitionRow.domain}</td>
              <td style={{ ...tdBase }}>{d.transitionRow.supportTarget}</td>
              <td style={{ ...tdBase }}>{d.transitionRow.supportContent}</td>
              <td style={{ ...tdBase }}>{d.transitionRow.priority}</td>
            </tr>
          ) : null}
          {d.cooperationRow ? (
            <tr>
              <td style={{ ...tdBase }}>{d.cooperationRow.category}</td>
              <td style={{ ...tdBase }}>{d.cooperationRow.domain}</td>
              <td style={{ ...tdBase }}>{d.cooperationRow.supportTarget}</td>
              <td style={{ ...tdBase }}>{d.cooperationRow.supportContent}</td>
              <td style={{ ...tdBase }}>{d.cooperationRow.priority}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <table
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
        <tbody>
          <tr>
            <th style={{ ...tdBase, background: "#f2f5f2", width: "28%" }}>
              児童発達支援管理責任者氏名
            </th>
            <td style={{ ...tdBase, minHeight: 40 }}>
              {d.managerName || "　　　　　　　　　　　　　　　　（署名・押印省略可・施設運用時に記載）"}
            </td>
          </tr>
          <tr>
            <th style={{ ...tdBase, background: "#f2f5f2" }}>
              保護者署名・説明済みの確認
            </th>
            <td style={{ ...tdBase, minHeight: 52 }}>
              {d.parentSignaturePlaceholder}
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          marginTop: 14,
          fontSize: 9,
          color: "#333",
          lineHeight: 1.5,
        }}
      >
        【留意】自動生成済みドラフトであり、サービス単位での内容確認と施設側の是正・追加記載後に公的に適合する状態に調整すること。
      </div>
    </div>
  );
}
