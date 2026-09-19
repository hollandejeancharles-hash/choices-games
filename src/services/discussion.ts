import type { RoomState } from "./rooms";
type Log = {
  durations: Record<string, number>;
  pending?: { id: string; round: number; start: number };
};
/** Server timestamps measure reveal-to-next, not a player's answer time. */
export function updateDiscussion(log: Log, data: RoomState): Log {
  const next = { ...log, durations: { ...log.durations } };
  if (
    next.pending &&
    (data.round > next.pending.round || data.phase === "finished")
  ) {
    const end = Date.parse(
      data.phase === "finished" ? data.serverNow : (data.startedAt ?? ""),
    );
    const ms = end - next.pending.start;
    if (
      (data.phase === "finished"
        ? next.pending.round === (data.deck?.length ?? 0) - 1
        : data.round === next.pending.round + 1) &&
      Number.isFinite(ms) &&
      ms >= 0 &&
      ms <= 7200000
    )
      next.durations[next.pending.id] = ms;
    delete next.pending;
  }
  if (
    data.phase === "reveal" &&
    data.question &&
    data.startedAt &&
    !next.pending
  ) {
    const answers = data.answers.filter((a) => a.round === data.round);
    if (answers.length === data.players.length) {
      const start =
        Date.parse(data.startedAt) +
        Math.max(...answers.map((a) => a.duration));
      if (Number.isFinite(start))
        next.pending = { id: data.question.id, round: data.round, start };
    }
  }
  return next;
}
export function observeDiscussion(data: RoomState) {
  const key = `dilemma.discussion.${data.code}`;
  let log: Log = { durations: {} };
  try {
    const raw = JSON.parse(sessionStorage.getItem(key) || "null");
    if (raw?.durations) log = raw;
  } catch {
    /* optional storage */
  }
  const next = updateDiscussion(log, data);
  try {
    sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* current observation still available */
  }
  return next.durations;
}
