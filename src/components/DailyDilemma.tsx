import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../core/types";
import { questions } from "../data/questions";
import { dailyState, type DailyState } from "../services/player-features";

export function DailyDilemma({
  locale,
  onBack,
}: {
  locale: Locale;
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const day = new Date().toISOString().slice(0, 10);
  const question = useMemo(() => {
    const bank = questions.filter((item) => item.pack === "general");
    const seed = [...day].reduce(
      (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
      7,
    );
    return bank[seed % bank.length]!;
  }, [day]);
  const [state, setState] = useState<DailyState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void dailyState(day, question.id)
      .then(setState)
      .catch(() =>
        setError(
          fr
            ? "Connecte-toi pour participer au dilemme du jour."
            : "Sign in to join today's dilemma.",
        ),
      );
  }, [day, question.id, fr]);
  const total = (state?.a ?? 0) + (state?.b ?? 0);
  async function vote(option: 0 | 1) {
    setBusy(true);
    setError("");
    try {
      setState(await dailyState(day, question.id, option));
    } catch {
      setError(
        fr
          ? "Impossible d’enregistrer ton choix."
          : "Could not save your choice.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="daily-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Retour" : "Back"}
      </button>
      <span className="eyebrow">
        {fr ? "Le dilemme du jour" : "Today's dilemma"}
      </span>
      <h1>{question.prompt[locale]}</h1>
      <div className="daily-choices">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={state?.mine === index ? "selected" : ""}
            disabled={busy}
            onClick={() => void vote(index as 0 | 1)}
          >
            <strong>{index === 0 ? "A" : "B"}</strong>
            <span>{option.text[locale]}</span>
            {state?.mine !== null && state && (
              <b>
                {total
                  ? Math.round(
                      (100 * (index === 0 ? state.a : state.b)) / total,
                    )
                  : 0}
                %
              </b>
            )}
          </button>
        ))}
      </div>
      {state?.mine !== null && state && (
        <p className="notice" role="status">
          {fr
            ? `${total} joueur${total > 1 ? "s" : ""} ont répondu aujourd’hui. Tu peux encore changer ton choix.`
            : `${total} player${total === 1 ? "" : "s"} answered today. You can still change your choice.`}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
