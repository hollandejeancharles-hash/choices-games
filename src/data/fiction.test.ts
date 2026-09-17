import { expect, it } from "vitest";
import { archetypes } from "./archetypes";
import { fictionReferences } from "./fiction";
it("gives each of the ten portraits a complete bilingual fiction reference", () => {
  expect(Object.keys(fictionReferences).sort()).toEqual(
    archetypes.map((a) => a.id).sort(),
  );
  for (const archetype of archetypes) {
    const reference = fictionReferences[archetype.id]!;
    expect(reference.name.length).toBeGreaterThan(0);
    for (const locale of ["fr", "en"] as const)
      for (const field of [
        "universe",
        "traits",
        "resemblance",
        "downside",
      ] as const)
        expect(reference[field][locale].length).toBeGreaterThan(10);
  }
});
