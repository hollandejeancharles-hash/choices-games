import { describe, expect, it } from "vitest";
import { bonusPortraits } from "./bonus";
import { scoreAnswers } from "./engine";
import { questions } from "../data/questions";

describe("bonus portraits", () => {
  it("does not invent a result without measured answers", () => {
    expect(bonusPortraits(scoreAnswers(questions, []))).toEqual({
      dark: null,
      values: null,
    });
  });
  it("follows the chosen pole and ignores unmeasured axes", () => {
    const question =
      questions.find((q) => q.id === "i01") ??
      questions.find((q) => q.options[0].weights.independence === 3)!;
    const positive = bonusPortraits(
      scoreAnswers(questions, [
        { questionId: question.id, option: 0, durationMs: 1000 },
      ]),
    );
    const negative = bonusPortraits(
      scoreAnswers(questions, [
        { questionId: question.id, option: 1, durationMs: 1000 },
      ]),
    );
    expect(positive.values?.autonomy).toBeGreaterThan(50);
    expect(negative.values?.autonomy).toBeLessThan(50);
    expect(positive.values?.count).toBe(1);
    expect(positive.dark?.intensity).toBeLessThanOrEqual(100);
    expect(negative.dark?.intensity).toBeGreaterThanOrEqual(0);
  });
});
