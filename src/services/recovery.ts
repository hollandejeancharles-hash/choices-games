import { supabaseUrl, supabaseKey } from "./supabase-config";
export const recoveryRedirect =
  "https://hollandejeancharles-hash.github.io/choices-games/?recovery=1";
export function parseRecovery(hash: string) {
  const values = new URLSearchParams(hash.replace(/^#/, ""));
  return values.get("type") === "recovery" && !values.has("error")
    ? values.get("access_token") || ""
    : "";
}
// Admin recovery is deliberately scoped to its explicit callback. Player
// recovery uses the same Supabase flow but is handled by playerAuth instead.
const adminRecoveryRequested =
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).get("recovery") === "1";
export const recoveryLanding = adminRecoveryRequested;
let recoveryAccess =
  adminRecoveryRequested && typeof location !== "undefined"
    ? parseRecovery(location.hash)
    : "";
if (recoveryLanding && location.hash) {
  history.replaceState(null, "", location.pathname + "?recovery=1");
}
export function hasRecoveryAccess() {
  return Boolean(recoveryAccess);
}
export function clearRecovery() {
  recoveryAccess = "";
}
async function authRequest(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "rate-limit"
        : response.status === 401 || response.status === 403
          ? "expired"
          : "failed",
    );
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export async function requestRecovery(email: string) {
  await authRequest(
    `/auth/v1/recover?redirect_to=${encodeURIComponent(recoveryRedirect)}`,
    "POST",
    { email: email.trim() },
  );
}
export async function updateRecoveredPassword(password: string) {
  if (!recoveryAccess) throw new Error("expired");
  const allowed = await authRequest(
    "/rest/v1/rpc/is_dilemma_admin",
    "POST",
    {},
    recoveryAccess,
  );
  if (allowed !== true) throw new Error("expired");
  await authRequest("/auth/v1/user", "PUT", { password }, recoveryAccess);
  const token = recoveryAccess;
  clearRecovery();
  // Best effort logout after the password change; never mask a successful update.
  await authRequest("/auth/v1/logout?scope=global", "POST", {}, token).catch(
    () => {},
  );
}
