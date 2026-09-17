/** Positive pole first: adventure, reason, independence, future, structure, ambition. */
export const AXES = [
  "adventure",
  "reason",
  "independence",
  "future",
  "structure",
  "ambition",
] as const;
export type Axis = (typeof AXES)[number];
export type Vector = Record<Axis, number>;
export type Weight = -3 | -2 | -1 | 1 | 2 | 3;
export type Weights = Partial<Record<Axis, Weight>>;
export type Locale = "fr" | "en";
export type Localized = Record<Locale, string>;
export type Theme =
  | "travel"
  | "work"
  | "relationships"
  | "powers"
  | "everyday"
  | "absurd"
  | "ethics";
export interface Option {
  text: Localized;
  weights: Weights;
}
export interface Question {
  pack?: "general" | "friendship" | "couple" | "family";
  stableScoring?: boolean;
  id: string;
  theme: Theme;
  prompt: Localized;
  options: readonly [Option, Option];
  /** Same axis and sign convention across a consistency pair. */
  consistency?: { pairId: string; axis: Axis };
}
export interface Answer {
  questionId: string;
  option: 0 | 1;
  durationMs: number;
}
export interface AxisResult {
  score: number;
  count: number;
  coherence: number;
  confidence: number;
  slowCount: number;
  conflicted: boolean;
}
export interface Profile {
  vector: Vector;
  axes: Record<Axis, AxisResult>;
  contradictions: Axis[];
  hesitations: Axis[];
}
export interface Archetype {
  id: string;
  name: Localized;
  description: Localized;
  target: Vector;
  prior: number;
}
export type GameLength = 10 | 15 | 25;
export interface Player {
  id: string;
  name: string;
  answers: Answer[];
}
export interface Game {
  version: 1;
  mode: "solo" | "group";
  length: GameLength;
  players: Player[];
  questionIds: string[];
  currentPlayer: number;
}
export function vector(value = 0): Vector {
  return Object.fromEntries(AXES.map((axis) => [axis, value])) as Vector;
}
