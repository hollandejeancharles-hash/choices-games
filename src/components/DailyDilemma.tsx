import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../core/types";
import { dailyQuestion } from "../services/account-view";
import { publicVote, type PublicVoteState } from "../services/public-votes";
import { PushPreference } from "./PushPreference";

export function DailyDilemma({
  locale,
  onBack,
}: {
  locale: Locale;
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const day = new Date().toISOString().slice(0, 10);
  const question = useMemo(() => dailyQuestion(day), [day]);
  const [state, setState] = useState<PublicVoteState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void publicVote(question.id)
      .then(setState)
      .catch(() =>
        setError(
          fr
            ? "Les résultats sont temporairement indisponibles."
            : "Results are temporarily unavailable.",
        ),
      );
  }, [day, question.id, fr]);
  const total = (state?.a ?? 0) + (state?.b ?? 0);
  async function vote(option: 0 | 1) {
    setBusy(true);
    setError("");
    try {
      setState(await publicVote(question.id, option));
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
        <>
          <p className="notice" role="status">
            {fr
              ? `${total} joueur${total > 1 ? "s" : ""} ont répondu aujourd’hui. Tu peux encore changer ton choix.`
              : `${total} player${total === 1 ? "" : "s"} answered today. You can still change your choice.`}
          </p>
          <PushPreference locale={locale} contextual />
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
