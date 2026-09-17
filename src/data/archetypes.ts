import {
  AXES,
  type Archetype,
  type Axis,
  type Localized,
  type Vector,
} from "../core/types";
const l = (fr: string, en: string): Localized => ({ fr, en });
const target = (
  ...values: [number, number, number, number, number, number]
): Vector =>
  Object.fromEntries(AXES.map((axis, i) => [axis, values[i]])) as Vector;
export const archetypes: Archetype[] = [
  {
    id: "scout",
    name: l("L’Éclaireur", "The Pathfinder"),
    description: l(
      "Tu acceptes l’incertitude quand elle ouvre une voie qui compte. Ton courage gagne à garder une place pour le doute : avancer ne signifie pas tout risquer.",
      "You accept uncertainty when it opens a meaningful path. Your courage benefits from room for doubt: moving forward need not mean risking everything.",
    ),
    target: target(75, 0, 30, 20, -50, 20),
    prior: 9,
  },
  {
    id: "strategist",
    name: l("Le Stratège", "The Strategist"),
    description: l(
      "Tu regardes les conséquences au-delà de l’instant et tu sais tenir un cap. N’oublie pas les personnes derrière les chiffres : même les meilleurs plans ont besoin d’écoute.",
      "You look beyond the moment and know how to hold a course. Keep sight of the people behind the numbers: even the best plans need a listening ear.",
    ),
    target: target(0, 65, 25, 70, 45, 25),
    prior: 11,
  },
  {
    id: "guardian",
    name: l("Le Gardien", "The Guardian"),
    description: l(
      "Tu protèges ce qui permet aux autres de tenir : les liens, les repères, la confiance. Ta présence compte ; tes propres limites méritent autant de soin.",
      "You protect what helps others hold on: relationships, stability and trust. Your presence matters; your own boundaries deserve just as much care.",
    ),
    target: target(-55, -35, -65, 20, 50, -45),
    prior: 14,
  },
  {
    id: "sensitive",
    name: l("L’Âme sensible", "The Empath"),
    description: l(
      "Les histoires singulières pèsent lourd dans tes décisions. Cette attention rend ton regard précieux, même quand elle rend les arbitrages plus difficiles.",
      "Individual stories carry weight in your decisions. That attention makes your perspective valuable, even when it makes trade-offs harder.",
    ),
    target: target(0, -75, -35, -50, -15, -30),
    prior: 12,
  },
  {
    id: "builder",
    name: l("Le Bâtisseur", "The Builder"),
    description: l(
      "Tu veux que ce qui compte puisse durer. Tu construis avec patience et méthode ; laisse aussi une fenêtre ouverte aux solutions que personne n’avait prévues.",
      "You want what matters to last. You build with patience and method; leave a window open for solutions nobody anticipated.",
    ),
    target: target(-30, 30, -15, 65, 70, 10),
    prior: 12,
  },
  {
    id: "free",
    name: l("L’Esprit libre", "The Free Spirit"),
    description: l(
      "Tu tiens à pouvoir te reconnaître dans tes choix. Ta liberté est une force, surtout quand elle reste capable d’accueillir les besoins des autres.",
      "You need to recognise yourself in your choices. Your freedom is a strength, especially when it can still make room for other people’s needs.",
    ),
    target: target(35, -10, 75, -20, -60, 10),
    prior: 9,
  },
  {
    id: "visionary",
    name: l("Le Visionnaire", "The Visionary"),
    description: l(
      "Tu peux sacrifier du confort pour une possibilité plus grande. Ton élan ouvre des portes ; vérifier qui peut te suivre rend le chemin plus solide.",
      "You can trade comfort for a larger possibility. Your drive opens doors; checking who can follow makes the journey stronger.",
    ),
    target: target(55, 30, 25, 65, -35, 70),
    prior: 7,
  },
  {
    id: "mediator",
    name: l("Le Médiateur", "The Bridge Builder"),
    description: l(
      "Tu portes plusieurs valeurs à la fois, sans chercher à tout simplifier. Ce sens des nuances est utile ; il ne t’oblige pas à porter chaque conflit sur tes épaules.",
      "You hold several values at once without forcing simple answers. That sense of nuance is useful; it does not mean every conflict belongs on your shoulders.",
    ),
    target: target(0, 0, -35, 0, 0, -30),
    prior: 13,
  },
  {
    id: "compass",
    name: l("La Boussole", "The Compass"),
    description: l(
      "Tu as besoin d’un principe auquel te tenir quand tout devient compliqué. Cette fidélité donne du poids à ta parole ; réexaminer un principe ne la rend pas moins forte.",
      "You need a principle to hold onto when things get complicated. That commitment gives your word weight; reconsidering a principle does not weaken it.",
    ),
    target: target(15, 20, 65, 15, 65, -25),
    prior: 7,
  },
  {
    id: "present",
    name: l("Le Cœur vivant", "The Present Heart"),
    description: l(
      "Tu sais que certaines occasions d’être là ne reviendront pas. Tu donnes du prix au présent ; une petite réserve pour demain peut aussi protéger ce que tu aimes aujourd’hui.",
      "You know some chances to be there will never return. You value the present; a little room for tomorrow can also protect what you love today.",
    ),
    target: target(25, -40, -10, -75, -25, -15),
    prior: 6,
  },
];
export const axisCopy: Record<
  Axis,
  {
    negative: Localized;
    positive: Localized;
    low: Localized;
    high: Localized;
    balanced: Localized;
  }
