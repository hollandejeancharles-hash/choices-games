import { AXES, type Locale, type Player, type Profile } from "./types";
const poles = {
  adventure: {
    fr: ["préserver des repères rassurants", "explorer malgré l’incertitude"],
    en: ["keep familiar, reassuring ground", "explore despite uncertainty"],
  },
  reason: {
    fr: [
      "tenir compte du lien affectif",
      "peser les conséquences pour le plus grand nombre",
    ],
    en: [
      "give weight to emotional bonds",
      "weigh consequences for the wider group",
    ],
  },
  independence: {
    fr: ["préserver le collectif", "garder sa liberté de décision"],
    en: ["protect the group", "keep freedom of choice"],
  },
  future: {
    fr: ["répondre aux besoins du présent", "préparer ce qui vient ensuite"],
    en: ["meet present needs", "prepare for what comes next"],
  },
  structure: {
    fr: ["laisser une place à l’improvisation", "s’appuyer sur un cadre clair"],
    en: ["leave room for improvisation", "rely on a clear framework"],
  },
  ambition: {
    fr: [
      "préserver un équilibre sans chercher à se distinguer",
      "poursuivre un objectif même au prix d’un sacrifice",
    ],
    en: [
      "preserve balance without seeking distinction",
      "pursue a goal even at a personal cost",
    ],
  },
};
export function groupStory(
  profiles: { player: Player; profile: Profile }[],
  locale: Locale,
) {
  const fr = locale === "fr";
  const axes = AXES.filter((a) =>
    profiles.every((p) => p.profile.axes[a].count > 0),
  ).map((axis) => ({
    axis,
    values: profiles.map((p) => p.profile.vector[axis]),
    gap:
      Math.max(...profiles.map((p) => p.profile.vector[axis])) -
      Math.min(...profiles.map((p) => p.profile.vector[axis])),
  }));
  const common = axes
    .filter((a) => a.gap <= 20)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 2);
  const different = axes
    .filter((a) => a.gap > 20)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2);
  const shared = common
    .map(({ axis, values }) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const words = poles[axis][locale];
      return Math.abs(avg) <= 20
        ? fr
          ? `Entre ${words[0]} et ${words[1]}, vos choix gardent un équilibre proche : la situation semble compter davantage qu’une règle unique.`
          : `Between ${words[0]} and ${words[1]}, your choices show a similar balance: context seems to matter more than a single rule.`
        : fr
          ? `Dans ces situations, vous avez tous tendance à ${words[avg > 0 ? 1 : 0]}. Ce terrain commun peut vous rapprocher, même si chacun y arrive pour ses propres raisons.`
          : `In these situations, you all tend to ${words[avg > 0 ? 1 : 0]}. That is shared ground, even when your reasons differ.`;
    })
    .join(" ");
  const contrasts = different
    .map(({ axis, values }) => {
      const lo = Math.min(...values),
        hi = Math.max(...values);
      const names = (value: number) =>
        new Intl.ListFormat(locale, {
          style: "long",
          type: "conjunction",
        }).format(
          profiles
            .filter((_, i) => values[i] === value)
            .map((p) => p.player.name),
        );
      const words = poles[axis][locale];
      return lo < 0 && hi > 0
        ? fr
          ? `Les réponses de ${names(lo)} donnent davantage de place au fait de ${words[0]}. Celles de ${names(hi)} privilégient plutôt le fait de ${words[1]}. Ce sont deux priorités que ces situations vous ont amenés à départager.`
          : `The answers from ${names(lo)} lean toward choosing to ${words[0]}. Those from ${names(hi)} give more weight to choosing to ${words[1]}. These situations asked you to choose between two priorities.`
        : fr
          ? `La tendance à ${words[hi > 0 ? 1 : 0]} ressort davantage dans les réponses de ${names(hi > 0 ? hi : lo)} que dans celles de ${names(hi > 0 ? lo : hi)}. Vous partagez une direction, mais pas toujours la même disposition à en accepter le coût.`
          : `The tendency to ${words[hi > 0 ? 1 : 0]} is stronger in the answers from ${names(hi > 0 ? hi : lo)} than those from ${names(hi > 0 ? lo : hi)}. You share a direction, but may differ in how far you are willing to follow it.`;
    })
    .join(" ");
  return {
    common:
      shared ||
      (fr
        ? "Vos réponses ne dessinent pas de tendance commune assez nette pour vous attribuer une même façon de décider. Les choix que vous partagez restent un bon point de départ pour découvrir vos raisons."
        : "Your answers do not show a strong enough shared tendency to describe one decision style. The choices you share are still a starting point for exploring your reasons."),
    different:
      contrasts ||
      (fr
        ? "Vos tendances restent proches sur les dimensions explorées. Les nuances se trouvent surtout dans les situations précises et dans les raisons que vous avez échangées."
        : "Your tendencies remain close across the dimensions explored. The nuances lie in particular situations and the reasons you shared."),
  };
}
export function longestDiscussion(
  durations: Record<string, number> | undefined,
  ids: readonly string[],
) {
  return ids
    .map((id) => ({ id, ms: durations?.[id] ?? 0 }))
    .filter((x) => Number.isFinite(x.ms) && x.ms > 0)
    .sort((a, b) => b.ms - a.ms)[0];
}
