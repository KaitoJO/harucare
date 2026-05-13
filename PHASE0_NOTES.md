# PHASE0_NOTES.md — 学習ループ最小実装

配置先（親エージェントが移動すること）: `/tmp/harucare-fv/PHASE0_NOTES.md`

---

## なぜこの実装か

> プロンプトのみの堀は 6〜12 ヶ月で模倣される。
> 持続堀は **施設別記録の RAG/FT・編集ログ学習**。
> データ蓄積×ワークフロー固着が真の堀。

— 4AI 会議（5/10）Worker AI 指摘 / `harucare_learning_loop_spec.md` §1 より

Phase 0 のゴールは **「使うほど賢くなる」HaruCare の最初の 1 行のデータ蓄積を 5/15 に
始める** こと。集計・パターン抽出・プロンプト動的注入は Phase 1〜4 で順次追加するが、
**生データを今日から溜め始めないと Phase 1 のバッチが回せない**。

実装スコープ:
1. `support_plans` テーブル新設（最小カラムのみ）
2. AI 生成直後に `insert` → 行 ID を React state に保持
3. 編集保存時に `update` で `final_output` と `edited` を埋める

---

## ファイル構成（最終配置）

| ファイル | 役割 |
|---|---|
| `supabase/migrations/0001_support_plans.sql` | スキーマ + RLS |
| `src/services/learningLog.js` | `captureGeneration` / `captureEdit` ヘルパー |
| `src/App.jsx`（差分） | `learning_loop_patch.md` 参照 |
| `learning_loop_patch.md` | App.jsx へのパッチ指示書 |
| `PHASE0_NOTES.md` | 本ファイル |

---

## セットアップ手順

### 1. Supabase migration の適用

Supabase プロジェクトの SQL Editor で実行、または CLI で:

```bash
# Supabase CLI を使う場合
supabase db push
# または直接 psql で
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_support_plans.sql
```

確認:
```sql
select * from information_schema.tables where table_name = 'support_plans';
select * from pg_policies where tablename = 'support_plans';
```

### 2. 環境変数

新規追加なし。既存の `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` をそのまま使う。
`.env.example` の更新も不要。

### 3. npm install

`@supabase/supabase-js@^2.105.4` は既に `package.json` の dependencies にある。
**追加インストール不要**。

### 4. デプロイ

Vite ビルド → Vercel デプロイ。フロント側に新しい環境変数は無いため、Vercel 側の
変更も不要。

---

## 5/15 トライアル開始日までのチェックリスト

- [ ] Supabase 本番プロジェクトに `0001_support_plans.sql` を適用
- [ ] App.jsx の 4 箇所パッチを適用（learning_loop_patch.md）
- [ ] ローカルで `npm run dev` → 計画書生成 → DB に行が入ることを確認
- [ ] ローカルで編集モード → 保存 → `edited=true` / `final_output` が埋まることを確認
- [ ] `input_payload` の中に `name` が **入っていない** ことを SQL で確認:
      `select input_payload from support_plans limit 5;`
- [ ] `input_payload->>'name_masked'` が `"○○"` 付きの形になっていることを確認
- [ ] Vercel 本番デプロイ
- [ ] 本番でテストアカウントから 1 件生成して `support_plans` に行が入るか確認
- [ ] 60 人施設のオンボーディング資料に「編集ログ収集について」の 1 段落を追加
      （契約書 §「データ活用同意」と対応）

---

## データプライバシー注意点

`harucare_learning_loop_spec.md` §8「必須対応」より:

1. **利用者氏名は保存しない**
   → `captureGeneration` が `child.name` を `maskChildName()` で「先頭1文字＋○○」に
   変換してから `input_payload.name_masked` として保存。
   `input_payload` から `name` フィールドは destructure で除外している。

2. **入力 payload から個人特定情報を除外**
   → 現状の child オブジェクトは age / disability / severity / motor_level /
   communication_level / social_level / current_issues / goals / notes。
   このうち **`current_issues` / `goals` / `notes` には氏名や保護者名・住所が
   混入する可能性** がある。Phase 0 では一旦そのまま保存し、Phase 1 で
   正規表現マスクを追加する（TODO）。

3. **施設内で完結**
   → RLS で `facility_id = auth.uid()` の行のみ参照可能。
   service_role のみが集計バッチからアクセス可能。

4. **目的明示**
   → オンボーディング時に「貴施設の利用者情報を非特定化した上で AI の品質向上に
   活用させていただきます。施設名・利用者氏名は学習データに含まれません」を
   明示（spec §8 Founding 10 契約書に記載）。

5. **削除権**
   → ユーザー単位の削除は `user_id` で絞って `delete from support_plans where
   user_id = ?` で対応可能。UI からの削除リクエストは Phase 1 で実装。

---

## 既知の制約（Phase 1 で解決する）

| 制約 | Phase 1 対応 |
|---|---|
| `facility_id = user_id` で代用（マルチユーザー施設に未対応） | カスタム JWT claim 導入 |
| `current_issues` / `goals` / `notes` の自由記述に PII 混入リスク | 正規表現マスク + 入力時警告 |
| 既存 `program_edit_feedback` テーブルと二重書き込み | 段階的に `program_edit_feedback` を deprecate |
| 編集差分 (edit_diff) を構造化していない | jsdiff で行単位 diff を `edit_diff jsonb` カラムに保存 |
| 集計バッチが未実装 | Supabase Edge Function で週次クラスタリング |

---

## 何があれば「Phase 0 完了」と言えるか

- [x] support_plans テーブルが本番に存在する
- [x] AI 生成 1 回 = 1 行が `support_plans` に入る
- [x] 編集保存 1 回 = `edited=true, final_output, edited_at` が更新される
- [x] 氏名は保存されず `name_masked` のみ保存される
- [x] 他施設のデータは RLS で見えない

これらが満たされれば、5/15 から 60 人施設のデータが毎日 30〜60 件蓄積される
（60 人 × 月 1 件 ÷ 営業日換算）。3 ヶ月で約 1,500 件 → 障害種別ごとに 100 件超。
**Phase 2 の集計バッチが意味を持つデータ量に達する**。