> = {
  adventure: {
    negative: l("Sécurité", "Security"),
    positive: l("Aventure", "Adventure"),
    low: l(
      "Tu protèges tes appuis lorsque le prix du risque devient lourd.",
      "You protect your foundations when the cost of risk grows.",
    ),
    high: l(
      "Tu acceptes de perdre des garanties pour ouvrir une possibilité.",
      "You accept losing guarantees to open a possibility.",
    ),
    balanced: l(
      "Tu ajustes ta prise de risque aux personnes et aux enjeux.",
      "You adjust risk to the people and stakes involved.",
    ),
  },
  reason: {
    negative: l("Cœur", "Heart"),
    positive: l("Raison", "Reason"),
    low: l(
      "Les liens et les histoires singulières guident tes arbitrages.",
      "Relationships and individual stories guide your trade-offs.",
    ),
    high: l(
      "Tu examines les conséquences, même quand elles sont difficiles à accepter.",
      "You examine consequences, even when they are hard to accept.",
    ),
    balanced: l(
      "Tu fais dialoguer les conséquences et les liens personnels.",
      "You weigh consequences alongside personal connections.",
    ),
  },
  independence: {
    negative: l("Collectif", "Community"),
    positive: l("Indépendance", "Independence"),
    low: l(
      "Tu acceptes de céder de l’espace personnel pour préserver un lien commun.",
      "You give up personal space to preserve a shared bond.",
    ),
    high: l(
      "Tu protèges ton autonomie, même lorsque l’appartenance a un prix.",
      "You protect your autonomy, even when belonging comes at a cost.",
    ),
    balanced: l(
      "Ton besoin de lien compose avec ton besoin de liberté.",
      "Your need for connection works alongside your need for freedom.",
    ),
  },
  future: {
    negative: l("Instant", "Present"),
    positive: l("Avenir", "Future"),
    low: l(
      "Tu accordes une vraie valeur à ce qui ne pourra pas être revécu.",
      "You value what cannot be lived again.",
    ),
    high: l(
      "Tu peux renoncer à un bénéfice immédiat pour préserver la suite.",
      "You can forgo an immediate benefit to protect what comes next.",
    ),
    balanced: l(
      "Tu ne laisses ni demain ni aujourd’hui décider de tout.",
      "You let neither tomorrow nor today decide everything.",
    ),
  },
  structure: {
    negative: l("Créativité", "Creativity"),
    positive: l("Structure", "Structure"),
    low: l(
      "Tu peux repenser une règle pour répondre à une situation singulière.",
      "You can rethink a rule to meet a particular situation.",
    ),
    high: l(
      "Tu protèges les accords et les repères qui rendent les choix prévisibles.",
      "You protect agreements and frameworks that make choices predictable.",
    ),
    balanced: l(
      "Tu cherches un équilibre entre repères communs et adaptation.",
      "You balance shared frameworks with adaptation.",
    ),
  },
  ambition: {
    negative: l("Humilité", "Humility"),
    positive: l("Ambition", "Ambition"),
    low: l(
      "Tu peux agir sans réclamer la lumière, même lorsque ton rôle compte.",
      "You can act without claiming the spotlight, even when your role matters.",
    ),
    high: l(
      "Tu assumes le désir de peser sur la suite et de faire reconnaître ton rôle.",
      "You own your wish to shape what follows and have your role recognised.",
    ),
    balanced: l(
      "Tu doses ta place dans la lumière selon ce qu’elle exige.",
      "You weigh your place in the spotlight against what it demands.",
    ),
  },
};
