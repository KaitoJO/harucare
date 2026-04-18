import { useState } from "react";

const DISABILITY_TYPES = ["自閉スペクトラム症", "ダウン症", "脳性麻痺", "発達遅滞", "ADHD", "重症心身障害", "言語障害", "学習障害（LD）", "医療的ケア児", "その他"];
const AGE_OPTIONS = ["1歳", "2歳", "3歳", "4歳", "5歳", "6歳"];
const LEVELS = ["低", "中", "高"];
const SEVERITY = ["軽度", "中度", "重度"];

const PROGRAMS = {
  "自閉スペクトラム症": (f) => `■ 総合アセスメント
${f.name}は${f.age}の自閉スペクトラム症（${f.severity}）のお子さまです。コミュニケーション面（${f.communicationLevel}）と社会性（${f.socialLevel}）に課題がある一方、視覚的な情報処理や特定分野への集中力に強みを持つことが多く見られます。${f.currentIssues ? `現在の課題として「${f.currentIssues}」が挙げられており、重点的に対応します。` : ""}

■ 半年間の目標
1. 運動・身体面（現レベル：${f.motorLevel}）→ 体幹バランスの向上と集団での運動参加を広げる。
2. コミュニケーション面（現レベル：${f.communicationLevel}）→ 絵カードやジェスチャーで要求・拒否を伝えられるようにする。
3. 社会性・生活面（現レベル：${f.socialLevel}）→ 1対1から2〜3人の小グループ活動に慣れる。

■ 月別プログラム概要
1ヶ月目：環境に慣れる・信頼関係の構築
2ヶ月目：個別活動の中でルーティンを作る
3ヶ月目：視覚支援ツール（絵カード等）の導入
4ヶ月目：小グループ活動への参加を少しずつ試みる
5ヶ月目：要求・拒否の表現を日常場面で練習
6ヶ月目：成果の振り返りと次期プログラムの設計

■ 具体的な支援活動（週3回）
【運動】トランポリン・バランスボードを使った感覚統合遊び／音楽に合わせたリズム体操／サーキット運動
【コミュニケーション】絵カードで要求する練習／指さし・発声の促し／1対1での絵本読み聞かせ
【社会性】並行遊びから関わりを広げる／簡単なゲームを職員と体験／朝の会・帰りの会への参加

■ 家庭との連携ポイント
・家庭でも同じ絵カードを使い要求の場面を統一する
・「できたこと」を毎日1つ共有し自己肯定感を育てる
・感覚過敏があれば詳しく教えてもらい個別対応する`,

  "ダウン症": (f) => `■ 総合アセスメント
${f.name}は${f.age}のダウン症（${f.severity}）のお子さまです。人懐っこさや模倣力を生かしながら、運動（${f.motorLevel}）と言語発達（${f.communicationLevel}）の両面から働きかけます。${f.currentIssues ? `現在「${f.currentIssues}」という課題があり重点的に取り組みます。` : ""}

■ 半年間の目標
1. 運動・身体面（現レベル：${f.motorLevel}）→ 全身の筋緊張を高める運動習慣を定着させる。
2. コミュニケーション面（現レベル：${f.communicationLevel}）→ 二語文の表現を増やす。
3. 社会性・生活面（現レベル：${f.socialLevel}）→ 食事・着脱など身辺自立を丁寧に進める。

■ 月別プログラム概要
1ヶ月目：好きな遊びの把握・信頼関係の構築
2ヶ月目：粗大運動の強化開始
3ヶ月目：言葉のやりとりを増やす遊びの導入
4ヶ月目：身辺自立の個別練習
5ヶ月目：集団活動での役割参加を試みる
6ヶ月目：成果の振り返りと次期プログラムの設計

■ 具体的な支援活動（週3回）
【運動】階段の昇降練習／ボール蹴りで下肢筋力を鍛える／バランスディスクでの体幹トレーニング
【コミュニケーション】絵本の読み聞かせと問いかけ／手遊び歌でリズムと言葉を楽しむ／写真カードを使った練習
【社会性】スプーン・フォークの持ち方練習／着替えの手順を視覚化／「どうぞ」「ありがとう」の場面設定

■ 家庭との連携ポイント
・身辺自立は家庭と園で同じ手順を使い統一する
・「できた！」の成功体験を積み重ねてほめる
・PT・OTなど専門家との情報共有を定期的に行う`,

  "ADHD": (f) => `■ 総合アセスメント
${f.name}は${f.age}のADHD（${f.severity}）のお子さまです。好奇心旺盛でエネルギッシュな面を強みとしつつ、注意の持続や衝動性のコントロールに課題があります。${f.currentIssues ? `「${f.currentIssues}」という課題に重点的に取り組みます。` : ""}

■ 半年間の目標
1. 運動・身体面（現レベル：${f.motorLevel}）→ エネルギーを発散できる運動習慣をつけ切り替えをスムーズにする。
2. コミュニケーション面（現レベル：${f.communicationLevel}）→ 人の話を最後まで聞く力と気持ちを言葉で伝える力を育てる。
3. 社会性・生活面（現レベル：${f.socialLevel}）→ ルールのある遊びで待つ・交代するを楽しく体験する。

■ 月別プログラム概要
1ヶ月目：得意・苦手の把握・信頼関係の構築
2ヶ月目：活動の構造化（始まり・終わりの明示）の徹底
3ヶ月目：衝動性の自己コントロールスキルの導入
4ヶ月目：グループ活動でのルール体験を増やす
5ヶ月目：自分の気持ちを言葉にするソーシャルスキル練習
6ヶ月目：成果の振り返りと次期プログラム設計

■ 具体的な支援活動（週3回）
【運動】活動前に体を動かす時間（10〜15分）／障害物コースや的当て遊び／ヨガ・ストレッチ
【コミュニケーション】「聞く・話す」を交互にするゲーム／感情カードで気持ちを伝える練習／毎日の出来事を話す習慣
【社会性】ボードゲームで順番待ちを練習／トラブル場面のロールプレイ／できたカードで自己評価

■ 家庭との連携ポイント
・叱るより「できた」に注目する声かけを心がける
・就寝・食事などのルーティンを一定に保つ
・「動いていい時間」「静かにする時間」のメリハリを設ける`,

  "default": (f) => `■ 総合アセスメント
${f.name}は${f.age}の${f.disability}（${f.severity}）のお子さまです。現在の発達レベルは運動${f.motorLevel}・コミュニケーション${f.communicationLevel}・社会性${f.socialLevel}です。${f.currentIssues ? `「${f.currentIssues}」という課題に重点的に取り組みます。` : ""}半年間はスモールステップを大切にしながら着実に積み重ねます。

■ 半年間の目標
1. 運動・身体面（現レベル：${f.motorLevel}）→ 体を使った遊びを通じて運動能力と身体意識を高める。
2. コミュニケーション面（現レベル：${f.communicationLevel}）→ 大人とのやりとりを楽しみながら表現の幅を広げる。
3. 社会性・生活面（現レベル：${f.socialLevel}）→ 生活習慣の自立と友達との簡単なやりとりができるようにする。

■ 月別プログラム概要
1ヶ月目：発達段階の把握と課題設定
2ヶ月目：好きな遊びを通じた関係性づくり
3ヶ月目：言葉のやりとりと手先の操作活動の充実
4ヶ月目：生活習慣の個別練習
5ヶ月目：小グループでのやりとり遊び
6ヶ月目：成果の振り返りと次期プログラム設計

■ 具体的な支援活動（週3回）
【運動】粘土・ビーズ通しなど手指を使う遊び／全身運動／リズム体操
【コミュニケーション】絵本の読み聞かせ／挨拶の場面練習／ごっこ遊び
【社会性】着替えの練習／給食の配膳など役割のある活動／交代こしょの遊び

■ 家庭との連携ポイント
・家庭での「できること」を毎週共有し強みを伸ばす
・語りかけはゆっくり・短く・繰り返しが基本
・できた時は大げさにほめて自信をつける`,
};

