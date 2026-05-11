# Supabase セットアップ手順（HaruCare）

施設アカウント（メール＋パスワード）でログインし、子ども・保存済み計画書などをクラウドに保存するための手順です。

## 1. プロジェクトを作成

1. [Supabase](https://supabase.com/) にサインインし、「New project」でプロジェクトを作成します。
2. **Database password** は安全に保管してください（後から SQL を実行する際に使うことは通常ありません）。

## 2. API キーをアプリに設定

1. Supabase ダッシュボードで **Project Settings（歯車）→ API** を開きます。
2. **Project URL** をコピーし、ローカルの `.env` に次のように設定します。

   ```env
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   ```

3. **Project API keys** の **`anon` `public`** キーをコピーし、次を設定します。

   ```env
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

   `anon` キーはブラウザに埋め込まれますが、**Row Level Security（RLS）** により「ログインしたユーザー本人の行だけ」にアクセスが制限されます。

4. 開発サーバーを再起動します（`npm run dev`）。

## 3. データベーステーブルと RLS を作成

1. ダッシュボードで **SQL Editor** を開きます。
2. リポジトリ内の次のファイルの**全文**をコピーし、SQL Editor に貼り付けて **Run** します。

   `supabase/migrations/001_harucare_workspace.sql`

   これで `children`・`saved_programs`・`support_records`・`saved_support_diaries`・`saved_parent_contacts`・`plan_feedbacks`・`program_edit_feedback` が作成され、各テーブルに RLS が有効になります。

3. **既に 001 だけ実行済み**の場合は、続けて `supabase/migrations/002_saved_support_diaries_entry_date.sql` を実行してください（支援日誌の日付グループ用の `entry_date` 列）。

4. エラーが出た場合は、メッセージ全文を確認してください（既にテーブルがある場合は `DROP TABLE` が必要になることがあります。本番ではマイグレーション管理を推奨します）。

## 4. 認証（メール＋パスワード）の設定

1. **Authentication → Providers** で **Email** が有効になっていることを確認します。
2. 開発中にメール確認なしで試す場合: **Authentication → Providers → Email** で **Confirm email** をオフにできます（本番ではスパム対策のためオンにし、メールテンプレートを整えることを推奨します）。
3. **Authentication → URL Configuration** で、本番サイトの URL を **Site URL** に追加します（ローカルは `http://localhost:5173` がデフォルトで動くことが多いです）。

## 5. 動作確認

1. アプリを開き、「新規登録」で施設用のメールアドレスとパスワードを登録します。
2. ログイン後、子どもを登録し、一覧に表示されることを確認します。
3. ブラウザのサイトデータを消去して再度ログインし、**同じアカウントでデータが残っている**ことを確認します。

## 6. 本番（例: Vercel）へのデプロイ

1. Vercel のプロジェクト **Environment Variables** に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定します。
2. 再デプロイ後、Supabase の **Authentication → URL Configuration** に本番ドメインを **Site URL** / **Redirect URLs** に追加します。

## トラブルシューティング

| 現象 | 確認すること |
|------|----------------|
| ログイン直後に「permission denied」や RLS エラー | SQL が最後まで実行されているか、`auth.uid() = user_id` のポリシーがあるか |
| 新規登録後にログインできない | メール確認が必須になっていないか、受信トレイを確認 |
| テーブルが無いというエラー | `001_harucare_workspace.sql` を実行したか |

## セキュリティメモ

- **サービスロールキー（`service_role`）はフロントエンドに書かないでください。** サーバー専用です。
- 児童に関するデータは個人情報にあたります。**プロジェクトのアクセス権限**と**バックアップ方針**を施設の規程に合わせて管理してください。
