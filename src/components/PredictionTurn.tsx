import { useState, useEffect, type ComponentProps } from "react";
import { QuestionScreen } from "./QuestionScreen";
import { validGuesses, type Guesses } from "../services/predictions";
import "../styles/predictions.css";
type Draft = { option: 0 | 1; duration: number; guesses: Guesses };
type Props = Omit<ComponentProps<typeof QuestionScreen>, "onAnswer"> & {
  players: { id: string; name: string }[];
  me: string;
  storageKey: string;
  onSubmit: (
    option: 0 | 1,
    duration: number,
    guesses: Guesses,
  ) => boolean | Promise<boolean>;
};
export function PredictionTurn({
  players,
  me,
  storageKey,
  onSubmit,
  ...props
}: Props) {
  const [draft, setDraft] = useState<Draft | null>(() => {
    try {
      const d = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (
        d &&
        (d.option === 0 || d.option === 1) &&
        Number.isFinite(d.duration) &&
        d.duration >= 0 &&
        d.guesses &&
        typeof d.guesses === "object" &&
        !Array.isArray(d.guesses)
      )
        return {
          ...d,
          guesses: Object.fromEntries(
            Object.entries(d.guesses).filter(
              ([id, v]) =>
                id !== me &&
                players.some((p) => p.id === id) &&
                (v === 0 || v === 1),
            ),
          ),
        };
    } catch {}
    return null;
  });
  const [sending, setSending] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const fr = props.locale === "fr";
  useEffect(() => {
    if (draft) {
      document.getElementById("prediction-title")?.focus();
      window.scrollTo({ top: 0 });
    }
  }, [draft !== null]);
  function save(next: Draft) {
    setDraft(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  if (!draft)
    return (
      <>
        <p className="prediction-step">
          {fr
            ? "01 · Ton choix, puis 02 · Tes pronostics"
            : "01 · Your choice, then 02 · Your predictions"}
        </p>
        <QuestionScreen
          {...props}
          onAnswer={(option, duration) =>
            save({ option, duration, guesses: {} })
          }
        />
      </>
    );
  const targets = players.filter((p) => p.id !== me);
  const ready = validGuesses(draft.guesses, players, me);
  const order: (0 | 1)[] = props.reversed ? [1, 0] : [0, 1];
  return (
    <section className="prediction-turn page-in">
      <div className="prediction-heading">
        <span className="eyebrow">
          {fr ? "02 · À toi de les deviner" : "02 · Read the room"}
        </span>
        <span>
          {props.index} / {props.length}
        </span>
      </div>
      <progress
        value={props.index - 1}
        max={props.length}
        aria-label={`${fr ? "Dilemme" : "Dilemma"} ${props.index} / ${props.length}`}
      />
      <h1 id="prediction-title" tabIndex={-1}>
        {fr ? "Tu les connais si bien ?" : "How well do you know them?"}
      </h1>
      <p className="prediction-intro">
        {props.name},{" "}
        {fr
          ? "ton choix est enregistré. Devine maintenant celui de chaque joueur : une bonne intuition, un point."
          : "your choice is saved. Now predict everyone else’s choice: one correct guess, one point."}
      </p>
      <div className="prediction-context">
        <p>{props.question.prompt[props.locale]}</p>
        <small>
          {fr ? "Ton choix" : "Your choice"} :{" "}
          {props.question.options[draft.option].text[props.locale]}
        </small>
      </div>
      <div className="prediction-targets">
        {targets.map((p) => (
          <fieldset key={p.id}>
            <legend>
              <span
                className={`prediction-avatar tone-${players.findIndex((x) => x.id === p.id) % 6}`}
                aria-hidden="true"
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              {fr ? `Et ${p.name} ?` : `What about ${p.name}?`}
            </legend>
            <div className="prediction-options">
              {order.map((option, i) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={draft.guesses[p.id] === option}
                  disabled={sending}
                  onClick={() =>
                    save({
                      ...draft,
                      guesses: { ...draft.guesses, [p.id]: option },
                    })
                  }
                >
                  <b>{i === 0 ? "A" : "B"}</b>
                  <span>
                    {props.question.options[option].text[props.locale]}
                  </span>
                  <span aria-hidden="true">
                    {draft.guesses[p.id] === option ? "✓" : "○"}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="prediction-submit">
        <p aria-live="polite">
          {Object.keys(draft.guesses).length} / {targets.length}{" "}
          {fr
            ? "pronostics · Les réponses restent secrètes."
            : "predictions · Answers stay hidden."}
        </p>
        {storageError && (
          <p role="alert">
            {fr
              ? "La sauvegarde sur cet appareil est indisponible. Garde cette page ouverte."
              : "Saving on this device is unavailable. Keep this page open."}
          </p>
        )}
        <button
          className="primary"
          disabled={!ready || sending}
          onClick={async () => {
            setSending(true);
            try {
              if (await onSubmit(draft.option, draft.duration, draft.guesses)) {
                try {
                  localStorage.removeItem(storageKey);
                } catch {}
              }
            } finally {
              setSending(false);
            }
          }}
        >
          {sending
            ? fr
              ? "Envoi…"
              : "Sending…"
            : fr
              ? "Valider mes pronostics →"
              : "Lock in my predictions →"}
        </button>
        <button
          className="text-button"
          onClick={props.onPause}
          disabled={sending}
        >
          {fr ? "Faire une pause" : "Take a break"}
        </button>
      </div>
    </section>
  );
}
