import {
  AXES,
  vector,
  type Answer,
  type Archetype,
  type Axis,
  type AxisResult,
  type Player,
  type Profile,
  type Question,
  type Vector,
} from "./types";

export function timingMultiplier(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0)
    throw new Error("Invalid decision duration");
  return durationMs < 3000 ? 1.25 : durationMs > 15000 ? 0.75 : 1;
}

export function scoreAnswers(
  questions: readonly Question[],
  answers: readonly Answer[],
): Profile {
  const catalog = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  const axes = Object.fromEntries(
    AXES.map((axis) => [
      axis,
      {
        score: 0,
        count: 0,
        coherence: 0,
        confidence: 0,
        slowCount: 0,
        conflicted: false,
      },
    ]),
  ) as Record<Axis, AxisResult>;
  const totals = vector(),
    mass = vector(),
    capacity = vector();
  const pairs = new Map<string, { axis: Axis; signs: Set<number> }>();
  for (const answer of answers) {
    const q = catalog.get(answer.questionId);
    if (!q || seen.has(q.id) || (answer.option !== 0 && answer.option !== 1))
      throw new Error("Unknown, duplicate or invalid answer");
    seen.add(q.id);
    const timedMultiplier = timingMultiplier(answer.durationMs);
    const multiplier = q.stableScoring ? 1 : timedMultiplier;
    const weights = q.options[answer.option].weights;
    for (const axis of AXES) {
      const weight = weights[axis] ?? 0;
      // Unselected options inform opportunity, never confidence or evidence.
      capacity[axis] +=
        Math.max(
          Math.abs(q.options[0].weights[axis] ?? 0),
          Math.abs(q.options[1].weights[axis] ?? 0),
        ) * (q.stableScoring ? 1 : 1.25);
      if (!weight) continue;
      totals[axis] += weight * multiplier;
      mass[axis] += Math.abs(weight * multiplier);
      axes[axis].count++;
      if (answer.durationMs > 15000) axes[axis].slowCount++;
    }
    if (q.consistency) {
      const { pairId, axis } = q.consistency;
      const pair = pairs.get(pairId) ?? { axis, signs: new Set<number>() };
      if (pair.axis !== axis) throw new Error("Inconsistent pair axis");
      const sign = Math.sign(weights[axis] ?? 0);
      if (sign) pair.signs.add(sign);
      pairs.set(pairId, pair);
    }
  }
  const contradictions = [
    ...new Set(
      [...pairs.values()].filter((p) => p.signs.size > 1).map((p) => p.axis),
    ),
  ];
  const result = vector();
  for (const axis of AXES) {
    const state = axes[axis];
    state.score = capacity[axis]
      ? Math.max(-100, Math.min(100, (100 * totals[axis]) / capacity[axis]))
      : 0;
    state.coherence = mass[axis] ? Math.abs(totals[axis]) / mass[axis] : 0;
    state.conflicted = state.count >= 2 && state.coherence < 0.5;
    state.confidence =
      (1 - Math.exp(-state.count / 3)) * (0.5 + 0.5 * state.coherence);
    result[axis] = state.score;
  }
  return {
    vector: result,
    axes,
    contradictions,
    hesitations: AXES.filter((axis) => axes[axis].slowCount > 0),
  };
}

/** Deterministic tie breaking; callers can shuffle the initial catalog with a saved seed. */
export function selectQuestion(
  questions: readonly Question[],
  histories: readonly (readonly Answer[])[],
  recentIds: readonly string[] = [],
): Question | undefined {
  if (!histories.length) throw new Error("At least one player is required");
  const answered = new Set(
    histories.flatMap((history) => history.map((a) => a.questionId)),
  );
  const candidates = questions.filter((q) => !answered.has(q.id));
  const profiles = histories.map((history) => scoreAnswers(questions, history));
  const recentThemes = recentIds
    .slice(-2)
    .map((id) => questions.find((q) => q.id === id)?.theme);
  // Prefer a fresh theme whenever the bank allows it.
  const fresh = candidates.filter((q) => !recentThemes.includes(q.theme));
  const pool = fresh.length ? fresh : candidates;
  let best: Question | undefined,
    bestUtility = -Infinity;
  for (const q of pool) {
    const targeted = AXES.filter((axis) =>
      q.options.some((o) => o.weights[axis] !== undefined),
    );
    if (!targeted.length) continue;
    let utility = 0;
    for (const profile of profiles) {
      utility +=
        targeted.reduce((sum, axis) => {
          const state = profile.axes[axis];
          return (
            sum +
            (state.count === 0 ? 3 : 0) +
            1 -
            state.confidence +
            (state.conflicted ? 0.5 * (1 - Math.abs(state.score) / 100) : 0)
          );
        }, 0) / targeted.length;
    }
    // Complete an opened consistency pair without allowing it to dominate coverage.
    if (
      q.consistency &&
      recentIds.some(
        (id) =>
          questions.find((other) => other.id === id)?.consistency?.pairId ===
          q.consistency?.pairId,
      )
    )
      utility += 0.15 * profiles.length;
    if (utility > bestUtility) {
      best = q;
      bestUtility = utility;
    }
  }
  return best;
}

export function distance(a: Vector, b: Vector): number {
  for (const v of [a, b])
    for (const axis of AXES)
      if (!Number.isFinite(v[axis]) || Math.abs(v[axis]) > 100)
        throw new Error("Invalid vector");
  return Math.sqrt(
    AXES.reduce((sum, axis) => sum + (a[axis] - b[axis]) ** 2, 0),
  );
}
export function rankArchetypes(
  scores: Vector,
  archetypes: readonly Archetype[],
) {
  if (
    archetypes.length < 2 ||
    archetypes.some((a) => !Number.isFinite(a.prior) || a.prior <= 0)
  )
    throw new Error("At least two archetypes with positive priors required");
  const total = archetypes.reduce((sum, a) => sum + a.prior, 0);
  return archetypes
    .map((archetype) => ({
      archetype,
      distance: distance(scores, archetype.target),
      fictionalRarity: Math.round((1000 * archetype.prior) / total) / 10,
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance || a.archetype.id.localeCompare(b.archetype.id),
    );
}
export function compatibility(a: Vector, b: Vector): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(100 * (1 - distance(a, b) / (200 * Math.sqrt(AXES.length)))),
    ),
  );
}
export function compareGroup(
  questions: readonly Question[],
  players: readonly Player[],
) {
  if (
    players.length < 2 ||
    players.length > 6 ||
    new Set(players.map((p) => p.id)).size !== players.length
  )
    throw new Error("Expected 2–6 unique players");
  const profiles = players.map((player) => ({
    player,
    profile: scoreAnswers(questions, player.answers),
  }));
  const pairs = profiles
    .flatMap((a, index) =>
      profiles.slice(index + 1).map((b) => ({
        players: [a.player.id, b.player.id] as const,
        similarity: compatibility(a.profile.vector, b.profile.vector),
      })),
    )
    .sort((a, b) => b.similarity - a.similarity);
  const division = questions
    .flatMap((q) => {
      const answers = players.map((p) =>
        p.answers.find((a) => a.questionId === q.id),
      );
      if (answers.some((a) => !a)) return [];
      const left = answers.filter((a) => a?.option === 0).length;
      return [
        {
          questionId: q.id,
          division: 1 - Math.abs(2 * left - players.length) / players.length,
        },
      ];
    })
    .sort((a, b) => b.division - a.division);
  return {
    profiles,
    pairs,
    closest: pairs[0]!,
    furthest: pairs[pairs.length - 1]!,
    mostDivisive: division[0]?.division ? division[0] : undefined,
  };
}
