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
  mineAnswered: boolean;
  partnerAnswered: boolean;
  ownerAnswers: (0 | 1)[] | null;
  guestAnswers: (0 | 1)[] | null;
  ownerGuesses?: (0 | 1)[] | null;
  guestGuesses?: (0 | 1)[] | null;
}
export interface MyDuo {
  code: string;
  createdAt: string;
  complete: boolean;
  expired: boolean;
  owner: boolean;
  invited?: boolean;
  mineAnswered: boolean;
  partnerAnswered: boolean;
}
export const listDuos = () => rpc<MyDuo[]>("list_dilemma_duos");

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
export const createDuel = (questions: string[], circle?: string) =>
  rpc<string>("create_dilemma_duel_v3", {
    p_questions: questions,
    p_circle: circle ?? null,
  });
export const readDuel = (code: string) =>
  rpc<DuelState>("read_dilemma_duel", { p_code: code });
export const answerDuel = (
  code: string,
  answers: (0 | 1)[],
  guesses?: (0 | 1)[],
) =>
  rpc<DuelState>("answer_dilemma_duel_v3", {
    p_code: code,
    p_answers: answers,
    p_guesses: guesses ?? null,
  });

export const createDuelInvitation = (
  code: string,
  friend: string | null,
  email: string | null,
) =>
  rpc<{ id: string; recipientFound: boolean }>(
    "create_dilemma_duel_invitation",
    { p_code: code, p_friend: friend, p_email: email },
  );

export async function sendDuelInvitationEmail(id: string) {
  const { data, error } = await playerAuth.functions.invoke("send-invitation", {
    body: { id, type: "duo" },
  });
  if (error || !data?.sent) throw new Error("email-not-sent");
}

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
  const { data: save, error: saveError } = await playerAuth
    .from("dilemma_player_saves")
    .select("session,updated_at")
    .maybeSingle();
  if (saveError) throw saveError;
  const { data: user, error: userError } = await playerAuth.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Sign in to export your data.");
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
