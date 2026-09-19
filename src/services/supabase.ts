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

// Player identity intentionally uses a separate client: admin access stays
// tab-only, while a player's own session can safely survive a page reload.
export const playerAuth = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: "dilemma.player.auth.v1",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
