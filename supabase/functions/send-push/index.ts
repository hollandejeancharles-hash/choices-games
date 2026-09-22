import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import webpush from "npm:web-push@3.6.7";

const appUrl = "https://dilemme.app/";
const cors = {
  "Access-Control-Allow-Origin": new URL(appUrl).origin,
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
webpush.setVapidDetails(
  "mailto:notifications@dilemme.app",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  timezone: string;
  locale: "fr" | "en";
  preferred_hour: number;
  last_daily_day: string | null;
};

async function deliver(subscription: Subscription, payload: object) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: "normal" },
    );
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410)
      await admin
        .from("dilemma_push_subscriptions")
        .delete()
        .eq("id", subscription.id);
    return false;
  }
}

function localParts(timezone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
  };
}

async function sendDaily() {
  const { data, error } = await admin
    .from("dilemma_push_subscriptions")
    .select("*")
    .eq("daily_enabled", true);
  if (error) throw error;
  let sent = 0;
  const now = new Date();
  for (const subscription of (data ?? []) as Subscription[]) {
    let local;
    try {
      local = localParts(subscription.timezone, now);
    } catch {
      local = localParts("UTC", now);
    }
    if (
      local.hour !== subscription.preferred_hour ||
      subscription.last_daily_day === local.day
    )
      continue;
    const { count } = await admin
      .from("dilemma_daily_answers")
      .select("question_id", { count: "exact", head: true })
      .eq("user_id", subscription.user_id)
      .eq("day", local.day);
    if (count) continue;
    const ok = await deliver(subscription, {
      title:
        subscription.locale === "en" ? "Today’s dilemma" : "Le dilemme du jour",
      body:
        subscription.locale === "en"
          ? "One choice is waiting for you."
          : "Un choix t’attend.",
      tag: `daily-dilemma-${local.day}`,
      url: "./?account=1&activity=daily",
    });
    if (ok) {
      sent++;
      await admin
        .from("dilemma_push_subscriptions")
        .update({ last_daily_day: local.day })
        .eq("id", subscription.id);
    }
  }
  return sent;
}

Deno.serve(async (req: Request) => {
  const reply = (status: number, body: object) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method-not-allowed" });
  if (req.headers.get("x-cron-secret") !== Deno.env.get("PUSH_CRON_SECRET"))
    return reply(401, { error: "unauthorized" });
  try {
    return reply(200, { sent: await sendDaily() });
  } catch {
    return reply(503, { error: "push-unavailable" });
  }
});
