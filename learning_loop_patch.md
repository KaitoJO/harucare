# learning_loop_patch.md

学習ループ Phase 0 — `/tmp/harucare-fv/src/App.jsx` への差分パッチ指示書。

このパッチは「AI 生成完了直後に support_plans へ insert し、その id を編集保存時に
update する」最小実装。fire-and-forget なので UX を壊さない。

配置先（親エージェントが移動すること）:
- このファイル自身: `/tmp/harucare-fv/learning_loop_patch.md`
- 参照する helper: `/tmp/harucare-fv/src/services/learningLog.js`
- SQL migration: `/tmp/harucare-fv/supabase/migrations/0001_support_plans.sql`

---

## 前提: 既存コードベースで確認済の事実

| 項目 | 値 |
|---|---|
| supabase client | `getSupabase()` factory（`src/lib/supabaseClient.js`） |
| App.jsx 内 supabase 取得 | `const supabase = useMemo(() => getSupabase(), []);` （L1047） |
| AI 生成関数 | `requestProgramFromClaude(child, extraPlanPrompt)`（L1021） |
| 生成ハンドラ | `handleGenerate`（L1505） |
| 編集保存ハンドラ | `handleSaveEditFeedback`（L1532） |
| 編集前 AI 原文 state | `programAiOriginal`（L1061） |
| 編集後テキスト state | `generatedProgram`（L1058） |
| 選択中の子ども | `selectedChild` |
| セッション | `session?.user?.id` |
| @supabase/supabase-js | ^2.105.4 既に dependencies にあり、追加 npm install **不要** |

---

## パッチ 1: import 追加

**ファイル**: `src/App.jsx`
**位置**: L7 (`import * as workspaceDb from "./lib/workspaceDb.js";`) の直後

```diff
 import { getSupabase, isSupabaseConfigured } from "./lib/supabaseClient.js";
 import * as workspaceDb from "./lib/workspaceDb.js";
+import { captureGeneration, captureEdit } from "./services/learningLog.js";
 import AuthScreen from "./AuthScreen.jsx";
```

---

## パッチ 2: planLogId state 追加

**ファイル**: `src/App.jsx`
**位置**: L1063 (`const [programEditSnapshot, setProgramEditSnapshot] = useState("");`) の直後

```diff
   const [programEditMode, setProgramEditMode] = useState(false);
   const [programEditSnapshot, setProgramEditSnapshot] = useState("");
+  /** 学習ループ Phase 0: support_plans 行 ID（編集差分のキャプチャに利用） */
+  const [planLogId, setPlanLogId] = useState(null);
   const [loading, setLoading] = useState(false);
```

---

## パッチ 3: AI 生成完了直後にキャプチャ

**ファイル**: `src/App.jsx`
**位置**: `handleGenerate` 内、L1521-1523 周辺

```diff
   const handleGenerate = async () => {
     if (!selectedChild) return;
     if (!session?.user?.id) {
       setError("個別支援計画書を生成するにはログインが必要です。");
       return;
     }
     setError(null);
     setGeneratedProgram("");
     setGeneratedAtIso(null);
     setProgramAiOriginal("");
     setProgramEditMode(false);
     setProgramEditSnapshot("");
+    setPlanLogId(null);
     setLoading(true);
     setScreen("program");
     try {
       const text = await requestProgramFromClaude(selectedChild, planPromptExtra);
       setGeneratedProgram(text);
       setProgramAiOriginal(text);
       setGeneratedAtIso(new Date().toISOString());
+      // 学習ループ Phase 0: 生成直後に support_plans へキャプチャ。
+      // fire-and-forget なので await はするが、失敗しても UI は止めない。
+      // Phase 0 は 1 施設 = 1 アカウント想定で facility_id に user.id を流用。
+      const logId = await captureGeneration({
+        supabase,
+        child: selectedChild,
+        aiOutput: text,
+        facilityId: session.user.id,
+        userId: session.user.id,
+      });
+      setPlanLogId(logId);
     } catch (e) {
       setError(e instanceof Error ? e.message : String(e));
       setScreen("detail");
     } finally {
       setLoading(false);
     }
   };
```

---

## パッチ 4: 編集保存時にキャプチャ

**ファイル**: `src/App.jsx`
**位置**: `handleSaveEditFeedback` 内、L1532-1549

```diff
   const handleSaveEditFeedback = async () => {
     if (!selectedChild || !generatedProgram.trim()) return;
     if (!supabase || !session?.user?.id) return;
     const edited = generatedProgram.trim();
     const original = (programAiOriginal || "").trim() || edited;
     try {
       await workspaceDb.insertProgramEditFeedback(supabase, session.user.id, {
         original,
         edited,
         childName: selectedChild.name,
         date: new Date().toISOString(),
       });
       showSaveToast();
     } catch {
       /* 保存失敗しても編集モードは終了させる */
     }
+    // 学習ループ Phase 0: support_plans.final_output / edited を更新。
+    // 既存の program_edit_feedback への保存と二重で記録するが、
+    // support_plans 側は disability/severity/age タグ付きで集計しやすいため両方残す。
+    if (planLogId) {
+      await captureEdit({
+        supabase,
+        planId: planLogId,
+        finalOutput: edited,
+      });
+    }
     setProgramEditMode(false);
   };
```

---

## 補足: なぜ既存 `program_edit_feedback` テーブルでなく `support_plans` を新設するか

| 項目 | program_edit_feedback | support_plans (新規) |
|---|---|---|
| disability/severity/age タグ | なし | あり（集計の主軸） |
| input_payload (jsonb) | なし | あり（後で再構築可能） |
| ai_output / final_output | original / edited | ai_output / final_output（spec 名称に合わせる） |
| 集計効率 | 障害種別ごとに集計できない | spec §5 のクラスタリングがそのまま動く |

→ Phase 1 以降の集計バッチを書く前提では **support_plans が必須**。
Phase 0 では二重書き込みになるが、後方互換のため program_edit_feedback も残す。

---

## 補足: helper シグネチャの spec からの逸脱

spec では `import { supabase } from "./services/supabaseClient.js"` の singleton 想定だが、
**既存コードベースでは `getSupabase()` factory パターン** を採用している（`useMemo` で
キャッシュ）。
これに合わせて `captureGeneration` / `captureEdit` は **supabase を引数で受け取る**
形に変更。`src/lib/workspaceDb.js` の関数群と完全に同じスタイル。
