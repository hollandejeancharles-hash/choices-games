import { AXES, type Axis, type GameLength, type Question } from "./types";
export function primaryAxis(question: Question): Axis {
  const axis = AXES.find(
    (axis) =>
      Math.abs(question.options[0].weights[axis] ?? 0) === 3 &&
      Math.abs(question.options[1].weights[axis] ?? 0) === 3,
  );
  if (!axis) throw new Error(`No primary axis: ${question.id}`);
  return axis;
}
export function balancedVariant(question: Question): Question {
  const axis = primaryAxis(question);
  return {
    theme: question.theme,
    prompt: question.prompt,
    id: `balanced-${question.id}`,
    pack: "general",
    stableScoring: true,
    options: question.options.map((o) => ({
      ...o,
      weights: { [axis]: o.weights[axis]! },
    })) as unknown as Question["options"],
  };
}
/** Fixed quotas for a given length, independent of seed, answers and response times. */
export function axisQuotas(length: GameLength): Record<Axis, number> {
  return Object.fromEntries(
    AXES.map((axis, i) => [
      axis,
      Math.floor(length / 6) + (i < length % 6 ? 1 : 0),
    ]),
  ) as Record<Axis, number>;
}
export function balancedDeck(
  bank: readonly Question[],
  length: GameLength,
): string[] {
  const quota = axisQuotas(length),
    buckets = Object.fromEntries(
      AXES.map((axis) => [
        axis,
        bank.filter((q) => primaryAxis(q) === axis).slice(0, quota[axis]),
      ]),
    ) as Record<Axis, Question[]>;
  for (const axis of AXES)
    if (buckets[axis].length !== quota[axis])
      throw new Error(`Insufficient questions for ${axis}`);
  const ids: string[] = [];
  for (let round = 0; round < Math.ceil(length / 6); round++)
    for (const axis of AXES) {
      const q = buckets[axis][round];
      if (q) ids.push(q.id);
    }
  return ids;
}
