import type { Answer, Game, GameLength, Locale, Player, Question } from '../core/types';
import { selectQuestion } from '../core/engine';
import { questions } from '../data/questions';
export const GAME_KEY = 'dilemma.game.v1';
export function readPreference(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
export function savePreference(key: string, value: string): boolean { try { localStorage.setItem(key, value); return true; } catch { return false; } }
export function initialLocale(): Locale { return readPreference('dilemma.locale') === 'en' ? 'en' : readPreference('dilemma.locale') === 'fr' ? 'fr' : navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'; }
export interface Session extends Game { seed: number }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1 || !['solo', 'group'].includes(String(data.mode)) || ![10, 15, 25].includes(Number(data.length)) || typeof data.length !== 'number' || !Number.isInteger(data.seed) || typeof data.seed !== 'number' || !Array.isArray(data.players) || !Array.isArray(data.questionIds) || typeof data.currentPlayer !== 'number') return null;
    if (data.players.length < (data.mode === 'group' ? 2 : 1) || data.players.length > (data.mode === 'group' ? 6 : 1)) return null;
    if (data.questionIds.length < 1 || data.questionIds.length > data.length || new Set(data.questionIds).size !== data.questionIds.length || data.questionIds.some(id => typeof id !== 'string' || !questions.some(q => q.id === id))) return null;
    if (!Number.isInteger(data.currentPlayer) || data.currentPlayer < 0 || data.currentPlayer >= data.players.length) return null;
    const players: Player[] = [];
    for (const p of data.players) {
      if (!record(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || p.name.length > 40 || !Array.isArray(p.answers)) return null;
      const answers: Answer[] = [];
      for (const [index, a] of p.answers.entries()) {
        if (!record(a) || a.questionId !== data.questionIds[index] || typeof a.questionId !== 'string' || (a.option !== 0 && a.option !== 1) || typeof a.durationMs !== 'number' || !Number.isFinite(a.durationMs) || a.durationMs < 0) return null;
        answers.push({ questionId: a.questionId, option: a.option, durationMs: a.durationMs });
      }
      players.push({ id: p.id, name: p.name, answers });
    }
    if (new Set(players.map(p => p.id)).size !== players.length) return null;
    const complete = players.every(p => p.answers.length === data.length);
    if (!complete && players.some((p, i) => p.answers.length !== (data.questionIds as unknown[]).length - (i < Number(data.currentPlayer) ? 0 : 1))) return null;
    if (complete && data.currentPlayer !== 0) return null;
    return { version: 1, mode: data.mode as Game['mode'], length: data.length as GameLength, seed: data.seed, questionIds: data.questionIds as string[], players, currentPlayer: data.currentPlayer };
  } catch { return null; }
}
export function loadSession(): Session | null { return parseSession(readPreference(GAME_KEY)); }
export function saveSession(session: Session): boolean { return savePreference(GAME_KEY, JSON.stringify(session)); }
export function shuffledBank(seed: number): Question[] {
  let state = seed >>> 0;
  const bank = [...questions];
  for (let i = bank.length - 1; i > 0; i--) { state = (Math.imul(1664525, state) + 1013904223) >>> 0; const j = state % (i + 1); [bank[i], bank[j]] = [bank[j]!, bank[i]!]; }
  return bank;
}
export function createSession(names: string[], length: GameLength, seed: number): Session {
  if (names.length < 1 || names.length > 6 || ![10, 15, 25].includes(length)) throw new Error('Invalid game settings');
  const players = names.map((name, i) => ({ id: String(i + 1), name: name.trim().slice(0, 40), answers: [] }));
  const first = selectQuestion(shuffledBank(seed), players.map(p => p.answers));
  if (!first) throw new Error('Question bank is empty');
  return { version: 1, mode: names.length === 1 ? 'solo' : 'group', length, players, seed, questionIds: [first.id], currentPlayer: 0 };
}
export function isComplete(session: Session): boolean { return session.players.every(p => p.answers.length === session.length); }
export function recordAnswer(session: Session, option: 0 | 1, durationMs: number): Session {
  if (isComplete(session)) return session;
  const id = session.questionIds.at(-1)!;
  const current = session.players[session.currentPlayer]!;
  if (current.answers.some(a => a.questionId === id)) return session;
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('Invalid duration');
  const players = session.players.map((p, i) => i === session.currentPlayer ? { ...p, answers: [...p.answers, { questionId: id, option, durationMs }] } : p);
  if (session.currentPlayer < players.length - 1) return { ...session, players, currentPlayer: session.currentPlayer + 1 };
  const updated = { ...session, players, currentPlayer: 0 };
  if (isComplete(updated)) return updated;
  const next = selectQuestion(shuffledBank(session.seed), players.map(p => p.answers), session.questionIds);
  if (!next) throw new Error('Question bank exhausted');
  return { ...updated, questionIds: [...session.questionIds, next.id] };
}
