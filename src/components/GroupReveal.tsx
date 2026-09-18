import { ChoicesRecap } from "./ChoicesRecap";
import { useState, type CSSProperties } from "react";
import type { Locale } from "../core/types";
import type { Session } from "../services/session";
import { questions } from "../data/questions";
export function GroupReveal({
  session,
  locale,
  recap = false,
  onContinue,
}: {
  session: Session;
  locale: Locale;
  recap?: boolean;
  onContinue: () => void;
}) {
  const fr = locale === "fr";
  const [index, setIndex] = useState(0);
  if (recap)
    return (
      <ChoicesRecap session={session} locale={locale} onContinue={onContinue} />
    );
  const completed = Math.min(...session.players.map((p) => p.answers.length));
  const round = recap ? index : session.pendingReveal;
  if (round === undefined || round >= completed) return null;
  const q = questions.find((q) => q.id === session.questionIds[round]);
  if (!q) return null;
  const reversed = (session.seed + round + 1) % 2 === 0;
  const order = reversed ? ([1, 0] as const) : ([0, 1] as const);
  const unanimous = session.players.every(
    (p) =>
      p.answers[round]?.option === session.players[0]?.answers[round]?.option,
  );
  return (
    <section className="group-reveal page-in">
      <div className="reveal-kicker">
        <span className="eyebrow">
          {recap
            ? fr
              ? "VOS CHOIX, CÔTE À CÔTE"
              : "YOUR CHOICES, SIDE BY SIDE"
            : fr
              ? "LES CARTES SONT SUR LA TABLE"
              : "THE CARDS ARE ON THE TABLE"}
        </span>
        <span className="round-badge">
          {round + 1} / {session.length}
        </span>
      </div>
      <h1>
        {recap
          ? fr
            ? "On en parle ?"
            : "Let’s talk about it."
          : unanimous
            ? fr
              ? "Sur la même longueur d’onde."
              : "On the same wavelength."
            : fr
              ? "Même question. Autres convictions."
              : "Same question. Different convictions."}
      </h1>
      <p className="reveal-intro">
        {fr
          ? "Tout le monde a répondu. Découvrez vos choix et les raisons derrière."
          : "Everyone has answered. Discover your choices and the reasons behind them."}
      </p>
      {recap && (
        <nav
          className="recap-navigation"
          aria-label={fr ? "Questions du récapitulatif" : "Recap questions"}
        >
          {session.questionIds.slice(0, completed).map((id, i) => (
            <button
              key={id}
              aria-current={round === i ? "step" : undefined}
              onClick={() => setIndex(i)}
              aria-label={`${fr ? "Question" : "Question"} ${i + 1}`}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </nav>
      )}
      <div className="reveal-question" key={q.id}>
        <h2>{q.prompt[locale]}</h2>
        <div className="reveal-choices">
          {order.map((option, i) => {
            const voters = session.players.filter(
              (p) => p.answers[round]?.option === option,
            );
            return (
              <article className="reveal-choice" key={option}>
                <div className="reveal-choice-top">
                  <span>{i === 0 ? "A" : "B"}</span>
                  <span>
                    {voters.length} / {session.players.length}
                  </span>
                </div>
                <h3>{q.options[option].text[locale]}</h3>
                <div
                  className="reveal-votes"
                  aria-label={
                    fr
                      ? "Les joueurs qui ont choisi cette réponse"
                      : "Players who chose this answer"
                  }
                >
                  {voters.length ? (
                    voters.map((p, j) => (
                      <div
                        className="reveal-voter"
                        key={p.id}
                        style={
                          { "--delay": `${j * 90 + 150}ms` } as CSSProperties
                        }
                      >
                        <span className="voter-avatar" aria-hidden="true">
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>{p.name}</span>
                        <span className="voter-check" aria-hidden="true">
                          ✓
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="no-voters">
                      {fr ? "Personne de ce côté." : "No one on this side."}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <div className="reveal-discuss">
        <span aria-hidden="true">“</span>
        <p>
          {fr
            ? "Qu’est-ce qui a fait pencher la balance pour toi ?"
            : "What tipped the balance for you?"}
        </p>
        <small>
          {fr
            ? "Le débat n’a pas de chrono."
            : "There’s no timer on the conversation."}
        </small>
      </div>
      <div className="reveal-actions">
        {recap && (
          <div className="recap-paging">
            <button
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              aria-label={fr ? "Question précédente" : "Previous question"}
            >
              ←
            </button>
            <button
              disabled={index === completed - 1}
              onClick={() => setIndex(index + 1)}
              aria-label={fr ? "Question suivante" : "Next question"}
            >
              →
            </button>
          </div>
        )}
        <button className="primary" onClick={onContinue}>
          {recap || round === session.length - 1
            ? fr
              ? "Découvrir nos portraits"
              : "Discover our portraits"
            : fr
              ? "Question suivante"
              : "Next question"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
