import type { Localized } from "../core/types";
const l = (fr: string, en: string): Localized => ({ fr, en });
export interface FictionReference {
  name: string;
  universe: Localized;
  traits: Localized;
  resemblance: Localized;
  downside: Localized;
}
export const fictionReferences: Record<string, FictionReference> = {
  scout: {
    name: "Jack Sparrow",
    universe: l(
      "Pirates des Caraïbes · Cinéma",
      "Pirates of the Caribbean · Film",
    ),
    traits: l(
      "Improvisation · Liberté · Risque",
      "Improvisation · Freedom · Risk",
    ),
    resemblance: l(
      "Comme lui, tu peux préférer une sortie audacieuse à un plan bien balisé. Ton double avance avec panache, même sans garantie.",
      "Like him, you may prefer a daring escape to a well-marked route. Your fictional double moves with flair, even without guarantees.",
    ),
    downside: l(
      "À force de compter sur ton talent pour retomber sur tes pieds, tu peux laisser ton équipage gérer les conséquences.",
      "Relying on your knack for landing on your feet can leave your crew dealing with the consequences.",
    ),
  },
  strategist: {
    name: "Lelouch",
    universe: l("Code Geass · Anime", "Code Geass · Anime"),
    traits: l(
      "Stratégie · Anticipation · Contrôle",
      "Strategy · Foresight · Control",
    ),
    resemblance: l(
      "Ton double aime avoir plusieurs coups d’avance et garder le cap quand les autres hésitent.",
      "Your double likes staying several moves ahead and holding course when others hesitate.",
    ),
    downside: l(
      "Un plan brillant peut finir par traiter les proches comme des pièces sur un échiquier.",
      "A brilliant plan can end up treating loved ones as pieces on a chessboard.",
    ),
  },
  guardian: {
    name: "Marlin",
    universe: l("Le Monde de Nemo · Animation", "Finding Nemo · Animation"),
    traits: l(
      "Protection · Prudence · Attachement",
      "Protection · Caution · Attachment",
    ),
    resemblance: l(
      "Ton double veut mettre les siens à l’abri et repère les dangers avant tout le monde.",
      "Your double wants to keep loved ones safe and spots danger before everyone else.",
    ),
    downside: l(
      "À vouloir protéger de tout, il risque aussi d’empêcher les autres de vivre leurs propres aventures.",
      "Trying to protect others from everything can stop them from having their own adventures.",
    ),
  },
  sensitive: {
    name: "Wanda Maximoff",
    universe: l("WandaVision · Série", "WandaVision · Series"),
    traits: l(
      "Émotion · Attachement · Intensité",
      "Emotion · Attachment · Intensity",
    ),
    resemblance: l(
      "Pour ton double, les liens affectifs peuvent peser plus lourd que toutes les règles abstraites.",
      "For your double, emotional bonds can outweigh every abstract rule.",
    ),
    downside: l(
      "Le désir de préserver un lien peut rendre les besoins des autres plus difficiles à entendre.",
      "The desire to preserve a bond can make other people’s needs harder to hear.",
    ),
  },
  builder: {
    name: "Hermione Granger",
    universe: l("Harry Potter · Fiction", "Harry Potter · Fiction"),
    traits: l(
      "Méthode · Exigence · Préparation",
      "Method · High standards · Preparation",
    ),
    resemblance: l(
      "Ton double prépare, vérifie et veut une solution qui tienne vraiment debout.",
      "Your double prepares, checks and wants a solution that truly holds up.",
    ),
    downside: l(
      "À force de connaître la bonne méthode, il peut oublier de laisser les autres essayer la leur.",
      "Knowing the right method can make your double forget to let others try their own.",
    ),
  },
  free: {
    name: "Han Solo",
    universe: l("Star Wars · Cinéma", "Star Wars · Film"),
    traits: l(
      "Indépendance · Audace · Répartie",
      "Independence · Boldness · Wit",
    ),
    resemblance: l(
      "Ton double tient à rester maître de sa route et se méfie des obligations imposées.",
      "Your double wants to steer their own course and distrusts imposed obligations.",
    ),
    downside: l(
      "Préserver sa liberté à tout prix peut donner aux autres l’impression de ne jamais pouvoir compter sur lui.",
      "Protecting freedom at any cost can make others feel they can never rely on your double.",
    ),
  },
  visionary: {
    name: "Tony Stark",
    universe: l("Iron Man · Cinéma", "Iron Man · Film"),
    traits: l(
      "Vision · Ambition · Ingéniosité",
      "Vision · Ambition · Ingenuity",
    ),
    resemblance: l(
      "Ton double voit ce qui pourrait exister et veut construire la solution avant que tout le monde y croie.",
      "Your double sees what could exist and wants to build the solution before everyone believes in it.",
    ),
    downside: l(
      "Être convaincu de sauver demain peut conduire à décider seul des risques que les autres prennent aujourd’hui.",
      "Being convinced you can save tomorrow may lead you to decide alone what risks others take today.",
    ),
  },
  mediator: {
    name: "Chidi Anagonye",
    universe: l("The Good Place · Série", "The Good Place · Series"),
    traits: l("Nuance · Réflexion · Doute", "Nuance · Reflection · Doubt"),
    resemblance: l(
      "Ton double voit une raison valable de chaque côté et refuse de simplifier trop vite.",
      "Your double sees a valid reason on each side and refuses to oversimplify.",
    ),
    downside: l(
      "À vouloir le choix irréprochable, il peut laisser la décision aux autres ou attendre qu’il soit trop tard.",
      "Searching for the flawless choice can mean leaving the decision to others or waiting too long.",
    ),
  },
  compass: {
    name: "Steve Rogers",
    universe: l("Captain America · Cinéma", "Captain America · Film"),
    traits: l(
      "Principes · Fidélité · Détermination",
      "Principles · Loyalty · Determination",
    ),
    resemblance: l(
      "Ton double garde un principe auquel se tenir, même quand le groupe pousse dans l’autre sens.",
      "Your double holds on to a principle even when the group pushes the other way.",
    ),
    downside: l(
      "La fidélité à une conviction peut se transformer en rigidité quand le contexte demande de la revoir.",
      "Loyalty to a conviction can become rigidity when the situation calls for reconsidering it.",
    ),
  },
  present: {
    name: "Homer Simpson",
    universe: l("Les Simpson · Animation", "The Simpsons · Animation"),
    traits: l(
      "Instant · Plaisir · Spontanéité",
      "The moment · Pleasure · Spontaneity",
    ),
    resemblance: l(
      "Ton double sait saisir une occasion de profiter de la vie sans tout reporter à demain.",
      "Your double knows how to enjoy life without postponing everything until tomorrow.",
    ),
    downside: l(
      "Le plaisir immédiat peut laisser à son futur soi, ou à ses proches, une addition un peu salée.",
      "Immediate pleasure can leave a hefty bill for your future self or loved ones.",
    ),
  },
};
