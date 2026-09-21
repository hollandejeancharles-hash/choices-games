import type { Locale, Question } from "../core/types";
import { archetypes, axisCopy } from "../data/archetypes";
import { questions } from "../data/questions";
import type { CloudResult, strongestEvolution } from "./player-cloud";

// The card and the voting screen must resolve exactly the same daily question.
export function dailyQuestion(day: string): Question {
  const bank = questions.filter((item) => item.pack === "general");
  const seed = [...day].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );
  return bank[seed % bank.length]!;
}

export function portraitIdentity(result: CloudResult, locale: Locale) {
  const archetype = archetypes.find((item) => item.id === result.archetypeId);
  return {
    name:
      archetype?.name[locale] ??
      (locale === "fr" ? "Mon portrait" : "My portrait"),
    description: archetype?.description[locale] ?? "",
    image: `./avatars/${archetype?.id ?? "compass"}.png`,
  };
}

export function evolutionDirection(
  evolution: ReturnType<typeof strongestEvolution>,
  locale: Locale,
) {
  return axisCopy[evolution.axis][
    evolution.delta < 0 ? "negative" : "positive"
  ][locale];
}
