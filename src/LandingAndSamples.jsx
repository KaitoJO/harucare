import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { SAMPLE_PLANS } from "./samplePlansData.js";

// HaruCare ブランドカラー
const BRAND_GREEN = "#2d5a3d";
const BRAND_GREEN_DARK = "#1e4129";
const BRAND_BG = "#f4f7f4";
const TEXT_DARK = "#1a2a1a";
const TEXT_SUB = "#4a5a4a";

const baseFont = "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif";

function navigateTo(hash) {
  // hash 遷移：'' (landing) / 'sample-plans' / 'app'
  if (hash) {
    window.location.hash = hash;
  } else if (window.location.hash) {
    // landing に戻す
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    // hashchange イベントを手動で発火
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

// ============================================================================
// LandingFV：パターンA（差別化フォーカス型）のファーストビュー
// ============================================================================
export function LandingFV() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND_BG,
        fontFamily: baseFont,
        color: TEXT_DARK,
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e0eae0",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: BRAND_GREEN,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          🌱
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#2a3a2a",
              lineHeight: 1.2,
            }}
          >
            HaruCare
          </div>
          <div style={{ fontSize: 10, color: "#7a8a7a", lineHeight: 1.2 }}>
            障害児通所施設向けAI個別支援計画
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => navigateTo("sample-plans")}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              background: "transparent",
              color: BRAND_GREEN,
              border: `2px solid ${BRAND_GREEN}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            サンプルを見る
          </button>
          <button
            type="button"
            onClick={() => navigateTo("app")}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              background: BRAND_GREEN,
              color: "#fff",
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            14日間 無料で試す
          </button>
        </div>
      </header>

      {/* ヒーローセクション（パターンA：差別化フォーカス型） */}
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "56px 20px 40px",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 999,
            background: "#e8f2eb",
            color: BRAND_GREEN_DARK,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
            marginBottom: 18,
          }}
        >
          日本で唯一の「なぜ」を書けるAI支援計画ツール
        </div>

        <h1
          style={{
            fontSize: "clamp(28px, 5.2vw, 48px)",
            lineHeight: 1.25,
            fontWeight: 800,
            color: TEXT_DARK,
            margin: "0 0 22px",
            letterSpacing: "0.01em",
          }}
        >
          個別支援計画を、AIが
          <span
            style={{
              color: BRAND_GREEN,
              background:
                "linear-gradient(transparent 60%, #fff2a8 60%, #fff2a8 92%, transparent 92%)",
              padding: "0 4px",
              whiteSpace: "nowrap",
            }}
          >
            "理由ごと"
          </span>
          書いてくれる。
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 2.1vw, 18px)",
            lineHeight: 1.85,
            color: TEXT_SUB,
            margin: "0 0 36px",
            maxWidth: 760,
          }}
        >
          テンプレートに空欄を渡すだけのツールから、もう卒業しませんか。
          <br />
          「なぜこの目標か」「なぜこの支援か」の根拠まで自動生成する、
          <br />
          日本で唯一の障害児通所施設向けAI支援計画ツールです。
        </p>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            onClick={() => navigateTo("app")}
            style={{
              padding: "16px 28px",
              borderRadius: 12,
              background: BRAND_GREEN,
              color: "#fff",
              border: "none",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 6px 16px rgba(45,90,61,0.25)",
              letterSpacing: "0.02em",
            }}
          >
            14日間 無料で試す（クレジットカード不要）
          </button>
          <button
            type="button"
            onClick={() => navigateTo("sample-plans")}
            style={{
              padding: "14px 22px",
              borderRadius: 12,
              background: "transparent",
              color: BRAND_GREEN,
              border: `2px solid ${BRAND_GREEN}`,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            AIが書いたサンプル計画書を見る ↓
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#7a8a7a",
            marginTop: 6,
          }}
        >
          ※既存のテンプレート型ツール（カイポケ・ほのぼの等）からの乗り換えにも対応。
        </div>
      </section>

      {/* なぜ HaruCare か（差別化の3軸） */}
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "16px 20px 56px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              title: "「なぜ」が書かれている",
              body: "目標・支援内容のすべてに「（理由：〜）」が併記されます。行政の実地指導で根拠を即答できる粒度。",
            },
            {
              title: "熟練支援員の暗黙知をAI化",
              body: "障害種別ごとの支援原理（ASD・ADHD・知的・脳性麻痺など）を体系化。新人サビ管でも熟練水準。",
            },
            {
              title: "テンプレ型では出せない深さ",
              body: "空欄を埋めるだけのツールとは違い、本児の固有情報を踏まえた個別根拠を毎回生成します。",
            },
          ].map((it) => (
            <div
              key={it.title}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 22,
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                borderTop: `3px solid ${BRAND_GREEN}`,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: BRAND_GREEN_DARK,
                  marginBottom: 10,
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.8,
                  color: TEXT_SUB,
                }}
              >
                {it.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* セカンダリ CTA */}
      <section
        style={{
          background: "#fff",
          borderTop: "1px solid #e0eae0",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: TEXT_DARK,
              marginBottom: 10,
            }}
          >
            まずはAIが書いた計画書を見てみませんか
          </div>
          <div
            style={{
              fontSize: 13,
              color: TEXT_SUB,
              marginBottom: 22,
              lineHeight: 1.8,
            }}
          >
            自閉スペクトラム症・ADHD・知的障害の3種類のサンプルをご用意しました。
            <br />
            「なぜこの目標を選んだか」まで書かれた、HaruCareの計画書の実物をご確認いただけます。
          </div>
          <button
            type="button"
            onClick={() => navigateTo("sample-plans")}
            style={{
              padding: "14px 28px",
              borderRadius: 12,
              background: BRAND_GREEN,
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            サンプル計画書を見る →
          </button>
        </div>
      </section>

      {/* フッター */}
      <footer
        style={{
          padding: "24px 20px 40px",
          textAlign: "center",
          fontSize: 11,
          color: "#7a8a7a",
        }}
      >
        © HaruCare（ハルケア）｜障害児通所施設向けAI個別支援計画サービス
      </footer>
    </div>
  );
}

// ============================================================================
// SamplePlansPage：3障害タブ切替のサンプル計画書公開ページ
// ============================================================================
export function SamplePlansPage() {
  const [activeId, setActiveId] = useState(SAMPLE_PLANS[0].id);
  const active =
    SAMPLE_PLANS.find((p) => p.id === activeId) || SAMPLE_PLANS[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND_BG,
        fontFamily: baseFont,
        color: TEXT_DARK,
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e0eae0",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigateTo("")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: "#4a5a4a",
            marginRight: 2,
            padding: "4px 8px",
          }}
          aria-label="トップに戻る"
        >
          ←
        </button>
        <div
          style={{
            width: 30,
            height: 30,
            background: BRAND_GREEN,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          🌱
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#2a3a2a",
              lineHeight: 1.2,
            }}
          >
            HaruCare
          </div>
          <div style={{ fontSize: 10, color: "#7a8a7a", lineHeight: 1.2 }}>
            AIが書いたサンプル計画書
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigateTo("app")}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: 20,
            background: BRAND_GREEN,
            color: "#fff",
            border: "none",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          14日間 無料で試す
        </button>
      </header>

      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "28px 16px 80px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(22px, 3.6vw, 30px)",
            fontWeight: 800,
            color: TEXT_DARK,
            margin: "0 0 8px",
            lineHeight: 1.3,
          }}
        >
          AIが書いた個別支援計画書サンプル
        </h1>
        <p
          style={{
            fontSize: 13,
            color: TEXT_SUB,
            lineHeight: 1.85,
            margin: "0 0 24px",
          }}
        >
          下記は、HaruCareのAIが生成した個別支援計画書のサンプルです。
          <br />
          各目標・各支援内容に <strong>「なぜそれを選んだか」の根拠</strong>{" "}
          が併記されているのがHaruCareの特徴です。
        </p>

        {/* タブ切替UI */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 14,
            borderBottom: "2px solid #e0eae0",
          }}
          role="tablist"
        >
          {SAMPLE_PLANS.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                type="button"
                key={p.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(p.id)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px 10px 0 0",
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? BRAND_GREEN_DARK : "#5a6a5a",
                  border: isActive ? "2px solid #e0eae0" : "2px solid transparent",
                  borderBottom: isActive ? "2px solid #fff" : "2px solid transparent",
                  marginBottom: -2,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {p.tabLabel}
              </button>
            );
          })}
        </div>

        {/* サンプル本文 */}
        <article
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: "26px 22px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            lineHeight: 1.85,
            color: TEXT_DARK,
          }}
          className="program-md"
        >
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>
            {active.markdown}
          </ReactMarkdown>
        </article>

        {/* 下部CTA */}
        <div
          style={{
            marginTop: 32,
            padding: "28px 22px",
            background: "#fff",
            borderRadius: 14,
            textAlign: "center",
            border: `2px solid ${BRAND_GREEN}`,
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: TEXT_DARK,
              marginBottom: 8,
            }}
          >
            この粒度の計画書が、貴施設の利用者ごとに自動生成されます
          </div>
          <div
            style={{
              fontSize: 13,
              color: TEXT_SUB,
              marginBottom: 20,
              lineHeight: 1.8,
            }}
          >
            14日間、すべての機能を無料でお試しいただけます。クレジットカード登録は不要です。
          </div>
          <button
            type="button"
            onClick={() => navigateTo("app")}
            style={{
              padding: "16px 32px",
              borderRadius: 12,
              background: BRAND_GREEN,
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 6px 16px rgba(45,90,61,0.25)",
            }}
          >
            14日間 無料で試す（クレジットカード不要）
          </button>
        </div>
      </div>
    </div>
  );
}
