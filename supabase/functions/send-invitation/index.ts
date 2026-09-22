import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const appUrl = "https://hollandejeancharles-hash.github.io/choices-games/";
const cors = {
  "Access-Control-Allow-Origin": new URL(appUrl).origin,
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};
Deno.serve(async (req: Request) => {
  const reply = (status: number, body: object) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method-not-allowed" });
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return reply(401, { error: "sign-in-required" });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user?.email_confirmed_at)
    return reply(401, { error: "sign-in-required" });
  const apiKey = Deno.env.get("RESEND_API_KEY"),
    from = Deno.env.get("INVITATION_FROM");
  if (!apiKey || !from) return reply(503, { error: "email-not-configured" });
  let id: string;
  try {
    ({ id } = await req.json());
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
      throw new Error();
  } catch {
    return reply(400, { error: "invalid-request" });
  }
  const { data: invitation, error } = await admin.rpc(
    "claim_dilemma_invitation_email",
    { p_id: id, p_sender: user.id },
  );
  if (error)
    return reply(error.message.includes("rate-limit") ? 429 : 403, {
      error: "invitation-unavailable-or-rate-limited",
    });
  let sent = false;
  try {
    const link =
      appUrl + "?account=1&invite=" + encodeURIComponent(invitation.token);
    const subject =
      invitation.kind === "circle"
        ? "Rejoins un cercle sur Dilemme"
        : "Une invitation à devenir amis sur Dilemme";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "dilemme-invite/" + invitation.attempt,
      },
      body: JSON.stringify({
        from,
        to: [invitation.email],
        subject,
        text:
          subject +
          ".\n\nAccepte l’invitation en te connectant ou en créant un compte avec cette adresse :\n" +
          link +
          "\n\nCe lien est valable 14 jours après sa création. Si tu ne souhaites pas accepter, tu peux ignorer cet e-mail.",
      }),
      signal: AbortSignal.timeout(15000),
    });
    sent = response.ok;
  } catch {
    /* Do not expose recipient or provider credentials in logs. */
  }
  const { error: saveError } = await admin.rpc(
    "finish_dilemma_invitation_email",
    { p_id: id, p_attempt: invitation.attempt, p_sent: sent },
  );
  if (saveError) return reply(503, { error: "delivery-status-unavailable" });
  return reply(
    sent ? 200 : 502,
    sent ? { sent: true } : { error: "email-not-sent" },
  );
});
