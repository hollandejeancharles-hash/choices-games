import { expect, it } from 'vitest';
import { createSession, isComplete, parseSession, recordAnswer } from './session';
it('completes a solo game and round-trips each saved state', () => {
  let game = createSession(['A'], 10, 123);
  for (let i = 0; i < 10; i++) {
    expect(parseSession(JSON.stringify(game))).toEqual(game);
    game = recordAnswer(game, i % 2 ? 1 : 0, 7000);
  }
  expect(isComplete(game)).toBe(true);
  expect(parseSession(JSON.stringify(game))).toEqual(game);
  expect(recordAnswer(game, 0, 1000)).toBe(game);
});
it('gives every player the same question before selecting the next one', () => {
  let game = createSession(['A', 'B', 'C'], 10, 123);
  for (let round = 0; round < 10; round++) {
    const questionId = game.questionIds.at(-1);
    for (let player = 0; player < 3; player++) {
      expect(game.currentPlayer).toBe(player);
      expect(game.questionIds.at(-1)).toBe(questionId);
      game = recordAnswer(game, player === 1 ? 1 : 0, 4000);
      expect(parseSession(JSON.stringify(game))).toEqual(game);
    }
  }
  expect(isComplete(game)).toBe(true);
  expect(game.players[0]?.answers.map(a => a.questionId)).toEqual(game.players[2]?.answers.map(a => a.questionId));
});
it('rejects corrupted storage and produces reproducible seeded selections', () => {
  expect(parseSession('{oops')).toBeNull(); expect(parseSession('{}')).toBeNull();
  const game = createSession(['A'], 15, 43);
  expect(createSession(['A'], 15, 43)).toEqual(game);
  expect(parseSession(JSON.stringify({ ...game, currentPlayer: 8 }))).toBeNull();
  expect(parseSession(JSON.stringify({ ...game, questionIds: ['missing'] }))).toBeNull();
});
