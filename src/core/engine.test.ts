import { describe, expect, it } from 'vitest';
import { compareGroup, compatibility, rankArchetypes, scoreAnswers, selectQuestion, timingMultiplier } from './engine';
import { vector, type Answer, type Archetype, type Axis, type Question } from './types';
const text = { fr: 'Exemple', en: 'Example' };
function question(id: string, axis: Axis = 'adventure', theme: Question['theme'] = 'travel'): Question {
  return { id, theme, prompt: text, options: [{ text, weights: { [axis]: 3 } }, { text, weights: { [axis]: -3 } }] };
}
const answer = (id: string, option: 0 | 1 = 0, durationMs = 5000): Answer => ({ questionId: id, option, durationMs });
describe('scoring', () => {
  it('applies timing thresholds and rejects invalid durations', () => {
    expect([2999, 3000, 15000, 15001].map(timingMultiplier)).toEqual([1.25, 1, 1, 0.75]);
    for (const duration of [-1, NaN, Infinity]) expect(() => timingMultiplier(duration)).toThrow();
  });
  it('keeps timing effects visible even for one answer', () => {
    const bank = [question('a')];
    expect(scoreAnswers(bank, [answer('a', 0, 1000)]).vector.adventure).toBe(100);
    expect(scoreAnswers(bank, [answer('a')]).vector.adventure).toBe(80);
    const slow = scoreAnswers(bank, [answer('a', 1, 20000)]);
    expect(slow.vector.adventure).toBe(-60);
    expect(slow.hesitations).toEqual(['adventure']);
    expect(slow.axes.reason.count).toBe(0);
  });
  it('distinguishes unmeasured axes from conflicting evidence', () => {
    const bank = [question('a'), question('b')];
    const profile = scoreAnswers(bank, [answer('a'), answer('b', 1)]);
    expect(profile.vector.adventure).toBe(0);
    expect(profile.axes.adventure.conflicted).toBe(true);
    expect(profile.axes.adventure.confidence).toBeGreaterThan(0);
    expect(profile.axes.reason.confidence).toBe(0);
    expect(profile.axes.reason.conflicted).toBe(false);
  });
  it('detects pair contradictions without changing the score', () => {
    const bank = [question('a'), question('b')].map(q => ({ ...q, consistency: { pairId: 'risk', axis: 'adventure' as const } }));
    const answers = [answer('a'), answer('b', 1)];
    expect(scoreAnswers(bank, answers).contradictions).toEqual(['adventure']);
    expect(scoreAnswers(bank, answers).vector).toEqual(scoreAnswers([question('a'), question('b')], answers).vector);
  });
  it('does not count unchosen axis weights as evidence', () => {
    const q: Question = { ...question('a'), options: [{ text, weights: { adventure: 2 } }, { text, weights: { reason: 3 } }] };
    expect(scoreAnswers([q], [answer('a')]).axes.reason.count).toBe(0);
  });
  it('rejects unknown or repeated answers', () => {
    expect(() => scoreAnswers([], [answer('a')])).toThrow();
    expect(() => scoreAnswers([question('a')], [answer('a'), answer('a')])).toThrow();
    expect(scoreAnswers([], []).vector).toEqual(vector());
  });
});
describe('adaptive selection', () => {
  it('prioritizes an unmeasured axis and excludes answered questions', () => {
    const bank = [question('a'), question('b'), question('c', 'reason')];
    expect(selectQuestion(bank, [[answer('a')]])?.id).toBe('c');
    expect(selectQuestion([bank[0]!], [[answer('a')]])).toBeUndefined();
  });
  it('revisits ambiguous axes and avoids recent themes', () => {
    const bank = [question('a'), question('b'), question('c'), question('d', 'reason', 'work')];
    expect(selectQuestion(bank, [[answer('a'), answer('b', 1)]])?.id).toBe('c');
    expect(selectQuestion(bank, [[answer('a'), answer('b', 1)]], ['a', 'b'])?.id).toBe('d');
  });
  it('uses group evidence and is independent of player order', () => {
    const bank = [question('a'), question('b', 'reason'), question('c'), question('d', 'reason'), question('e', 'future')];
    const histories = [[answer('a')], [answer('b')]];
    expect(selectQuestion(bank, histories)?.id).toBe('e');
    expect(selectQuestion(bank, [...histories].reverse())?.id).toBe('e');
    expect(() => selectQuestion(bank, [])).toThrow();
  });
});
describe('archetypes and compatibility', () => {
  const archetypes: Archetype[] = [-80, 0, 80].map((value, index) => ({ id: String(index), name: text, description: text, target: vector(value), prior: index + 1 }));
  it('ranks nearest targets including neutral profiles; rarity comes from priors', () => {
    const ranked = rankArchetypes(vector(70), archetypes);
    expect(ranked.map(r => r.archetype.id)).toEqual(['2', '1', '0']);
    expect(ranked[0]?.fictionalRarity).toBe(50);
    expect(rankArchetypes(vector(), archetypes)[0]?.archetype.id).toBe('1');
    expect(() => rankArchetypes(vector(), [])).toThrow();
  });
  it('has symmetric bounded similarity and sensible endpoints', () => {
    expect(compatibility(vector(-100), vector(100))).toBe(0);
    expect(compatibility(vector(30), vector(30))).toBe(100);
    expect(compatibility(vector(-20), vector(80))).toBe(50);
    expect(compatibility(vector(80), vector(-20))).toBe(50);
    expect(() => compatibility(vector(NaN), vector())).toThrow();
  });
  it('finds closest pairs and divided questions; unanimity has no division', () => {
    const bank = [question('a')];
    const players = [0, 1, 2].map(id => ({ id: String(id), name: String(id), answers: [answer('a', id === 2 ? 1 : 0)] }));
    const result = compareGroup(bank, players);
    expect(result.closest.players).toEqual(['0', '1']);
    expect(result.closest.similarity).toBe(100);
    expect(result.furthest.similarity).toBeLessThan(100);
    expect(result.mostDivisive?.questionId).toBe('a');
    expect(compareGroup(bank, players.slice(0, 2)).mostDivisive).toBeUndefined();
    expect(() => compareGroup(bank, players.slice(0, 1))).toThrow();
  });
});
