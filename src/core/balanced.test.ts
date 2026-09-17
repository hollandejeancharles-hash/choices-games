import { expect, it } from "vitest";
import { AXES, type GameLength } from "./types";
import { axisQuotas, primaryAxis } from "./balanced";
import { scoreAnswers } from "./engine";
import { PACKS, packQuestions } from "../data/packs";
import { questions } from "../data/questions";
import { createSession, recordAnswer, parseSession } from "../services/session";
it("provides thirty bilingual questions and five per dimension in each thematic pack", () => {
  for (const pack of PACKS.slice(1)) {
    const bank = packQuestions.filter((q) => q.pack === pack);
    expect(bank).toHaveLength(30);
    for (const axis of AXES)
      expect(bank.filter((q) => primaryAxis(q) === axis)).toHaveLength(5);
  }
});
it("keeps exact quotas, unique questions and pack isolation across formats and seeds", () => {
  for (const pack of PACKS)
    for (const length of [10, 15, 25] as GameLength[])
      for (let seed = 0; seed < 30; seed++) {
        const game = createSession(["A"], length, seed, pack);
        expect(new Set(game.deck).size).toBe(length);
        const bank = game.deck!.map((id) =>
          questions.find((q) => q.id === id)!,
        );
        expect(bank.every((q) => q.pack === pack)).toBe(true);
        for (const axis of AXES)
          expect(bank.filter((q) => primaryAxis(q) === axis).length).toBe(
            axisQuotas(length)[axis],
          );
        expect(parseSession(JSON.stringify(game))).toEqual(game);
      }
});
it("returns identical axis scores for identical dimensional choices regardless of draw or response speed", () => {
  for (const pack of PACKS) {
    const results = [1, 2, 3].map((seed) => {
      let game = createSession(["A", "B"], 10, seed, pack);
      for (let i = 0; i < 20; i++)
        game = recordAnswer(game, i % 2 ? 1 : 0, seed === 1 ? 100 : 30000);
      return game.players.map((p) =>
        AXES.map((axis) => scoreAnswers(questions, p.answers).axes[axis].score),
      );
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  }
});
it("rejects a deck from another pack", () => {
  const game = createSession(["A"], 10, 1, "couple");
  expect(parseSession(JSON.stringify({ ...game, pack: "family" }))).toBeNull();
});
