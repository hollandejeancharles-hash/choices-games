import type { Session } from "./session";
export type Guesses = Record<string, 0 | 1>;
export interface Prediction {
  player: string;
  target: string;
  questionId: string;
  option: 0 | 1;
}
export function validGuesses(
  guesses: unknown,
  players: { id: string }[],
  me: string,
): guesses is Guesses {
  if (!guesses || typeof guesses !== "object" || Array.isArray(guesses))
    return false;
  const entries = Object.entries(guesses);
  const targets = players.filter((p) => p.id !== me);
  return (
    entries.length === targets.length &&
    targets.every((p) =>
      entries.some(
        ([id, option]) => id === p.id && (option === 0 || option === 1),
      ),
    )
  );
}
export function predictionRanking(session: Session, questionId?: string) {
  const rows = session.players
    .map((player, index) => {
      const seen = new Set<string>();
      const points = (session.predictions ?? []).filter((g) => {
        if (
          g.player !== player.id ||
          g.target === player.id ||
          (questionId && g.questionId !== questionId)
        )
          return false;
        const key = JSON.stringify([g.target, g.questionId]);
        if (seen.has(key)) return false;
        seen.add(key);
        return session.players
          .find((p) => p.id === g.target)
          ?.answers.some(
            (a) => a.questionId === g.questionId && a.option === g.option,
          );
      }).length;
      return { ...player, index, points };
    })
    .sort((a, b) => b.points - a.points || a.index - b.index);
  return rows.map((row) => ({
    ...row,
    rank: 1 + rows.filter((r) => r.points > row.points).length,
    tied: rows.filter((r) => r.points === row.points).length > 1,
  }));
}
