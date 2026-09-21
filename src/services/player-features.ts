import { playerAuth } from "./supabase";
import type { CloudResult } from "./player-cloud";

export interface DailyState {
  mine: 0 | 1 | null;
  a: number;
  b: number;
}
export interface Circle {
  id: string;
  name: string;
  code: string;
  owner: boolean;
  members: number;
  duels: number;
}
export interface DuelState {
  code: string;
  questions: string[];
  complete: boolean;
  owner: boolean;
  ownerAnswers: (0 | 1)[] | null;
  guestAnswers: (0 | 1)[] | null;
}
export interface CircleDuel {
  code: string;
  completedAt: string;
  agreements: number;
}

async function rpc<T>(
  name: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await playerAuth.rpc(name, params);
  if (error) throw error;
  return data as T;
}

export const dailyState = (day: string, question: string, option?: 0 | 1) =>
  rpc<DailyState>("dilemma_daily_vote", {
    p_day: day,
    p_question: question,
    p_option: option ?? null,
  });
export const createCircle = (name: string) =>
  rpc<string>("create_dilemma_circle", { p_name: name });
export const joinCircle = (code: string) =>
  rpc<void>("join_dilemma_circle", { p_code: code });
export const listCircles = () => rpc<Circle[]>("list_dilemma_circles");
export const circleHistory = (id: string) =>
  rpc<CircleDuel[]>("circle_dilemma_history", { p_circle: id });
export const createDuel = (
  questions: string[],
  answers: (0 | 1)[],
  circle?: string,
) =>
  rpc<string>("create_dilemma_duel", {
    p_questions: questions,
    p_answers: answers,
    p_circle: circle ?? null,
  });
export const readDuel = (code: string) =>
  rpc<DuelState>("read_dilemma_duel", { p_code: code });
export const answerDuel = (code: string, answers: (0 | 1)[]) =>
  rpc<DuelState>("answer_dilemma_duel", { p_code: code, p_answers: answers });

export async function updateNickname(displayName: string) {
  const { error } = await playerAuth.auth.updateUser({
    data: { display_name: displayName.trim() },
  });
  if (error) throw error;
}
export async function updateEmail(email: string) {
  const { error } = await playerAuth.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: `${location.origin}${location.pathname}?account=1` },
  );
  if (error) throw error;
}
export async function deleteResult(id: string) {
  const { error } = await playerAuth
    .from("dilemma_player_results")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
export async function clearPlayerHistory() {
  const { error } = await playerAuth
    .from("dilemma_player_results")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}
export async function exportPlayerData(results: CloudResult[]) {
  const { data: save } = await playerAuth
    .from("dilemma_player_saves")
    .select("session,updated_at")
    .maybeSingle();
  const { data: user } = await playerAuth.auth.getUser();
  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.user?.id,
      email: user.user?.email,
      displayName: user.user?.user_metadata.display_name,
    },
    activeSave: save ?? null,
    results,
  };
}
export async function deletePlayerAccount() {
  await rpc<void>("delete_dilemma_player_account");
  await playerAuth.auth.signOut({ scope: "local" });
}
