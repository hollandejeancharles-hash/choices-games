import { describe, it, expect } from "vitest";
import {
  createSession,
  recordAnswer,
  acknowledgeReveal,
  parseSession,
  isComplete,
} from "./session";
import { predictionRanking, validGuesses } from "./predictions";
describe("prediction games", () => {
  it("requires one guess for each other player before advancing", () => {
    const s = createSession(["A", "B", "C"], 10, 41, "general", {
      reveal: "round",
      timer: 0,
      predictions: true,
    });
    expect(validGuesses({ "1": 0, "2": 1 }, s.players, "1")).toBe(false);
    expect(validGuesses({ "2": 1, "3": 0, unknown: 1 }, s.players, "1")).toBe(
      false,
    );
    expect(() => recordAnswer(s, 0, 100)).toThrow();
    expect(() => recordAnswer(s, 0, 100, { "2": 1 })).toThrow();
    const next = recordAnswer(s, 0, 100, { "2": 1, "3": 0 });
    expect(next.currentPlayer).toBe(1);
    expect(next.pendingReveal).toBeUndefined();
    expect(next.predictions).toHaveLength(2);
    expect(parseSession(JSON.stringify(next))).toEqual(next);
  });
  it.each(["round", "end"] as const)(
    "scores a complete %s game and preserves ties after reload",
    (reveal) => {
      let s = createSession(["A", "B", "C"], 10, 41, "general", {
        reveal,
        timer: 0,
        predictions: true,
      });
      for (let i = 0; i < 10; i++) {
        s = recordAnswer(s, 0, 100, { "2": 1, "3": 1 });
        s = recordAnswer(s, 1, 500, { "1": 0, "3": 1 });
        s = recordAnswer(s, 1, 900, { "1": 1, "2": 1 });
        if (reveal === "round") s = acknowledgeReveal(s);
        expect(parseSession(JSON.stringify(s))).toEqual(s);
      }
      expect(isComplete(s)).toBe(true);
      expect(
        predictionRanking(s).map((p) => [p.points, p.rank, p.tied]),
      ).toEqual([
        [20, 1, true],
        [20, 1, true],
        [10, 3, false],
      ]);
      expect(
        predictionRanking(s, s.questionIds[0]).map((p) => p.points),
      ).toEqual([2, 2, 1]);
      const before = s.predictions?.length;
      expect(
        recordAnswer(s, 0, 1, { "2": 0, "3": 0 }).predictions,
      ).toHaveLength(before!);
      const corrupt = {
        ...s,
        predictions: [...s.predictions!, s.predictions![0]],
      };
      expect(parseSession(JSON.stringify(corrupt))).toBeNull();
      expect(
        parseSession(JSON.stringify({ ...s, predictions: [] })),
      ).toBeNull();
    },
  );
  it("keeps old sessions and solo compatible", () => {
    const solo = recordAnswer(createSession(["A"], 10, 4), 0, 1);
    expect(solo.predictions).toBeUndefined();
    expect(parseSession(JSON.stringify(solo))).toEqual(solo);
    const old = recordAnswer(
      createSession(["A", "B"], 10, 4, "general", {
        reveal: "round",
        timer: 0,
      }),
      0,
      1,
    );
    expect(parseSession(JSON.stringify(old))).toEqual(old);
  });
});
