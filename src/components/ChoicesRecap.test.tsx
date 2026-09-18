import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChoicesRecap } from "./ChoicesRecap";
import { questions } from "../data/questions";
import type { Session } from "../services/session";
const q = questions[0]!;
const session = (choices: (0 | 1)[]): Session => ({
  version: 1,
  mode: "group",
  length: 10,
  seed: 0,
  currentPlayer: 0,
  questionIds: [q.id],
  players: choices.map((option, i) => ({
    id: String(i),
    name: `Player ${i}`,
    answers: [{ questionId: q.id, option, durationMs: 1000 }],
  })),
});
describe("choices recap vote representation", () => {
  it("fills the entire bar for unanimity and omits the empty segment", () => {
    const html = renderToStaticMarkup(
      <ChoicesRecap
        session={session([0, 0, 0, 0])}
        locale="fr"
        onContinue={() => {}}
      />,
    );
    expect(html).toContain("width:100%");
    expect(html).not.toContain("width:0%");
    expect(html).toContain("Aucun vote");
  });
  it("represents an odd group majority without labeling it 50/50", () => {
    const html = renderToStaticMarkup(
      <ChoicesRecap
        session={session([0, 0, 1])}
        locale="en"
        onContinue={() => {}}
      />,
    );
    expect(html).toContain("Different views");
    expect(html).not.toContain(">50 / 50<");
    expect(html).toContain(q.prompt.en);
  });
  it("does not disclose an unfinished round", () => {
    const s = session([0, 1]);
    s.players[1]!.answers = [];
    const html = renderToStaticMarkup(
      <ChoicesRecap session={s} locale="fr" onContinue={() => {}} />,
    );
    expect(html).not.toContain(q.prompt.fr);
    expect(html).not.toContain("recap-card-top");
  });
});
