import { useEffect, useRef, useState } from "react";
import type { GameLength, Locale } from "../core/types";
import { PACKS, packNames, packDescriptions, type PackId } from "../data/packs";
import "./game-setup.css";
export interface GameConfig {
  mode: "solo" | "group";
  screens: "shared" | "phones";
  context: string;
  count: number;
  names: string[];
  pack: PackId;
  length: GameLength;
  reveal: "round" | "end";
  timer: 0 | 20 | 30;
}
export const setupSteps = (c: GameConfig) =>
  c.mode === "solo"
    ? ["mode", "pack", "length", "summary"]
    : [
        "mode",
        "screens",
        "context",
        "players",
        "pack",
        "length",
        "reveal",
        "timer",
        "summary",
      ];
export function GameSetup({
  locale,
  onBack,
  onStart,
}: {
  locale: Locale;
  onBack: () => void;
  onStart: (config: GameConfig) => Promise<void>;
}) {
  const fr = locale === "fr";
  const [c, setC] = useState<GameConfig>({
    mode: "solo",
    screens: "shared",
    context: "friends",
    count: 2,
    names: ["", "", "", "", "", ""],
    pack: "general",
    length: 15,
    reveal: "round",
    timer: 20,
  });
  const [step, setStep] = useState("mode"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = setupSteps(c),
    index = steps.indexOf(step);
  const change = (patch: Partial<GameConfig>) =>
    setC((old) => ({ ...old, ...patch }));
  const contexts = [
    ["colleagues", "Collègues", "Colleagues", "▦"],
    ["friends", "Amis", "Friends", "◎"],
    ["couple", "Couple", "Couple", "♡"],
    ["family", "Famille", "Family", "⌂"],
    ["event", "Événement", "Event", "✳"],
  ];
  const contextName =
    contexts.find((x) => x[0] === c.context)?.[fr ? 1 : 2] ?? "";
  const titles: Record<string, [string, string, string, string]> = {
    mode: [
      "On joue comment ?",
      "How are we playing?",
      "Un moment pour toi. Ou une conversation à plusieurs.",
      "A moment for yourself. Or a conversation together.",
    ],
    screens: [
      "Un écran ou plusieurs ?",
      "One screen or several?",
      "La même partie, à votre façon.",
      "One game, your way.",
    ],
    context: [
      "Qui est autour de la table ?",
      "Who’s at the table?",
      "Choisis l’occasion. Tu pourras ensuite choisir librement ton pack.",
      "Choose the occasion. You can freely choose your pack next.",
    ],
    players: [
      "Faisons les présentations.",
      "Let’s meet everyone.",
      c.screens === "phones"
        ? "Combien serez-vous ? Chacun saisira son pseudo en scannant le QR code."
        : "De 2 à 6 joueurs. Un prénom ou un pseudo suffit.",
      c.screens === "phones"
        ? "How many are joining? Each guest enters their nickname after scanning the QR code."
        : "From 2 to 6 players. A first name or nickname is enough.",
    ],
    pack: [
      "De quoi on parle ?",
      "What’s on the table?",
      "Un univers. Des choix qui bousculent.",
      "One theme. Choices that challenge you.",
    ],
    length: [
      "Jusqu’où on va ?",
      "How deep do we go?",
      "Choisis la longueur de cette exploration.",
      "Choose the length of this exploration.",
    ],
    reveal: [
      "Quand lever le voile ?",
      "When do we reveal?",
      "Les choix restent cachés jusqu’au moment que vous choisissez.",
      "Choices stay private until your chosen reveal.",
    ],
    timer: [
      "À votre rythme.",
      "At your own pace.",
      "Un peu de pression ou tout votre temps. Le chrono reste indicatif.",
      "A little pressure or all the time you need. The timer is only a guide.",
    ],
    summary: [
      c.mode === "solo"
        ? "Tout est prêt. Et toi ?"
        : "Tout est prêt. Et vous ?",
      "All set. Are you?",
      "Un dernier regard avant le premier dilemme.",
      "One last look before the first dilemma.",
    ],
  };
  const title = titles[step]!;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  const valid =
    step !== "players" ||
    (c.screens === "phones"
      ? !!c.names[0]?.trim()
      : c.names.slice(0, c.count).every((n) => n.trim()));
  const card = (
    value: string,
    label: string,
    description: string,
    symbol: string,
    selected: boolean,
    action: () => void,
    tone = 0,
  ) => (
    <button
      key={value}
      type="button"
      className={`wizard-card tone-${tone}`}
      aria-pressed={selected}
      onClick={action}
    >
      <span className="wizard-card-top">
        <span aria-hidden="true">{symbol}</span>
        <span className="wizard-check" aria-hidden="true">
          {selected ? "✓" : "+"}
        </span>
      </span>
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
  const row = (label: string, value: string, target: string) => (
    <button
      type="button"
      className={`wizard-summary-row summary-${target}`}
      disabled={busy}
      onClick={() => setStep(target)}
    >
      <span className="summary-icon" aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          width="36"
          height="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {target === "mode" || target === "players" ? (
            <>
              <circle cx="16" cy="10" r="5" />
              <path d="M6 28v-3a10 10 0 0 1 20 0v3Z" />
            </>
          ) : target === "pack" ? (
            <>
              <path d="m3 15 13-11 13 11M7 13v15h18V13M13 28V18h6v10" />
            </>
          ) : target === "length" ? (
            <>
              <rect x="5" y="4" width="17" height="23" rx="3" />
              <path d="m23 8 5 2-4 19-8-2" />
            </>
          ) : (
            <>
              <circle cx="16" cy="16" r="12" />
              <path d="M16 8v8l6 3" />
            </>
          )}
        </svg>
      </span>
      <span className="summary-label">{label}</span>
      <strong>
        {value}
        {target === "length" && (
          <span className="summary-unit">{fr ? "dilemmes" : "dilemmas"}</span>
        )}
      </strong>
      {["mode", "pack", "length"].includes(target) && (
        <span className="summary-description">
          {target === "mode"
            ? c.mode === "solo"
              ? fr
                ? "Un moment pour toi."
                : "A moment for yourself."
              : fr
                ? "Vos propres convictions."
                : "Your own convictions."
            : target === "pack"
              ? packDescriptions[c.pack][locale]
              : fr
                ? "Chaque choix compte."
                : "Every choice matters."}
        </span>
      )}
      <small>{fr ? "Modifier" : "Edit"} ↗</small>
    </button>
  );
  return (
    <section
      className={`game-wizard ${step === "summary" ? "is-summary" : ""}`}
    >
      <div className="wizard-top">
        <button
          disabled={busy}
          className="text-button"
          onClick={() => (index === 0 ? onBack() : setStep(steps[index - 1]!))}
        >
          ← {fr ? "Retour" : "Back"}
        </button>
        <span>
          {fr ? "TA PARTIE PREND FORME" : "YOUR GAME TAKES SHAPE"}{" "}
          <b>
            {String(index + 1).padStart(2, "0")} / {steps.length}
          </b>
        </span>
      </div>
      <div
        className="wizard-progress"
        role="progressbar"
        aria-label={fr ? "Configuration de la partie" : "Game setup"}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={index + 1}
      >
        {steps.map((s, i) => (
          <span key={s} className={i <= index ? "filled" : ""} />
        ))}
      </div>
      <div className="wizard-stage" key={step}>
        <div className="wizard-heading">
          <p className="eyebrow">
            {fr ? "AVANT LES GRANDS CHOIX" : "BEFORE THE BIG CHOICES"}
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {step === "summary" ? (
              <>
                {fr ? "Tout est prêt. " : "All set. "}
                <em>
                  {fr
                    ? c.mode === "solo"
                      ? "Et toi ?"
                      : "Et vous ?"
                    : "Are you?"}
                </em>
              </>
            ) : (
              title[fr ? 0 : 1]
            )}
          </h1>
          <p>{title[fr ? 2 : 3]}</p>
        </div>
        <div
          className={`wizard-options ${step === "context" || step === "length" || step === "timer" ? "wizard-three" : ""}`}
        >
          {step === "mode" && (
            <>
              {card(
                "solo",
                fr ? "En solo" : "Solo",
                fr
                  ? "Un face-à-face avec toi-même."
                  : "A moment to meet yourself.",
                "◉",
                c.mode === "solo",
                () => change({ mode: "solo" }),
                0,
              )}
              {card(
                "group",
                fr ? "À plusieurs" : "Together",
                fr
                  ? "Les mêmes dilemmes. Vos propres convictions."
                  : "Same dilemmas. Your own convictions.",
                "◎",
                c.mode === "group",
                () => change({ mode: "group" }),
                1,
              )}
            </>
          )}
          {step === "screens" && (
            <>
              {card(
                "shared",
                fr ? "Un seul écran" : "One shared screen",
                fr
                  ? "Passez-vous le téléphone à tour de rôle."
                  : "Take turns passing the phone.",
                "▣",
                c.screens === "shared",
                () => change({ screens: "shared" }),
                1,
              )}
              {card(
                "phones",
                fr ? "Chacun son téléphone" : "Each on your own phone",
                fr
                  ? "Un QR code pour se retrouver. Des réponses en privé."
                  : "Join by QR code. Answer privately.",
                "▦",
                c.screens === "phones",
                () => change({ screens: "phones" }),
                0,
              )}
            </>
          )}
          {step === "context" &&
            contexts.map(([id, f, e, sym], i) =>
              card(
                id!,
                fr ? f! : e!,
                fr ? "Des choix à partager." : "Choices to share.",
                sym!,
                c.context === id,
                () =>
                  change({
                    context: id!,
                    pack:
                      id === "couple"
                        ? "couple"
                        : id === "family"
                          ? "family"
                          : id === "friends"
                            ? "friendship"
                            : "general",
                  }),
                i % 4,
              ),
            )}
          {step === "pack" &&
            PACKS.map((p, i) =>
              card(
                p,
                packNames[p][locale],
                packDescriptions[p][locale],
                ["✳", "◎", "♡", "⌂"][i]!,
                c.pack === p,
                () => change({ pack: p }),
                i,
              ),
            )}
          {step === "length" &&
            ([10, 15, 25] as const).map((n, i) =>
              card(
                String(n),
                `${n} questions`,
                (fr
                  ? ["L’intuition", "L’exploration", "Le grand vertige"]
                  : ["A first instinct", "An exploration", "The deep dive"])[
                  i
                ]!,
                ["✦", "✳", "✺"][i]!,
                c.length === n,
                () => change({ length: n }),
                i,
              ),
            )}
          {step === "reveal" && (
            <>
              {card(
                "round",
                fr ? "Après chaque question" : "After each question",
                fr
                  ? "Tout le monde répond, puis on découvre et on débat."
                  : "Everyone answers, then you reveal and discuss.",
                "◐",
                c.reveal === "round",
                () => change({ reveal: "round" }),
                1,
              )}
              {card(
                "end",
                fr ? "Tout à la fin" : "All at the end",
                fr
                  ? "Gardez le suspense. Retrouvez tous les choix au récapitulatif."
                  : "Keep the suspense. See every choice in the final recap.",
                "✧",
                c.reveal === "end",
                () => change({ reveal: "end" }),
                2,
              )}
            </>
          )}
          {step === "timer" &&
            ([20, 30, 0] as const).map((n, i) =>
              card(
                String(n),
                n ? `${n} s` : fr ? "Sans limite" : "No limit",
                (fr
                  ? [
                      "À l’instinct.",
                      "Un peu de recul.",
                      "Le temps de réfléchir.",
                    ]
                  : [
                      "Go with your instinct.",
                      "A moment to consider.",
                      "Time to think.",
                    ])[i]!,
                n ? "◷" : "∞",
                c.timer === n,
                () => change({ timer: n }),
                i,
              ),
            )}
        </div>
        {step === "players" && (
          <div className="wizard-players">
            <label>
              {c.screens === "phones"
                ? fr
                  ? "Joueurs attendus (toi inclus)"
                  : "Expected players (including you)"
                : fr
                  ? "Nombre de joueurs"
                  : "Number of players"}
              <div className="wizard-count">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    type="button"
                    key={n}
                    aria-pressed={c.count === n}
                    onClick={() => change({ count: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </label>
            <div className="wizard-names">
              {Array.from(
                { length: c.screens === "phones" ? 1 : c.count },
                (_, i) => (
                  <label key={i}>
                    {c.screens === "phones"
                      ? fr
                        ? "Ton pseudo · hôte"
                        : "Your nickname · host"
                      : `${fr ? "Joueur" : "Player"} ${i + 1}`}
                    <input
                      value={c.names[i]}
                      maxLength={40}
                      autoComplete="off"
                      placeholder={fr ? "Prénom ou pseudo" : "Name or nickname"}
                      onChange={(e) =>
                        change({
                          names: c.names.map((n, j) =>
                            i === j ? e.target.value : n,
                          ),
                        })
                      }
                    />
                  </label>
                ),
              )}
            </div>
            <p className="fine-print">
              {c.screens === "phones"
                ? fr
                  ? "Le QR code apparaîtra après le récapitulatif. Les invités rejoindront ensuite le salon."
                  : "The QR code appears after the summary. Guests can then join the room."
                : fr
                  ? "Chacun aura son moment pour répondre à l’abri des regards."
                  : "Everyone gets their turn to answer privately."}
            </p>
          </div>
        )}
        {step === "summary" && (
          <div className="wizard-summary">
            {row(
              fr ? "Mode" : "Mode",
              c.mode === "solo"
                ? fr
                  ? "En solo"
                  : "Solo"
                : fr
                  ? "À plusieurs"
                  : "Together",
              "mode",
            )}
            {c.mode === "group" && (
              <>
                {row(
                  fr ? "Écrans" : "Screens",
                  c.screens === "phones"
                    ? fr
                      ? "Chacun son téléphone · QR"
                      : "Separate phones · QR"
                    : fr
                      ? "Un écran partagé"
                      : "One shared screen",
                  "screens",
                )}
                {row(fr ? "Avec qui" : "Company", contextName, "context")}
                {row(
                  fr ? "Joueurs" : "Players",
                  c.screens === "phones"
                    ? `${c.count} ${fr ? "attendus · hôte" : "expected · host"} ${c.names[0]}`
                    : c.names.slice(0, c.count).join(", "),
                  "players",
                )}
              </>
            )}
            {row(
              fr ? "Pack thématique" : "Theme pack",
              packNames[c.pack][locale],
              "pack",
            )}
            {row(fr ? "Format" : "Format", String(c.length), "length")}
            {c.mode === "group" && (
              <>
                {row(
                  fr ? "Révélation" : "Reveal",
                  c.reveal === "round"
                    ? fr
                      ? "Après chaque question"
                      : "After each question"
                    : fr
                      ? "Tout à la fin"
                      : "All at the end",
                  "reveal",
                )}
                {row(
                  fr ? "Chrono" : "Timer",
                  c.timer ? `${c.timer} s` : fr ? "Sans limite" : "No limit",
                  "timer",
                )}
              </>
            )}
          </div>
        )}
      </div>
      {step === "summary" && (
        <p className="summary-reassurance">
          <span aria-hidden="true">✧</span>
          {c.mode === "group"
            ? fr
              ? "Réponds pour toi, devine les autres. Une bonne prédiction = un point. Le meilleur score gagne !"
              : "Answer for yourself, then guess everyone else. One correct prediction = one point. Highest score wins!"
            : fr
              ? "Pas de bonne réponse. Juste la tienne."
              : "No right answer. Just yours."}
        </p>
      )}
      <div className="wizard-footer">
        <span>
          {step === "summary"
            ? c.mode === "group" && c.screens === "phones"
              ? fr
                ? "Prochaine étape : invite tes joueurs."
                : "Next: invite your players."
              : fr
                ? "Le premier choix vous attend."
                : "The first choice awaits."
            : step === "players" && !valid
              ? fr
                ? "Renseigne les pseudos pour continuer."
                : "Enter nicknames to continue."
              : fr
                ? "Tu peux revenir sur chaque choix."
                : "You can revisit every choice."}
        </span>
        <button
          className="primary"
          disabled={busy || !valid}
          onClick={async () => {
            if (step !== "summary") {
              setStep(steps[index + 1]!);
              return;
            }
            setBusy(true);
            setError("");
            try {
              await onStart(c);
            } catch {
              setError(
                fr
                  ? "La création a échoué. Tes choix sont conservés, réessaie."
                  : "Creation failed. Your choices are saved; try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy
            ? fr
              ? "Création…"
              : "Creating…"
            : step === "summary"
              ? fr
                ? "C’est parti"
                : "Let’s play"
              : fr
                ? "Continuer"
                : "Continue"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
