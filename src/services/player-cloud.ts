import { archetypes } from "../data/archetypes";
import { questions } from "../data/questions";
import { rankArchetypes, scoreAnswers } from "../core/engine";
import { AXES, type Axis, type Vector } from "../core/types";
import type { Session } from "./session";
import { parseSession } from "./session";
import { playerAuth } from "./supabase";

export interface CloudResult {
  id: string;
  completedAt: string;
  length: number;
  archetypeId: string;
  vector: Vector;
}

async function userId() {
  const { data } = await playerAuth.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function saveCloudSession(session: Session) {
  const user = await userId();
  if (!user) return false;
  const { error } = await playerAuth.from("dilemma_player_saves").upsert({
    user_id: user,
    session,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return true;
}

export async function loadCloudSession(): Promise<Session | null> {
  const user = await userId();
  if (!user) return null;
  const { data, error } = await playerAuth
    .from("dilemma_player_saves")
    .select("session")
    .eq("user_id", user)
    .maybeSingle();
  if (error) throw error;
  return parseSession(data ? JSON.stringify(data.session) : null);
}

export async function clearCloudSession() {
  const user = await userId();
  if (!user) return;
  const { error } = await playerAuth
    .from("dilemma_player_saves")
    .delete()
    .eq("user_id", user);
  if (error) throw error;
}

export async function archiveSoloResult(session: Session) {
  const user = await userId();
  if (!user || session.mode !== "solo") return false;
  const player = session.players[0];
  if (!player || player.answers.length !== session.length) return false;
  const profile = scoreAnswers(questions, player.answers);
  const archetype = rankArchetypes(profile.vector, archetypes)[0]?.archetype;
  if (!archetype) return false;
  const { error } = await playerAuth.from("dilemma_player_results").upsert(
    {
      user_id: user,
      fingerprint: `${session.seed}:${player.id}`,
      game_length: session.length,
      archetype_id: archetype.id,
      vector: profile.vector,
    },
    { onConflict: "user_id,fingerprint", ignoreDuplicates: true },
  );
  if (error) throw error;
  return true;
}

function validVector(value: unknown): value is Vector {
  if (!value || typeof value !== "object") return false;
  return AXES.every((axis) => {
    const score = (value as Record<string, unknown>)[axis];
    return (
      typeof score === "number" &&
      Number.isFinite(score) &&
      Math.abs(score) <= 100
    );
  });
}

export async function listCloudResults(): Promise<CloudResult[]> {
  const user = await userId();
  if (!user) return [];
  const { data, error } = await playerAuth
    .from("dilemma_player_results")
    .select("id,completed_at,game_length,archetype_id,vector")
    .eq("user_id", user)
    .order("completed_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).flatMap((row) =>
    validVector(row.vector)
      ? [
          {
            id: row.id,
            completedAt: row.completed_at,
            length: row.game_length,
            archetypeId: row.archetype_id,
            vector: row.vector,
          },
        ]
      : [],
  );
}

export function strongestEvolution(
  current: Vector,
  previous: Vector,
): { axis: Axis; delta: number } {
  return AXES.map((axis) => ({
    axis,
    delta: current[axis] - previous[axis],
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]!;
}
