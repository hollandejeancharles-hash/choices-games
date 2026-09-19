import { expect, it } from "vitest";
import { updateDiscussion } from "./discussion";
import {
  createSession,
  recordAnswer,
  acknowledgeReveal,
  parseSession,
} from "./session";
import { longestDiscussion } from "../core/group-story";
import type { RoomState } from "./rooms";
it("records reveal time separately from answer time and persists it", () => {
  let s = createSession(["A", "B"], 10, 42, "family", {
    reveal: "round",
    timer: 0,
  });
  s = recordAnswer(s, 0, 80000);
  s = recordAnswer(s, 1, 1000);
  const id = s.questionIds[0]!;
  s.discussionStartedAt = 10000;
  s = acknowledgeReveal(s, 14000);
  expect(s.discussionDurations?.[id]).toBe(4000);
  expect(parseSession(JSON.stringify(s))?.discussionDurations).toEqual(
    s.discussionDurations,
  );
});
it("does not invent a duration for an older reveal", () => {
  let s = createSession(["A", "B"], 10, 42, "family", {
    reveal: "round",
    timer: 0,
  });
  s = recordAnswer(s, 0, 1000);
  s = recordAnswer(s, 1, 1000);
  delete s.discussionStartedAt;
  expect(acknowledgeReveal(s).discussionDurations).toBeUndefined();
  expect(longestDiscussion(undefined, s.questionIds)).toBeUndefined();
});
it("chooses the longest discussion, not the first or the most divided", () => {
  expect(
    longestDiscussion({ a: 1000, b: 40000, c: 2000 }, ["a", "b", "c"])?.id,
  ).toBe("b");
});
it("online timestamps exclude answer time and ignore missed rounds", () => {
  const log = { durations: {}, pending: { id: "q1", round: 0, start: 10000 } };
  const next = {
    round: 1,
    phase: "question",
    startedAt: new Date(16000).toISOString(),
  } as RoomState;
  expect(updateDiscussion(log, next).durations.q1).toBe(6000);
  expect(
    updateDiscussion(log, { ...next, round: 3 }).durations.q1,
  ).toBeUndefined();
});
