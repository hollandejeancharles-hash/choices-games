import { expect, it } from "vitest";
import {
  createSession,
  recordAnswer,
  acknowledgeReveal,
  parseSession,
  sessionScreen,
  isComplete,
} from "./session";
it("waits for the final player, persists every reveal and blocks answers until continuation", () => {
  let game = createSession(["A", "B", "C"], 10, 42, "family", {
    reveal: "round",
    timer: 20,
  });
  for (let round = 0; round < 10; round++) {
    for (let player = 0; player < 3; player++) {
      expect(game.pendingReveal).toBeUndefined();
      game = recordAnswer(game, player === 1 ? 1 : 0, 5000);
      expect(parseSession(JSON.stringify(game))).toEqual(game);
      if (player < 2) expect(game.pendingReveal).toBeUndefined();
    }
    expect(game.pendingReveal).toBe(round);
    expect(sessionScreen(game)).toBe("round-reveal");
    expect(recordAnswer(game, 0, 5000)).toBe(game);
    game = acknowledgeReveal(game);
    expect(parseSession(JSON.stringify(game))).toEqual(game);
  }
  expect(isComplete(game)).toBe(true);
  expect(sessionScreen(game)).toBe("recap");
  expect(parseSession(JSON.stringify(game))).toEqual(game);
  expect(sessionScreen(acknowledgeReveal(game))).toBe("result");
});
it("keeps all choices private until the end and restores the final recap", () => {
  let game = createSession(["A", "B"], 10, 42, "couple", {
    reveal: "end",
    timer: 30,
  });
  for (let i = 0; i < 20; i++) {
    game = recordAnswer(game, i % 2 ? 1 : 0, 35000);
    expect(game.pendingReveal).toBeUndefined();
    expect(parseSession(JSON.stringify(game))).toEqual(game);
    if (i < 19) expect(game.pendingRecap).toBeUndefined();
  }
  expect(sessionScreen(game)).toBe("recap");
  expect(sessionScreen(acknowledgeReveal(game))).toBe("result");
});
it("rejects premature or corrupt reveals and invalid timer settings", () => {
  const game = createSession(["A", "B"], 10, 1, "general", {
    reveal: "round",
    timer: 0,
  });
  for (const extra of [
    { pendingReveal: 0 },
    { pendingRecap: true },
    { groupOptions: { reveal: "round", timer: 12 } },
  ])
    expect(parseSession(JSON.stringify({ ...game, ...extra }))).toBeNull();
});
