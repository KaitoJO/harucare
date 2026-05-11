import { createClient } from "@supabase/supabase-js";

export function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

/** @returns {import('@supabase/supabase-js').SupabaseClient | null} */
export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  const url = import.meta.env.VITE_SUPABASE_URL.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY.trim();
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
