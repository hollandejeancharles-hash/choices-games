import { AXES, type Player, type Profile } from "./types";
export function duoSummary(
  a: Player,
  b: Player,
  first: Profile,
  second: Profile,
) {
  const other = new Map(
    b.answers.map((answer) => [answer.questionId, answer.option]),
  );
  const shared = a.answers.filter((answer) => other.has(answer.questionId));
  const same = shared.filter(
    (answer) => other.get(answer.questionId) === answer.option,
  ).length;
  const distances = AXES.filter(
    (axis) => first.axes[axis].count > 0 && second.axes[axis].count > 0,
  ).map((axis) => ({
    axis,
    gap: Math.abs(first.vector[axis] - second.vector[axis]),
  }));
  const maximum = Math.max(0, ...distances.map((d) => d.gap));
  return {
    same,
    total: shared.length,
    common: distances
      .filter((d) => d.gap <= 20)
      .sort((a, b) => a.gap - b.gap)
      .map((d) => d.axis),
    different:
      maximum > 0
        ? distances.filter((d) => d.gap === maximum).map((d) => d.axis)
        : [],
  };
}
