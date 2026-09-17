import {
  AXES,
  vector,
  type AxisResult,
  type Locale,
  type Profile,
} from "../core/types";
export interface SharedResult {
  profile: Profile;
  locale: Locale;
  length: number;
}
interface Payload {
  v: 1;
  l: Locale;
  n: number;
  a: number[][];
}
export function encodeResult({
  profile,
  locale,
  length,
}: SharedResult): string {
  const payload: Payload = {
    v: 1,
    l: locale,
    n: length,
    a: AXES.map((axis) => {
      const a = profile.axes[axis];
      return [
        a.score,
        a.count,
        a.coherence,
        a.slowCount,
        profile.contradictions.includes(axis) ? 1 : 0,
      ];
    }),
  };
  return btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodeResult(encoded: string): SharedResult | null {
  if (!encoded || encoded.length > 8000 || !/^[A-Za-z0-9_-]+$/.test(encoded))
    return null;
  try {
    const value: unknown = JSON.parse(
      atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
    );
    if (
      typeof value !== "object" ||
      !value ||
      !("v" in value) ||
      value.v !== 1 ||
      !("l" in value) ||
      (value.l !== "fr" && value.l !== "en") ||
      !("n" in value) ||
      typeof value.n !== "number" ||
      ![10, 15, 25].includes(value.n) ||
      !("a" in value) ||
      !Array.isArray(value.a) ||
      value.a.length !== 6
    )
      return null;
    const result: SharedResult = {
      locale: value.l,
      length: value.n,
      profile: {
        vector: vector(),
        axes: {} as Record<(typeof AXES)[number], AxisResult>,
        contradictions: [],
        hesitations: [],
      },
    };
    for (let i = 0; i < AXES.length; i++) {
      const row: unknown = value.a[i];
      if (
        !Array.isArray(row) ||
        row.length !== 5 ||
        row.some((n) => typeof n !== "number" || !Number.isFinite(n))
      )
        return null;
      const [score, count, coherence, slowCount, contradiction] = row as [
        number,
        number,
        number,
        number,
        number,
      ];
      if (
        Math.abs(score) > 100 ||
        !Number.isInteger(count) ||
        count < 0 ||
        count > value.n ||
        coherence < 0 ||
        coherence > 1 ||
        !Number.isInteger(slowCount) ||
        slowCount < 0 ||
        slowCount > count ||
        ![0, 1].includes(contradiction) ||
        (!count && (score || coherence || slowCount || contradiction)) ||
        (contradiction && count < 2)
      )
        return null;
      const axis = AXES[i]!;
      result.profile.vector[axis] = score;
      result.profile.axes[axis] = {
        score,
        count,
        coherence,
        slowCount,
        conflicted: count >= 2 && coherence < 0.5,
        confidence: (1 - Math.exp(-count / 3)) * (0.5 + 0.5 * coherence),
      };
      if (slowCount) result.profile.hesitations.push(axis);
      if (contradiction) result.profile.contradictions.push(axis);
    }
    return result;
  } catch {
    return null;
  }
}
export function resultFromHash(hash: string): SharedResult | null {
  return hash.startsWith("#r=") ? decodeResult(hash.slice(3)) : null;
}
export function resultUrl(result: SharedResult): string {
  return `${location.origin}${location.pathname}#r=${encodeResult(result)}`;
}
