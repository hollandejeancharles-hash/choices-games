import { expect, it } from 'vitest';
import { AXES } from '../core/types';
import { questions } from './questions';
import { archetypes } from './archetypes';
import { scoreAnswers, selectQuestion } from '../core/engine';
it('has 60 unique bilingual dilemmas with 1–3 valid nonzero weights per option', () => {
  expect(questions.length).toBeGreaterThanOrEqual(60);
  expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
  for (const q of questions) {
    for (const value of [q.prompt, ...q.options.map(o => o.text)]) {
      expect(value.fr.length).toBeGreaterThan(15); expect(value.en.length).toBeGreaterThan(15);
      expect(value.fr).not.toBe(value.en);
    }
    expect(q.options[0].text).not.toEqual(q.options[1].text);
    for (const o of q.options) {
      const weights = Object.values(o.weights);
      expect(weights.length).toBeGreaterThanOrEqual(1); expect(weights.length).toBeLessThanOrEqual(3);
      for (const w of weights) expect([-3, -2, -1, 1, 2, 3]).toContain(w);
    }
  }
});
it('covers both directions of every axis and all seven themes', () => {
  for (const axis of AXES) for (const sign of [-1, 1]) {
    expect(questions.filter(q => q.options.some(o => Math.sign(o.weights[axis] ?? 0) === sign)).length).toBeGreaterThanOrEqual(10);
  }
  expect(new Set(questions.map(q => q.theme)).size).toBe(7);
  for (const axis of AXES) {
    const paired = questions.filter(q => q.consistency?.axis === axis);
    expect(paired.length).toBe(2);
    expect(paired[0]?.consistency?.pairId).toBe(paired[1]?.consistency?.pairId);
  }
});
it('defines ten complete archetypes and a theoretical distribution totalling 100', () => {
  expect(archetypes.length).toBe(10);
  expect(new Set(archetypes.map(a => a.id)).size).toBe(10);
  expect(archetypes.reduce((sum, a) => sum + a.prior, 0)).toBe(100);
  for (const a of archetypes) for (const axis of AXES) expect(Math.abs(a.target[axis])).toBeLessThanOrEqual(100);
});
it('can complete each duration with coverage and no repeated questions', () => {
  for (const length of [10, 15, 25]) for (const option of [0, 1] as const) {
    const answers = [];
    for (let i = 0; i < length; i++) {
      const next = selectQuestion(questions, [answers], answers.map(a => a.questionId));
      expect(next).toBeDefined();
      answers.push({ questionId: next!.id, option, durationMs: 5000 });
    }
    expect(new Set(answers.map(a => a.questionId)).size).toBe(length);
    const profile = scoreAnswers(questions, answers);
    for (const axis of AXES) expect(profile.axes[axis].count).toBeGreaterThan(0);
  }
});
