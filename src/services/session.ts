import { validGuesses, type Guesses, type Prediction } from "./predictions";
import { balancedDeck } from "../core/balanced";
import { PACKS, type PackId } from "../data/packs";
import type {
  Answer,
  Game,
  GameLength,
  Locale,
  Player,
  Question,
} from "../core/types";
import { selectQuestion } from "../core/engine";
import { questions } from "../data/questions";
export const GAME_KEY = "dilemma.game.v1";
export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function savePreference(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function initialLocale(): Locale {
  return readPreference("dilemma.locale") === "en"
    ? "en"
    : readPreference("dilemma.locale") === "fr"
      ? "fr"
      : navigator.language.toLowerCase().startsWith("fr")
        ? "fr"
        : "en";
}
export interface Session extends Game {
  seed: number;
  groupOptions?: {
    reveal: "round" | "end";
    timer: 0 | 20 | 30;
    predictions?: boolean;
  };
  predictions?: Prediction[];
  pendingReveal?: number;
  pendingRecap?: boolean;
  discussionStartedAt?: number;
  discussionDurations?: Record<string, number>;
  pack?: PackId;
  deck?: string[];
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !record(data) ||
      data.version !== 1 ||
      !["solo", "group"].includes(String(data.mode)) ||
      ![10, 15, 25].includes(Number(data.length)) ||
      typeof data.length !== "number" ||
      !Number.isInteger(data.seed) ||
      typeof data.seed !== "number" ||
      !Array.isArray(data.players) ||
      !Array.isArray(data.questionIds) ||
      typeof data.currentPlayer !== "number"
    )
      return null;
    if (
      data.players.length < (data.mode === "group" ? 2 : 1) ||
      data.players.length > (data.mode === "group" ? 6 : 1)
    )
      return null;
    if (
      data.questionIds.length < 1 ||
      data.questionIds.length > data.length ||
      new Set(data.questionIds).size !== data.questionIds.length ||
      data.questionIds.some(
        (id) => typeof id !== "string" || !questions.some((q) => q.id === id),
      )
    )
      return null;
    if (
      !Number.isInteger(data.currentPlayer) ||
      data.currentPlayer < 0 ||
      data.currentPlayer >= data.players.length
    )
      return null;
    if (
      data.pack !== undefined &&
      (!PACKS.includes(data.pack as PackId) ||
        !Array.isArray(data.deck) ||
        data.deck.length !== data.length ||
        new Set(data.deck).size !== data.length ||
        data.deck.some(
          (id) =>
            typeof id !== "string" ||
            !questions.some((q) => q.id === id && q.pack === data.pack),
        ) ||
        data.questionIds.some((id, i) => id !== (data.deck as string[])[i]))
    )
      return null;
    if (data.pack === undefined && data.deck !== undefined) return null;
    if (
      data.groupOptions !== undefined &&
      (data.mode !== "group" ||
        !record(data.groupOptions) ||
        !["round", "end"].includes(String(data.groupOptions.reveal)) ||
        ![0, 20, 30].includes(Number(data.groupOptions.timer)) ||
        typeof data.groupOptions.timer !== "number" ||
        (data.groupOptions.predictions !== undefined &&
          typeof data.groupOptions.predictions !== "boolean"))
    )
      return null;
    const players: Player[] = [];
    for (const p of data.players) {
      if (
        !record(p) ||
        typeof p.id !== "string" ||
        typeof p.name !== "string" ||
        p.name.length > 40 ||
        !Array.isArray(p.answers)
      )
        return null;
      const answers: Answer[] = [];
      for (const [index, a] of p.answers.entries()) {
        if (
          !record(a) ||
          a.questionId !== data.questionIds[index] ||
          typeof a.questionId !== "string" ||
          (a.option !== 0 && a.option !== 1) ||
          typeof a.durationMs !== "number" ||
          !Number.isFinite(a.durationMs) ||
          a.durationMs < 0
        )
          return null;
        answers.push({
          questionId: a.questionId,
          option: a.option,
          durationMs: a.durationMs,
        });
      }
      players.push({ id: p.id, name: p.name, answers });
    }
    if (new Set(players.map((p) => p.id)).size !== players.length) return null;
    const complete = players.every((p) => p.answers.length === data.length);
    if (
      !complete &&
      players.some(
        (p, i) =>
          p.answers.length !==
          (data.questionIds as unknown[]).length -
            (i < Number(data.currentPlayer) ? 0 : 1),
      )
    )
      return null;
    if (complete && data.currentPlayer !== 0) return null;
    const completedRounds = Math.min(...players.map((p) => p.answers.length));
    if (
      data.pendingReveal !== undefined &&
      (!record(data.groupOptions) ||
        data.groupOptions.reveal !== "round" ||
        data.pendingReveal !== completedRounds - 1 ||
        completedRounds < 1 ||
        data.currentPlayer !== 0)
    )
      return null;
    if (
      data.pendingRecap !== undefined &&
      (data.pendingRecap !== true ||
        !record(data.groupOptions) ||
        data.mode !== "group" ||
        data.pendingReveal !== undefined ||
        !complete)
    )
      return null;
    let predictions: Prediction[] | undefined;
    if (data.predictions !== undefined) {
      if (!Array.isArray(data.predictions)) return null;
      const seen = new Set<string>();
      predictions = [];
      for (const g of data.predictions) {
        if (
          !record(g) ||
          typeof g.player !== "string" ||
          typeof g.target !== "string" ||
          typeof g.questionId !== "string" ||
          ![0, 1].includes(Number(g.option)) ||
          typeof g.option !== "number" ||
          g.player === g.target ||
          !players.some((p) => p.id === g.target) ||
          !players.some(
            (p) =>
              p.id === g.player &&
              p.answers.some((a) => a.questionId === g.questionId),
          )
        )
          return null;
        const key = JSON.stringify([g.player, g.target, g.questionId]);
        if (seen.has(key)) return null;
        seen.add(key);
        predictions.push(g as unknown as Prediction);
      }
    }
    if (
      record(data.groupOptions) &&
      data.groupOptions.predictions === true &&
      players.some((p) =>
        p.answers.some(
          (a) =>
            (predictions ?? []).filter(
              (g) => g.player === p.id && g.questionId === a.questionId,
            ).length !==
            players.length - 1,
        ),
      )
    )
      return null;
    return {
      ...(predictions ? { predictions } : {}),
      ...(data.groupOptions
        ? {
            groupOptions: data.groupOptions as NonNullable<
              Session["groupOptions"]
            >,
          }
        : {}),
      ...(typeof data.pendingReveal === "number"
        ? { pendingReveal: data.pendingReveal }
        : {}),
      ...(data.pendingRecap === true ? { pendingRecap: true } : {}),
      ...(typeof data.discussionStartedAt === "number" &&
      Number.isFinite(data.discussionStartedAt) &&
      data.discussionStartedAt > 0
        ? { discussionStartedAt: data.discussionStartedAt }
        : {}),
      ...(record(data.discussionDurations)
        ? {
            discussionDurations: Object.fromEntries(
              Object.entries(data.discussionDurations).filter(
                ([id, ms]) =>
                  (data.questionIds as string[]).includes(id) &&
                  typeof ms === "number" &&
                  Number.isFinite(ms) &&
                  ms >= 0 &&
                  ms <= 7200000,
              ),
            ) as Record<string, number>,
          }
        : {}),
      version: 1,
      mode: data.mode as Game["mode"],
      length: data.length as GameLength,
      seed: data.seed,
      ...(data.pack
        ? { pack: data.pack as PackId, deck: data.deck as string[] }
        : {}),
      questionIds: data.questionIds as string[],
      players,
      currentPlayer: data.currentPlayer,
    };
  } catch {
    return null;
  }
}
export function loadSession(): Session | null {
  return parseSession(readPreference(GAME_KEY));
}
export function saveSession(session: Session): boolean {
  return savePreference(GAME_KEY, JSON.stringify(session));
}
export function shuffledBank(seed: number): Question[] {
  let state = seed >>> 0;
  const bank = [...questions];
  for (let i = bank.length - 1; i > 0; i--) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [bank[i], bank[j]] = [bank[j]!, bank[i]!];
  }
  return bank;
}
export function createSession(
  names: string[],
  length: GameLength,
  seed: number,
  pack: PackId = "general",
  groupOptions?: Session["groupOptions"],
): Session {
  if (names.length < 1 || names.length > 6 || ![10, 15, 25].includes(length))
    throw new Error("Invalid game settings");
  if (
    groupOptions &&
    (!["round", "end"].includes(groupOptions.reveal) ||
      ![0, 20, 30].includes(groupOptions.timer))
  )
    throw new Error("Invalid group settings");
  const players = names.map((name, i) => ({
    id: String(i + 1),
    name: name.trim().slice(0, 40),
    answers: [],
  }));
  if (!PACKS.includes(pack)) throw new Error("Invalid pack");
  const deck = balancedDeck(
    shuffledBank(seed).filter((q) => q.pack === pack),
    length,
  );
  return {
    ...(names.length > 1 && groupOptions ? { groupOptions } : {}),
    version: 1,
    mode: names.length === 1 ? "solo" : "group",
    length,
    players,
    seed,
    pack,
    deck,
    questionIds: [deck[0]!],
    currentPlayer: 0,
  };
}
export function isComplete(session: Session): boolean {
  return session.players.every((p) => p.answers.length === session.length);
}
export function recordAnswer(
  session: Session,
  option: 0 | 1,
  durationMs: number,
  guesses?: Guesses,
): Session {
  if (
    isComplete(session) ||
    session.pendingReveal !== undefined ||
    session.pendingRecap
  )
    return session;
  const id = session.questionIds.at(-1)!;
  const current = session.players[session.currentPlayer]!;
  if (current.answers.some((a) => a.questionId === id)) return session;
  if (!Number.isFinite(durationMs) || durationMs < 0)
    throw new Error("Invalid duration");
  if (session.groupOptions?.predictions) {
    if (!validGuesses(guesses, session.players, current.id))
      throw new Error("Incomplete predictions");
    session = {
      ...session,
      predictions: [
        ...(session.predictions ?? []),
        ...Object.entries(guesses).map(([target, option]) => ({
          player: current.id,
          target,
          questionId: id,
          option,
        })),
      ],
    };
  }
  const players = session.players.map((p, i) =>
    i === session.currentPlayer
      ? {
          ...p,
          answers: [...p.answers, { questionId: id, option, durationMs }],
        }
      : p,
  );
  if (session.currentPlayer < players.length - 1)
    return { ...session, players, currentPlayer: session.currentPlayer + 1 };
  const updated: Session = {
    ...session,
    players,
    currentPlayer: 0,
    ...(session.groupOptions?.reveal === "round"
      ? {
          pendingReveal: session.questionIds.length - 1,
          discussionStartedAt: Date.now(),
        }
      : {}),
    ...(session.groupOptions?.reveal === "end" &&
    players.every((p) => p.answers.length === session.length)
      ? { pendingRecap: true }
      : {}),
  };
  if (isComplete(updated)) return updated;
  if (session.deck) {
    const nextId = session.deck[session.questionIds.length];
    if (!nextId) throw new Error("Question deck exhausted");
    return { ...updated, questionIds: [...session.questionIds, nextId] };
  }
  const next = selectQuestion(
    shuffledBank(session.seed).filter((q) => !q.pack),
    players.map((p) => p.answers),
    session.questionIds,
  );
  if (!next) throw new Error("Question bank exhausted");
  return { ...updated, questionIds: [...session.questionIds, next.id] };
}

export function acknowledgeReveal(session: Session, now = Date.now()): Session {
  const next = { ...session };
  if (
    session.pendingReveal !== undefined &&
    session.discussionStartedAt !== undefined
  ) {
    const id = session.questionIds[session.pendingReveal];
    if (id)
      next.discussionDurations = {
        ...session.discussionDurations,
        [id]: Math.min(7200000, Math.max(0, now - session.discussionStartedAt)),
      };
  }
  delete next.discussionStartedAt;
  delete next.pendingReveal;
  delete next.pendingRecap;
  if (
    session.pendingReveal !== undefined &&
    session.mode === "group" &&
    isComplete(session)
  )
    next.pendingRecap = true;
  return next;
}
export function sessionScreen(
  session: Session,
): "round-reveal" | "recap" | "result" | "handoff" {
  if (session.pendingReveal !== undefined) return "round-reveal";
  if (session.pendingRecap) return "recap";
  return isComplete(session) ? "result" : "handoff";
}
