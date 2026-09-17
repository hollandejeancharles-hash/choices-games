import { expect, it } from "vitest";
import { duoSummary } from "./duo";
import { scoreAnswers } from "./engine";
import { questions } from "../data/questions";
import type { Player } from "./types";
it("counts common choices by question ID rather than answer position", () => {
  const a: Player = {
    id: "1",
    name: "A",
    answers: [
      { questionId: "a", option: 0, durationMs: 1 },
      { questionId: "b", option: 1, durationMs: 1 },
    ],
  };
  const b: Player = {
    id: "2",
    name: "B",
    answers: [
      { questionId: "b", option: 0, durationMs: 1 },
      { questionId: "a", option: 0, durationMs: 1 },
    ],
  };
  const empty = scoreAnswers(questions, []);
  expect(duoSummary(a, b, empty, empty)).toEqual({
    same: 1,
    total: 2,
    common: [],
    different: [],
  });
});
it("does not invent differences for identical portraits and retains tied differences", () => {
  const first = scoreAnswers(questions, []),
    second = scoreAnswers(questions, []);
  const p: Player = { id: "1", name: "A", answers: [] };
  for (const axis of ["adventure", "reason"] as const) {
    first.axes[axis].count = 1;
    second.axes[axis].count = 1;
  }
  expect(duoSummary(p, p, first, second).different).toEqual([]);
  expect(duoSummary(p, p, first, second).common).toEqual([
    "adventure",
    "reason",
  ]);
  second.vector.adventure = 100;
  second.vector.reason = -100;
  expect(duoSummary(p, p, first, second).different).toEqual([
    "adventure",
    "reason",
  ]);
  expect(duoSummary(p, p, first, second).common).toEqual([]);
});
