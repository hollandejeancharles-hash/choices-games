import { AXES, type Profile } from "./types";

/** A theatrical exaggeration of the strongest measured tendency, not moral worth. */
export function bonusPortraits(profile: Profile) {
  const measured = AXES.filter((axis) => profile.axes[axis].count > 0);
  const axis = measured.sort(
    (a, b) => Math.abs(profile.vector[b]) - Math.abs(profile.vector[a]),
  )[0];
  const intensity = axis ? Math.round(Math.abs(profile.vector[axis])) : null;
  const independence = profile.axes.independence;
  return {
    dark:
      axis && intensity !== null
        ? { axis, positive: profile.vector[axis] >= 0, intensity }
        : null,
    values: independence.count
      ? {
          autonomy: Math.round((profile.vector.independence + 100) / 2),
          count: independence.count,
          mixed:
            independence.conflicted ||
            profile.contradictions.includes("independence"),
        }
      : null,
  };
}
