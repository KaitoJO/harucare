// 学習ループ Phase 0: 編集差分の最小キャプチャ用ヘルパー。
//
// 設計方針:
//   * fire-and-forget: 失敗してもユーザー体験は壊さない（throw しない・toast 出さない）。
//   * 既存 ./lib/workspaceDb.js のスタイルに合わせ、supabase クライアントは引数で受け取る。
//   * 利用者氏名 (child.name) は spec Section 8 の必須対応に従い、保存前にマスクする。
//
// 参考: /Users/joririka/ai-team/harucare_learning_loop_spec.md  Section 7 / Section 8

/**
 * 利用者氏名を「先頭1文字 + ○○」形式でマスクする。
 * 例: "山田太郎" -> "山○○"  /  "Aki" -> "A○○"  /  空文字 -> ""
 *
 * @param {unknown} name
 * @returns {string}
 */
export function maskChildName(name) {
  if (name == null) return "";
  const s = String(name).trim();
  if (!s) return "";
  // サロゲートペア対応のために Array.from で 1 文字を取り出す
  const chars = Array.from(s);
  return `${chars[0]}○○`;
}

/**
 * child オブジェクトから氏名をマスクした学習用 payload を作る。
 * 氏名以外の項目は spec の input_payload 定義に従ってそのまま残す。
 *
 * @param {Record<string, unknown>} child
 * @returns {Record<string, unknown>}
 */
function buildInputPayload(child) {
  if (!child || typeof child !== "object") return {};
  const { name, ...rest } = child;
  return {
    ...rest,
    name_masked: maskChildName(name),
  };
}

/**
 * AI 生成完了直後に呼び出す。support_plans に行を作り、id を返す。
 * 失敗時は warn だけ出して null を返す。
 *
 * @param {object} args
 * @param {import('@supabase/supabase-js').SupabaseClient | null} args.supabase
 * @param {Record<string, any>} args.child            アプリ内の selectedChild
 * @param {string} args.aiOutput                      Claude が返した初期生成テキスト
 * @param {string | null | undefined} args.facilityId 施設 ID（Phase 0 では user_id で代用可）
 * @param {string | null | undefined} args.userId     auth.users.id
 * @returns {Promise<string | null>} 作成された support_plans.id（失敗時 null）
 */
export async function captureGeneration({ supabase, child, aiOutput, facilityId, userId }) {
  if (!supabase) {
    console.warn("[learningLog] supabase client missing, skipping capture");
    return null;
  }
  if (!facilityId) {
    console.warn("[learningLog] facility_id missing, skipping capture");
    return null;
  }
  if (!child || !aiOutput) {
    console.warn("[learningLog] child/aiOutput missing, skipping capture");
    return null;
  }
  try {
    const payload = buildInputPayload(child);
    const { data, error } = await supabase
      .from("support_plans")
      .insert({
        facility_id: facilityId,
        user_id: userId || null,
        disability: child.disability ?? null,
        severity: child.severity ?? null,
        age: child.age ?? null,
        motor_level: child.motorLevel ?? null,
        communication_level: child.communicationLevel ?? null,
        social_level: child.socialLevel ?? null,
        input_payload: payload,
        ai_output: aiOutput,
        edited: false,
      })
      .select("id")
      .single();
    if (error) {
      console.warn("[learningLog] capture failed:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.warn("[learningLog] capture exception:", e?.message ?? e);
    return null;
  }
}

/**
 * ユーザーが編集して保存した瞬間に呼び出す。final_output と edited を更新する。
 * planId は captureGeneration が返した値。失敗しても何もしない。
 *
 * @param {object} args
 * @param {import('@supabase/supabase-js').SupabaseClient | null} args.supabase
 * @param {string | null | undefined} args.planId
 * @param {string} args.finalOutput
 * @returns {Promise<void>}
 */
export async function captureEdit({ supabase, planId, finalOutput }) {
  if (!supabase || !planId) return;
  try {
    const { error } = await supabase
      .from("support_plans")
      .update({
        final_output: finalOutput,
        edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq("id", planId);
    if (error) {
      console.warn("[learningLog] edit capture failed:", error.message);
    }
  } catch (e) {
    console.warn("[learningLog] edit capture exception:", e?.message ?? e);
  }
}
