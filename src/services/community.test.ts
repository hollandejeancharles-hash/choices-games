import { describe, expect, it } from "vitest";
import { isCommunityQuestion, validateProposal } from "./community";
const valid = {
  id: "community-12345678-1234-1234-1234-123456789abc",
  theme: "ethics",
  prompt: { fr: "Une situation", en: "A situation" },
  options: [
    {
      text: { fr: "Premier choix", en: "First choice" },
      weights: { reason: 3 },
    },
    {
      text: { fr: "Second choix", en: "Second choice" },
      weights: { reason: -3 },
    },
  ],
};
describe("community catalog boundary", () => {
  it("accepts bilingual approved-format questions", () =>
    expect(isCommunityQuestion(valid)).toBe(true));
  it("rejects partial, invalid and oversized data", () => {
    for (const value of [
      null,
      {},
      { ...valid, id: "r01" },
      { ...valid, prompt: { fr: "sans traduction" } },
      { ...valid, prompt: { fr: "x".repeat(1201), en: "text" } },
      { ...valid, options: [valid.options[0]] },
      {
        ...valid,
        options: [
          { ...valid.options[0], weights: { reason: 99 } },
          valid.options[1],
        ],
      },
    ])
      expect(isCommunityQuestion(value)).toBe(false);
  });
});

describe("proposal validation", () => {
  const validProposal = {
    prompt: "Une situation suffisamment longue pour être proposée.",
    a: "Un premier choix difficile.",
    b: "Un second choix tout aussi difficile.",
  };

  it("accepts a valid trimmed proposal", () =>
    expect(validateProposal(validProposal)).toBeNull());

  it("matches the database checks before submitting", () => {
    expect(validateProposal({ ...validProposal, prompt: "  trop court  " })).toBe(
      "prompt-length",
    );
    expect(validateProposal({ ...validProposal, a: " court " })).toBe(
      "option-a-length",
    );
    expect(validateProposal({ ...validProposal, b: validProposal.a })).toBe(
      "choices-identical",
    );
  });
});
