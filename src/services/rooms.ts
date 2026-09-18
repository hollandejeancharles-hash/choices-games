import { supabase } from "./supabase";
import type { Question, GameLength } from "../core/types";
import type { PackId } from "../data/packs";
export interface RoomSettings {
  expectedPlayers?: number;
  context?: string;
  pack: PackId;
  length: GameLength;
  timer: 0 | 20 | 30;
  reveal: "round" | "end";
}
export interface RoomState {
  code: string;
  phase: "lobby" | "question" | "reveal" | "finished" | "closed";
  round: number;
  seed: number;
  settings: RoomSettings;
  me: string;
  host: string;
  serverNow: string;
  startedAt: string | null;
  expiresAt: string;
  question: Question | null;
  deck: Question[] | null;
  players: { id: string; name: string; online: boolean; answered: boolean }[];
  answers: { player: string; round: number; option: 0 | 1; duration: number }[];
}
export interface RoomCredential {
  code: string;
  token: string;
  creation?: Record<string, unknown>;
}
export const roomStorage = "dilemma.online.v1";
export function roomCodeFromHash(hash: string) {
  const match = /^#room=([A-Fa-f0-9]{8})$/.exec(hash);
  return match?.[1]?.toUpperCase() ?? "";
}
export function invitationUrl(code: string, base = location.href) {
  const url = new URL(base);
  url.hash = `room=${code}`;
  return url.toString();
}
export function storedRoom(): RoomCredential | null {
  try {
    const value = JSON.parse(localStorage.getItem(roomStorage) || "null");
    return value &&
      typeof value.code === "string" &&
      typeof value.token === "string" &&
      /^[a-f0-9-]{36}$/.test(value.token)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function storeRoom(value: RoomCredential | null) {
  if (value) localStorage.setItem(roomStorage, JSON.stringify(value));
  else localStorage.removeItem(roomStorage);
}
export async function roomRequest(
  action: string,
  credential: RoomCredential,
  payload: Record<string, unknown> = {},
): Promise<RoomState> {
  const { data, error } = await supabase
    .rpc("dilemma_room", {
      action,
      token: credential.token,
      room_code: credential.code,
      payload,
    })
    .abortSignal(AbortSignal.timeout(12000));
  if (error) throw new Error(error.message);
  if (!data || !Array.isArray(data.players) || !Array.isArray(data.answers))
    throw new Error("invalid-response");
  return data as RoomState;
}
