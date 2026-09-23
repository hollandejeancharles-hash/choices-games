import { Fragment, useState } from "react";
import type { Locale, Question } from "../core/types";
import { questions } from "../data/questions";
import { publicVote, type PublicVoteState } from "../services/public-votes";
import "../styles/home-preview.css";

const previewIds = ["r04", "r03", "a01"];
const previewQuestions = previewIds
  .map((id) => questions.find((question) => question.id === id))
  .filter((question): question is Question => Boolean(question));

export function HomeGamePreview({
  locale,
  onStart,
}: {
  locale: Locale;
  onStart: () => void;
}) {
  const fr = locale === "fr";
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<0 | 1 | null>(null);
  const [result, setResult] = useState<PublicVoteState | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const question = previewQuestions[index];
  const complete = index >= previewQuestions.length;

  async function choose(option: 0 | 1) {
    if (!question || selected !== null) return;
    setSelected(option);
    setLoading(true);
    setUnavailable(false);
    try {
      setResult(await publicVote(question.id, option));
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setIndex((current) => current + 1);
    setSelected(null);
    setResult(null);
    setUnavailable(false);
  }

  return (
    <section className="home-game-preview" aria-labelledby="preview-title">
      <div className="preview-intro">
        <span className="eyebrow">
          {fr ? "À TOI DE CHOISIR" : "YOUR TURN TO CHOOSE"}
        </span>
        <h2 id="preview-title">
          {fr ? "Trois dilemmes. Aucun bon choix." : "Three dilemmas. No right answer."}
        </h2>
        <p>
          {fr
            ? "Réponds instinctivement, puis découvre de quel côté penchent les autres joueurs."
            : "Answer on instinct, then see which way other players lean."}
        </p>
      </div>

      <div className="preview-card" aria-live="polite">
        {complete || !question ? (
          <div className="preview-finish">
            <span aria-hidden="true">✓</span>
            <p className="eyebrow">{fr ? "APERÇU TERMINÉ" : "PREVIEW COMPLETE"}</p>
            <h3>{fr ? "Tes choix ne font que commencer." : "Your choices are just beginning."}</h3>
            <p>
              {fr
                ? "Lance une vraie partie pour découvrir le portrait que dessinent tes décisions."
                : "Start a full game to discover the portrait shaped by your decisions."}
            </p>
            <button className="primary" onClick={onStart}>
              {fr ? "Commencer le jeu" : "Start the game"} <span>↗</span>
            </button>
            <button
              className="text-button"
              onClick={() => {
                setIndex(0);
                setSelected(null);
                setResult(null);
              }}
            >
              {fr ? "Rejouer l’aperçu" : "Replay preview"}
            </button>
          </div>
        ) : (
          <>
            <div className="preview-progress">
              <span>{fr ? "APERÇU DU JEU" : "GAME PREVIEW"}</span>
              <strong>{index + 1} / {previewQuestions.length}</strong>
            </div>
            <div className="preview-progress-track" aria-hidden="true">
              <i style={{ width: `${((index + 1) / previewQuestions.length) * 100}%` }} />
            </div>
            <h3>{question.prompt[locale]}</h3>
            <div className="preview-choices">
              {question.options.map((option, optionIndex) => {
                const choice = optionIndex as 0 | 1;
                const total = result ? result.a + result.b : 0;
                const count = result ? (choice === 0 ? result.a : result.b) : 0;
                const percent = total ? Math.round((count * 100) / total) : 0;
                return (
                  <Fragment key={choice}>
                    <button
                      className={`preview-choice-${choice === 0 ? "a" : "b"}${selected === choice ? " is-selected" : ""}`}
                      disabled={selected !== null}
                      onClick={() => void choose(choice)}
                    >
                      <span className="preview-choice-label">
                        <b>{choice === 0 ? "A" : "B"}</b>
                        {result ? (
                          <strong>{percent}%</strong>
                        ) : (
                          <strong aria-hidden="true">{choice === 0 ? "↙" : "↗"}</strong>
                        )}
                      </span>
                      <span className="preview-choice-text">{option.text[locale]}</span>
                      <span className="preview-choice-arrow" aria-hidden="true">
                        {choice === 0 ? "←" : "→"}
                      </span>
                      {result && (
                        <i className="preview-result-bar" aria-hidden="true">
                          <em style={{ width: `${percent}%` }} />
                        </i>
                      )}
                    </button>
                    {choice === 0 && (
                      <span className="preview-or" aria-hidden="true">
                        {fr ? "ou" : "or"}
                      </span>
                    )}
                  </Fragment>
                );
              })}
            </div>
            {loading && <p className="preview-status">{fr ? "Calcul des réponses…" : "Calculating responses…"}</p>}
            {result && (
              <div className="preview-result-copy">
                <p>
                  {fr
                    ? `${result.a + result.b} joueur${result.a + result.b > 1 ? "s" : ""} ont déjà répondu.`
                    : `${result.a + result.b} player${result.a + result.b === 1 ? "" : "s"} have answered.`}
                </p>
                <button className="primary" onClick={next}>
                  {index === previewQuestions.length - 1
                    ? fr ? "Voir la suite" : "See what’s next"
                    : fr ? "Dilemme suivant" : "Next dilemma"} <span>→</span>
                </button>
              </div>
            )}
            {unavailable && (
              <div className="preview-result-copy" role="status">
                <p>{fr ? "Les résultats sont momentanément indisponibles, mais ton choix est bien pris en compte ici." : "Results are temporarily unavailable, but your choice still counts here."}</p>
                <button className="primary" onClick={next}>{fr ? "Continuer" : "Continue"} <span>→</span></button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
