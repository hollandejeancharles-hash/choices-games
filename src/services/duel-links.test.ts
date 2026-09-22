import { expect, it } from "vitest";
import { duoCodeFromLocation, duoLink } from "./duel-links";

it("crée un lien profond vers un Duo", () => {
  expect(
    duoLink("abcd1234", "https://dilemme.app/current?old=1#fragment"),
  ).toBe("https://dilemme.app/current?account=1&duo=ABCD1234");
});

it("ne lit que les codes Duo valides", () => {
  expect(
    duoCodeFromLocation("https://dilemme.app/?account=1&duo=abcd1234"),
  ).toBe("ABCD1234");
  expect(duoCodeFromLocation("https://dilemme.app/?duo=bad")).toBeNull();
});
