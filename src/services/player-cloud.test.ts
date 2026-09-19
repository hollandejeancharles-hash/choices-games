import { describe, expect, it } from "vitest";
import { strongestEvolution } from "./player-cloud";
import { vector } from "../core/types";

describe("player profile evolution", () => {
  it("finds the axis with the largest absolute change", () => {
    const previous = vector();
    const current = { ...vector(), adventure: -12, future: 42, ambition: 18 };
    expect(strongestEvolution(current, previous)).toEqual({
      axis: "future",
      delta: 42,
    });
  });

  it("keeps the direction of a negative change", () => {
    const previous = { ...vector(), reason: 70 };
    const current = { ...vector(), reason: -10 };
    expect(strongestEvolution(current, previous)).toEqual({
      axis: "reason",
      delta: -80,
    });
  });
});
