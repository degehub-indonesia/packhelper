import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}

export interface AccessCode {
  id: string;
  code: string;
  label: string;
  created_at: string;
  first_used_by: string | null;
  first_used_at: string | null;
}