const generateProgram = (form) => {
  const gen = PROGRAMS[form.disability] || PROGRAMS["default"];
  return gen(form);
};

export default function App() {
  const [screen, setScreen] = useState("list");
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [generatedProgram, setGeneratedProgram] = useState("");
  const [form, setForm] = useState({
    name: "", age: "4歳", disability: "自閉スペクトラム症",
    severity: "中度", motorLevel: "中", communicationLevel: "低",
    socialLevel: "低", currentIssues: "", goals: "", notes: "",
  });

  const handleChange = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const saveChild = () => {
    if (!form.name) return;
    setChildren(c => [...c, { ...form, id: Date.now(), createdAt: new Date().toLocaleDateString("ja-JP"), programs: [] }]);
    setForm({ name: "", age: "4歳", disability: "自閉スペクトラム症", severity: "中度", motorLevel: "中", communicationLevel: "低", socialLevel: "低", currentIssues: "", goals: "", notes: "" });
    setScreen("list");
  };

  const handleGenerate = () => {
    setTimeout(() => { setGeneratedProgram(generateProgram(selectedChild)); setScreen("program"); }, 1500);
  };

  const s = {
    wrap: { minHeight: "100vh", background: "#f4f7f4", fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif" },
    header: { background: "#fff", borderBottom: "1px solid #e0eae0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 },
    body: { maxWidth: 560, margin: "0 auto", padding: "20px 16px 60px" },
    card: { background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 12 },
    label: { display: "block", fontSize: 10, letterSpacing: "0.12em", color: "#7a8a7a", marginBottom: 6, textTransform: "uppercase" },
    input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #e0eae0", fontSize: 14, color: "#2a3a2a", background: "#fafcfa", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    textarea: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #e0eae0", fontSize: 13, color: "#2a3a2a", background: "#fafcfa", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 },
    btn: { width: "100%", padding: "14px", borderRadius: 12, background: "#2d5a3d", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    btnGold: { width: "100%", padding: "14px", borderRadius: 12, background: "#c4972a", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    tag: (c) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c === "green" ? "#e8f2eb" : c === "gold" ? "#fdf3dc" : "#f0f0f0", color: c === "green" ? "#2d5a3d" : c === "gold" ? "#c4972a" : "#666" }),
  };

  const SelectField = ({ label, value, options, onChange }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{label}</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            style={{ padding: "6px 12px", borderRadius: 20, border: value === opt ? "2px solid #2d5a3d" : "2px solid #d8e4d8", background: value === opt ? "#2d5a3d" : "transparent", color: value === opt ? "#fff" : "#4a5a4a", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        {screen !== "list" && <button onClick={() => { setScreen(screen === "program" ? "detail" : "list"); setGeneratedProgram(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#4a5a4a", marginRight: 4 }}>←</button>}
        <div style={{ width: 32, height: 32, background: "#2d5a3d", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🌱</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2a3a2a" }}>HaruCare AI</div>
          <div style={{ fontSize: 10, color: "#8a9a8a" }}>個別発達支援プログラム管理</div>
        </div>
        {screen === "list" && <button onClick={() => setScreen("add")} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 20, background: "#2d5a3d", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>＋ 追加</button>}
      </div>

      <div style={s.body}>
        {screen === "list" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#2a3a2a", marginBottom: 4 }}>お子さま一覧</div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>{children.length}名登録中</div>
            </div>
            {children.length === 0 ? (
              <div style={{ ...s.card, textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2a3a2a", marginBottom: 6 }}>まだ登録がありません</div>
                <div style={{ fontSize: 12, color: "#7a8a7a", marginBottom: 20 }}>右上の「＋ 追加」から登録してください</div>
                <button onClick={() => setScreen("add")} style={{ ...s.btn, width: "auto", padding: "10px 24px" }}>登録する</button>
              </div>
            ) : children.map(child => (
              <div key={child.id} style={{ ...s.card, cursor: "pointer" }} onClick={() => { setSelectedChild(child); setScreen("detail"); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e8f2eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👦</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#2a3a2a", marginBottom: 4 }}>{child.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={s.tag("green")}>{child.age}</span>
                      <span style={s.tag("default")}>{child.disability}</span>
                      <span style={s.tag("gold")}>{child.severity}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0", display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 11, color: "#7a8a7a" }}>運動 <span style={{ color: "#2a3a2a", fontWeight: 700 }}>{child.motorLevel}</span></div>
                  <div style={{ fontSize: 11, color: "#7a8a7a" }}>コミュ <span style={{ color: "#2a3a2a", fontWeight: 700 }}>{child.communicationLevel}</span></div>
                  <div style={{ fontSize: 11, color: "#7a8a7a" }}>社会性 <span style={{ color: "#2a3a2a", fontWeight: 700 }}>{child.socialLevel}</span></div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{child.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "add" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#2a3a2a", marginBottom: 4 }}>お子さまを登録</div>
            </div>
            <div style={s.card}>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>お子さまの呼び名 *</label>
                <input value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="例：たろうくん" style={s.input} />
              </div>
              <SelectField label="年齢" value={form.age} options={AGE_OPTIONS} onChange={v => handleChange("age", v)} />
              <SelectField label="障害種別" value={form.disability} options={DISABILITY_TYPES} onChange={v => handleChange("disability", v)} />
              <SelectField label="重症度" value={form.severity} options={SEVERITY} onChange={v => handleChange("severity", v)} />
            </div>
            <div style={s.card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2d5a3d", marginBottom: 14 }}>現在の発達レベル</div>
              <SelectField label="運動・身体能力" value={form.motorLevel} options={LEVELS} onChange={v => handleChange("motorLevel", v)} />
              <SelectField label="コミュニケーション" value={form.communicationLevel} options={LEVELS} onChange={v => handleChange("communicationLevel", v)} />
              <SelectField label="社会性・対人関係" value={form.socialLevel} options={LEVELS} onChange={v => handleChange("socialLevel", v)} />
            </div>
            <div style={s.card}>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>現在の主な課題（任意）</label>
                <textarea value={form.currentIssues} onChange={e => handleChange("currentIssues", e.target.value)} placeholder="例：切り替えが難しい" rows={3} style={s.textarea} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>半年後の目標（任意）</label>
                <textarea value={form.goals} onChange={e => handleChange("goals", e.target.value)} placeholder="例：友達と遊べるようになってほしい" rows={3} style={s.textarea} />
              </div>
              <div>
                <label style={s.label}>備考（任意）</label>
                <textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} placeholder="例：感覚過敏あり" rows={2} style={s.textarea} />
              </div>
            </div>
            <button onClick={saveChild} disabled={!form.name} style={{ ...s.btn, opacity: form.name ? 1 : 0.5 }}>登録する</button>
          </div>
        )}

        {screen === "detail" && selectedChild && (
          <div>
            <div style={{ ...s.card, background: "#2d5a3d", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>👦</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedChild.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{selectedChild.age} · {selectedChild.disability} · {selectedChild.severity}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>運動</div><div style={{ fontSize: 16, fontWeight: 700 }}>{selectedChild.motorLevel}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>コミュ</div><div style={{ fontSize: 16, fontWeight: 700 }}>{selectedChild.communicationLevel}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>社会性</div><div style={{ fontSize: 16, fontWeight: 700 }}>{selectedChild.socialLevel}</div></div>
              </div>
            </div>
            {selectedChild.currentIssues && <div style={s.card}><label style={s.label}>現在の課題</label><div style={{ fontSize: 13, color: "#2a3a2a", lineHeight: 1.6 }}>{selectedChild.currentIssues}</div></div>}
            {selectedChild.notes && <div style={s.card}><label style={s.label}>備考</label><div style={{ fontSize: 13, color: "#2a3a2a", lineHeight: 1.6 }}>{selectedChild.notes}</div></div>}
            <button onClick={handleGenerate} style={s.btnGold}>🌿 6ヶ月プログラムを生成する</button>
          </div>
        )}

        {screen === "program" && selectedChild && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2a3a2a", marginBottom: 2 }}>{selectedChild.name}の個別支援プログラム</div>
              <div style={{ fontSize: 12, color: "#7a8a7a" }}>{selectedChild.age} · {selectedChild.disability}</div>
            </div>
            <div style={{ ...s.card, fontSize: 13, lineHeight: 2, color: "#2a3a2a", whiteSpace: "pre-wrap" }}>{generatedProgram}</div>
            <div style={{ padding: 14, borderRadius: 12, background: "#f0f7f2", border: "1px solid #c8e0cc", fontSize: 12, color: "#4a7a5a", lineHeight: 1.6, marginTop: 4 }}>
              ⚠️ このプログラムはAIによる提案です。専門家の判断を組み合わせてご活用ください。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
