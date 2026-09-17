import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseKey } from "./supabase-config";
// Publishable browser key; privileges are enforced by RPCs and database grants.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
