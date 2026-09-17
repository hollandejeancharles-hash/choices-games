import { createClient } from "@supabase/supabase-js";
const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
const url = env.VITE_SUPABASE_URL || "https://xkutdvtqjtamjpjbwhme.supabase.co";
const key =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_ywBuI1yvddZoATFoh5e4LA_ajZqrRKe";
// Publishable browser key; privileges are enforced by RPCs and database grants.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
