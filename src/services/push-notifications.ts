import { playerAuth } from "./supabase";

export type PushAvailability =
  "available" | "ios-install-required" | "unsupported";

export interface PushPreference {
  availability: PushAvailability;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
}

const publicKey =
  "BCcgVNf9o_11HtJWs8yXoOfH7ykpexJvXz4nYz7E2oQLFl9hnqZ5bG7CE85I9s6ylTOampKZhak3vuCn8PqYbp8";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function availability(): PushAvailability {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (ios && !isStandalone()) return "ios-install-required";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return "unsupported";
  return "available";
}

function decodeKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const bytes = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("./sw.js", { scope: "./" });
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const { error } = await playerAuth.rpc("register_dilemma_push", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    p_locale: document.documentElement.lang === "en" ? "en" : "fr",
  });
  if (error) throw error;
}

export async function readPushPreference(): Promise<PushPreference> {
  const support = availability();
  if (support !== "available")
    return { availability: support, enabled: false, permission: "unsupported" };
  const worker = await registration();
  const subscription = await worker.pushManager.getSubscription();
  if (subscription && Notification.permission === "granted") {
    await saveSubscription(subscription);
  }
  return {
    availability: support,
    enabled: Boolean(subscription) && Notification.permission === "granted",
    permission: Notification.permission,
  };
}

export async function enableDailyPush(): Promise<PushPreference> {
  if (availability() !== "available") return readPushPreference();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return readPushPreference();
  const worker = await registration();
  const subscription =
    (await worker.pushManager.getSubscription()) ??
    (await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(publicKey),
    }));
  await saveSubscription(subscription);
  return readPushPreference();
}

export async function disableDailyPush(): Promise<PushPreference> {
  if (availability() === "available") {
    const worker = await registration();
    await (await worker.pushManager.getSubscription())?.unsubscribe();
  }
  const { error } = await playerAuth.rpc("disable_dilemma_push");
  if (error) throw error;
  return readPushPreference();
}
