const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
export const supabaseUrl =
  env.VITE_SUPABASE_URL || "https://xkutdvtqjtamjpjbwhme.supabase.co";
export const supabaseKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_ywBuI1yvddZoATFoh5e4LA_ajZqrRKe";
