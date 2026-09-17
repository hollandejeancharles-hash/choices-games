import type { Axis, Locale, Localized, Profile } from "../core/types";
import { bonusPortraits } from "../core/bonus";
import "../styles/bonus.css";
const l = (fr: string, en: string): Localized => ({ fr, en });
const villains: Record<
  Axis,
  { positive: Localized; negative: Localized; high: Localized; low: Localized }
> = {
  adventure: {
    positive: l("Le pyromane du plan parfait", "The chaos enthusiast"),
    negative: l("Le gardien du bouton NON", "The keeper of the NO button"),
    high: l(
      "Dans ta version méchante, même une sortie de secours devient une occasion de tenter un truc. Le chaos t’a ajouté à ses favoris.",
      "In your villain version, even an emergency exit looks like a chance to try something new. Chaos has you on speed dial.",
    ),
    low: l(
      "Ton repaire possède douze issues de secours et aucune sortie autorisée. Même les imprévus doivent prendre rendez-vous.",
      "Your lair has twelve emergency exits and no approved departures. Even surprises have to book an appointment.",
    ),
  },
  reason: {
    positive: l("Le comptable du chaos", "The accountant of chaos"),
    negative: l("Le parrain des exceptions", "The godparent of exceptions"),
    high: l(
      "Ton alter ego prépare un tableur avant son monologue de méchant. La case « dégâts collatéraux » est remarquablement bien alignée.",
      "Your alter ego prepares a spreadsheet before their villain monologue. The collateral damage column is impeccably aligned.",
    ),
    low: l(
      "Ton méchant intérieur annonce des règles universelles… avec une petite exception pour chaque personne qu’il aime.",
      "Your inner villain announces universal rules… with a tiny exception for everyone they love.",
    ),
  },
  independence: {
    positive: l("Le souverain du moi d’abord", "The sovereign of me first"),
    negative: l("Le chef du câlin obligatoire", "The chief of compulsory hugs"),
    high: l(
      "Dans ton empire fictif, le conseil d’administration compte une seule chaise. Tu as voté : tu es d’accord avec toi-même.",
      "Your fictional empire has exactly one chair in its boardroom. The vote is in: you agree with yourself.",
    ),
    low: l(
      "Ta bande de méchants fait absolument tout ensemble. Même démissionner exige une activité de cohésion préalable.",
      "Your villain squad does absolutely everything together. Even resigning requires a team-building session first.",
    ),
  },
  future: {
    positive: l("L’architecte du sacrifice", "The architect of sacrifice"),
    negative: l("Le seigneur du on verra", "The lord of we’ll see"),
    high: l(
      "Ton grand plan sera merveilleux dans cent ans. Les figurants aimeraient simplement savoir s’ils ont une pause d’ici là.",
      "Your grand plan will be wonderful in a hundred years. The extras just want to know if they get a break before then.",
    ),
    low: l(
      "Ton alter ego a vendu la machine à remonter le temps pour financer une soirée. Les conséquences ? Un problème pour le prochain épisode.",
      "Your alter ego sold the time machine to pay for a party. Consequences? A problem for the next episode.",
    ),
  },
  structure: {
    positive: l("Le tyran du règlement", "The tyrant of the rulebook"),
    negative: l("Le saboteur des consignes", "The instruction saboteur"),
    high: l(
      "Même ton rire diabolique doit respecter la procédure. Tout acte héroïque sans formulaire sera refusé au guichet.",
      "Even your evil laugh has to follow procedure. Heroic acts without paperwork will be rejected at the desk.",
    ),
    low: l(
      "Ton premier décret abolit les décrets. Ton second ? Tu l’as déjà contourné, par principe.",
      "Your first decree abolishes decrees. Your second? You’ve already found a loophole, on principle.",
    ),
  },
  ambition: {
    positive: l("La diva du côté obscur", "The diva of the dark side"),
    negative: l("L’éminence grise en pantoufles", "The mastermind in slippers"),
    high: l(
      "Sauver le monde, pourquoi pas. Mais ton alter ego exige son nom en plus gros que la planète sur l’affiche.",
      "Save the world? Sure. But your alter ego demands their name be bigger than the planet on the poster.",
    ),
    low: l(
      "Ton double maléfique tire les ficelles depuis le canapé. Il laisse les discours, et surtout les responsabilités, aux autres.",
      "Your evil twin pulls the strings from the sofa. Someone else can handle the speeches—and especially the responsibility.",
    ),
  },
};
export function BonusPortraits({
  profile,
  locale,
}: {
  profile: Profile;
  locale: Locale;
}) {
  const fr = locale === "fr",
    { dark, values } = bonusPortraits(profile);
  const villain = dark ? villains[dark.axis] : null;
  const balanced = values && values.autonomy >= 40 && values.autonomy <= 60;
  return (
    <div className="bonus-portraits">
      <section
        className="profile-panel bonus-dark"
        aria-labelledby="dark-title"
      >
        <span className="eyebrow">
          05 / {fr ? "TON DARK SIDE" : "YOUR DARK SIDE"}
        </span>
        <h2 id="dark-title">
          {dark && villain
            ? dark.intensity < 15
              ? fr
                ? "Le méchant encore en casting"
                : "The villain still auditioning"
              : (dark.positive ? villain.positive : villain.negative)[locale]
            : fr
              ? "Le mystère reste entier"
              : "Still a mystery"}
        </h2>
        <p>
          {dark && villain
            ? dark.intensity < 15
              ? fr
                ? "Ton double maléfique hésite encore sur son costume. Aucun trait ne domine assez pour lui écrire un grand monologue."
                : "Your evil twin is still choosing a costume. No tendency stands out enough to write their grand monologue."
              : (dark.positive ? villain.high : villain.low)[locale]
            : fr
              ? "Pas encore assez de réponses pour cette caricature."
              : "Not enough answers for this caricature yet."}
        </p>
        {dark && (
          <>
            <div className="bonus-score">
              <strong>
                {dark.intensity}
                <small>/100</small>
              </strong>
              <span>
                {fr ? "Intensité de la caricature" : "Caricature intensity"}
              </span>
            </div>
            <meter
              min={0}
              max={100}
              value={dark.intensity}
              aria-label={
                fr ? "Intensité de la caricature" : "Caricature intensity"
              }
            />
          </>
        )}
        <p className="fine-print">
          {fr
            ? "100 % second degré. Ce chiffre amplifie ton trait le plus marqué dans cette partie : il ne mesure ni ta méchanceté ni ta moralité."
            : "Purely tongue-in-cheek. This number exaggerates your strongest tendency in this round: it measures neither cruelty nor morality."}
        </p>
      </section>
      <section
        className="profile-panel bonus-values"
        aria-labelledby="values-title"
      >
        <span className="eyebrow">
          06 / {fr ? "SOLIDARITÉ ↔ AUTONOMIE" : "SOLIDARITY ↔ AUTONOMY"}
        </span>
        <h2 id="values-title">
          {!values
            ? fr
              ? "À explorer"
              : "Still to explore"
            : balanced
              ? fr
                ? "Un pied de chaque côté"
                : "A foot on either side"
              : values.autonomy > 60
                ? fr
                  ? "Ta liberté fait le poids"
                  : "Your freedom carries weight"
                : fr
                  ? "Le lien fait la force"
                  : "Strength in connection"}
        </h2>
        <p>
          {!values
            ? fr
              ? "Cette partie n’a pas encore mesuré le rapport entre collectif et indépendance."
              : "This round hasn’t measured the balance between community and independence yet."
            : balanced
              ? fr
                ? "Tes choix font une place au lien commun comme à ta marge de liberté. Le contexte peut faire pencher la balance."
                : "Your choices leave room for shared bonds as well as personal freedom. Context can tip the balance."
              : values.autonomy > 60
                ? fr
                  ? "Dans ces situations, tu protèges davantage ta capacité à décider par toi-même, même quand le groupe attend autre chose."
                  : "In these situations, you lean toward protecting your ability to decide for yourself, even when the group expects something else."
                : fr
                  ? "Dans ces situations, tu fais davantage de place au lien commun, quitte à céder une part de ta liberté de décision."
                  : "In these situations, you make more room for shared bonds, even at the cost of some freedom to decide."}
        </p>
        {values && (
          <>
            <div className="bonus-poles">
              <span>{fr ? "Solidarité" : "Solidarity"}</span>
              <span>{fr ? "Autonomie" : "Autonomy"}</span>
            </div>
            <meter
              min={0}
              max={100}
              value={values.autonomy}
              aria-label={
                fr ? "Position vers l’autonomie" : "Position toward autonomy"
              }
            />
            <p className="fine-print">
              {values.count}{" "}
              {fr ? "réponse(s) sur cet axe" : "answer(s) on this axis"} ·{" "}
              {values.autonomy}/100{" "}
              {fr ? "vers l’autonomie" : "toward autonomy"}
              {values.mixed &&
                (fr
                  ? " · Tes réponses varient selon la situation."
                  : " · Your answers vary with the situation.")}
            </p>
          </>
        )}
        <p className="fine-print">
          {fr
            ? "Lecture ludique de l’axe collectif / indépendance de cette partie. Ni une affiliation politique, ni une mesure de ta générosité."
            : "A playful reading of this round’s community / independence axis. Neither a political affiliation nor a measure of your generosity."}
        </p>
      </section>
    </div>
  );
}
