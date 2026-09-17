import { balancedVariant } from "../core/balanced";
import type { Axis, Locale, Question } from "../core/types";
import { AXES } from "../core/types";
import { questions } from "../data/questions";
const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
const url = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const communityEnabled =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !!key;
export interface Submission {
  id: string;
  locale: Locale;
  prompt: string;
  option_a: string;
  option_b: string;
  created_at: string;
  status: "pending" | "published" | "rejected";
}
export interface Draft {
  prompt_fr: string;
  prompt_en: string;
  a_fr: string;
  a_en: string;
  b_fr: string;
  b_en: string;
  axis: Axis;
}
export async function communityRequest(
  path: string,
  body?: unknown,
  token?: string,
) {
  if (!communityEnabled) throw new Error("not-configured");
  const response = await fetch(`${url}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "access-denied"
        : "request-failed",
    );
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export function isCommunityQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Question;
  const localized = (x: unknown) =>
    !!x &&
    typeof x === "object" &&
    ["fr", "en"].every(
      (k) =>
        typeof (x as Record<string, unknown>)[k] === "string" &&
        ((x as Record<string, string>)[k]?.trim().length ?? 0) > 0 &&
        ((x as Record<string, string>)[k]?.length ?? 0) <= 1200,
    );
  return (
    typeof q.id === "string" &&
    /^community-[0-9a-f-]{36}$/.test(q.id) &&
    q.theme === "ethics" &&
    localized(q.prompt) &&
    Array.isArray(q.options) &&
    q.options.length === 2 &&
    q.options.every(
      (o) =>
        localized(o.text) &&
        o.weights &&
        typeof o.weights === "object" &&
        Object.keys(o.weights).length === 1 &&
        Object.entries(o.weights).every(
          ([k, v]) => AXES.includes(k as Axis) && (v === 3 || v === -3),
        ),
    ) &&
    JSON.stringify(q.options[0].weights) !==
      JSON.stringify(q.options[1].weights)
  );
}
const CACHE = "dilemma.public-questions.v1";
export async function loadCommunityQuestions() {
  if (!communityEnabled) return;
  const merge = (items: unknown) => {
    if (Array.isArray(items))
      for (const q of items)
        if (
          isCommunityQuestion(q) &&
          !questions.some((existing) => existing.id === q.id)
        )
          questions.push(q, balancedVariant(q));
  };
  try {
    merge(JSON.parse(localStorage.getItem(CACHE) || "[]"));
  } catch {
    /* Storage is optional. */
  }
  try {
    const response = await fetch(
      `${url}/rest/v1/published_dilemmas?select=question&order=created_at.asc&limit=1000`,
      { headers: { apikey: key }, signal: AbortSignal.timeout(2500) },
    );
    if (!response.ok) return;
    const rows: unknown = await response.json();
    if (Array.isArray(rows)) merge(rows.map((row) => row?.question));
    try {
      localStorage.setItem(
        CACHE,
        JSON.stringify(questions.filter((q) => q.id.startsWith("community-"))),
      );
    } catch {
      /* Core game remains available. */
    }
  } catch {
    /* Keep the built-in and cached catalog when offline. */
  }
}
