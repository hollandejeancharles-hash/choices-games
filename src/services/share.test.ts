import { expect, it } from "vitest";
import { decodeResult, encodeResult } from "./share";
import { scoreAnswers } from "../core/engine";
import { questions } from "../data/questions";
it("round-trips the portrait without names or individual answers", () => {
  const profile = scoreAnswers(questions, [
    { questionId: "r01", option: 0, durationMs: 1000 },
    { questionId: "r02", option: 1, durationMs: 20000 },
  ]);
  const input = { profile, locale: "fr" as const, length: 10 };
  expect(decodeResult(encodeResult(input))).toEqual(input);
  expect(
    atob(encodeResult(input).replaceAll("-", "+").replaceAll("_", "/")),
  ).not.toContain("questionId");
});
it("rejects malformed and out-of-range shared data", () => {
  for (const value of [
    "",
    "oops",
    "<script>",
    "a".repeat(8001),
    btoa("{}"),
    btoa(
      JSON.stringify({
        v: 1,
        l: "fr",
        n: 10,
        a: Array.from({ length: 6 }, () => [101, 1, 1, 0, 0]),
      }),
    ),
  ])
    expect(decodeResult(value)).toBeNull();
});
