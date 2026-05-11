import { useState } from "react";

export default function AuthScreen({ supabase, cardStyle, inputStyle, btnStyle }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!supabase || busy) return;
    setMessage(null);
    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      setMessage({ type: "err", text: "メールアドレスとパスワードを入力してください。" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: em, password: pw });
        if (error) throw error;
        setMessage({
          type: "ok",
          text: "登録メールを送信しました。メール内のリンクを確認するか、確認をオフにしている場合はそのままログインできます。",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7f4",
        fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif",
        padding: "24px 16px 48px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#2a3a2a" }}>HaruCare AI</div>
          <div style={{ fontSize: 12, color: "#7a8a7a", marginTop: 4 }}>
            施設アカウントでログインしてください
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              border: mode === "login" ? "2px solid #2d5a3d" : "2px solid #c8e0cc",
              background: mode === "login" ? "#2d5a3d" : "#fafcfa",
              color: mode === "login" ? "#fff" : "#2d5a3d",
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              border: mode === "signup" ? "2px solid #2d5a3d" : "2px solid #c8e0cc",
              background: mode === "signup" ? "#2d5a3d" : "#fafcfa",
              color: mode === "signup" ? "#fff" : "#2d5a3d",
            }}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={onSubmit} style={cardStyle}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.12em", color: "#7a8a7a", marginBottom: 6 }}>
            EMAIL
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: 14 }}
          />
          <label style={{ display: "block", fontSize: 10, letterSpacing: "0.12em", color: "#7a8a7a", marginBottom: 6 }}>
            PASSWORD
          </label>
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: 16 }}
          />
          {message && (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.55,
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: message.type === "ok" ? "#f0f7f2" : "#fff5f5",
                border: message.type === "ok" ? "1px solid #c8e0cc" : "1px solid #f0c0c0",
                color: message.type === "ok" ? "#2a4a3a" : "#a03030",
              }}
            >
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            style={{
              ...btnStyle,
              opacity: busy ? 0.65 : 1,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "処理中…" : mode === "signup" ? "アカウントを作成" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
