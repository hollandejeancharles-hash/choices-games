import { PredictionLeaderboard } from "./PredictionLeaderboard";
import { useState } from "react";
import type { Locale } from "../core/types";
import type { Session } from "../services/session";
import { questions } from "../data/questions";

export function ChoicesRecap({
  session,
  locale,
  onContinue,
}: {
  session: Session;
  locale: Locale;
  onContinue: () => void;
}) {
  const fr = locale === "fr";
  const [filter, setFilter] = useState<"all" | "unanimous" | "split">("all");
  const [page, setPage] = useState(0);
  const n = session.players.length;
  const completed = n
    ? Math.min(...session.players.map((p) => p.answers.length))
    : 0;
  const rounds = session.questionIds
    .slice(0, completed)
    .flatMap((id, index) => {
      const q = questions.find((q) => q.id === id);
      if (!q) return [];
      const order: [0 | 1, 0 | 1] =
        (session.seed + index + 1) % 2 === 0 ? [1, 0] : [0, 1];
      const sides = order.map((option) => ({
        text: q.options[option].text[locale],
        voters: session.players.filter(
          (p) => p.answers[index]?.option === option,
        ),
      }));
      const unanimous = sides.some((s) => s.voters.length === n);
      const split = sides[0]!.voters.length === sides[1]!.voters.length;
      return [{ q, index, sides, unanimous, split }];
    });
  const same = rounds.filter((r) => r.unanimous).length,
    split = rounds.filter((r) => r.split).length;
  const isolated = rounds.filter(
    (r) =>
      !r.unanimous && !r.split && r.sides.some((s) => s.voters.length === 1),
  ).length;
  const themes = {
    travel: ["Voyage", "Travel"],
    work: ["Travail", "Work"],
    relationships: ["Relations", "Relationships"],
    powers: ["Pouvoirs", "Powers"],
    everyday: ["Quotidien", "Everyday"],
    absurd: ["Absurde", "Absurd"],
    ethics: ["Éthique", "Ethics"],
  };
  const closestSplit = Math.min(
    ...rounds
      .filter((r) => !r.unanimous)
      .map((r) =>
        Math.abs(r.sides[0]!.voters.length - r.sides[1]!.voters.length),
      ),
  );
  const mostDivided = rounds.filter(
    (r) =>
      !r.unanimous &&
      Math.abs(r.sides[0]!.voters.length - r.sides[1]!.voters.length) ===
        closestSplit,
  );
  const visible = rounds.filter(
    (r) =>
      filter === "all" ||
      (filter === "unanimous" ? r.unanimous : mostDivided.includes(r)),
  );
  const avatar = (name: string, i: number) => (
    <span className={`recap-avatar avatar-${i % 4}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
  return (
    <section className="choices-recap page-in">
      <div className="recap-end-label">
        {fr ? "Fin de partie ✧" : "Game complete ✧"}
      </div>
      <div className="recap-hero">
        <div>
          <h1>
            <svg
              className="recap-title-rays"
              viewBox="0 0 48 60"
              aria-hidden="true"
            >
              <path d="m8 31 18 7M20 7l8 18M5 53l17-6" />
            </svg>
            {fr ? (
              <>
                Vos choix.
                <br />
                Vos différences.
              </>
            ) : (
              <>
                Your choices.
                <br />
                Your differences.
              </>
            )}
          </h1>
          <p>
            {fr
              ? `${n} joueurs, ${rounds.length} dilemmes et de quoi refaire la soirée.`
              : `${n} players, ${rounds.length} dilemmas and plenty to talk about.`}
          </p>
        </div>
        <div className="recap-cast">
          <p className="recap-handnote">
            {fr ? (
              <>
                Des points de vue
                <br />
                qui comptent ↘
              </>
            ) : (
              <>
                Every perspective
                <br />
                matters ↘
              </>
            )}
          </p>
          {session.players.map((p, i) => (
            <div key={p.id}>
              {avatar(p.name, i)}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      <PredictionLeaderboard session={session} locale={locale} />
      <div className="recap-stats">
        {[
          [same, fr ? "Tous d’accord" : "Unanimous"],
          [split, fr ? "Partagés à 50–50" : "Split 50–50"],
          [isolated, fr ? "Une voix à part" : "One different voice"],
        ].map(([value, label], i) => (
          <div className={`recap-stat stat-${i}`} key={label}>
            <span className="recap-stat-icon" aria-hidden="true">
              {i === 1 ? (
                "◐"
              ) : (
                <svg
                  viewBox="0 0 32 32"
                  width="30"
                  height="30"
                  fill="currentColor"
                >
                  <circle cx="16" cy="10" r="5" />
                  <path d="M8 27v-3a8 8 0 0 1 16 0v3Z" />
                  {i === 0 && (
                    <>
                      <circle cx="5" cy="13" r="3" />
                      <circle cx="27" cy="13" r="3" />
                      <path d="M0 25v-3a5 5 0 0 1 8-4v7ZM24 25v-7a5 5 0 0 1 8 4v3Z" />
                    </>
                  )}
                </svg>
              )}
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
            <svg
              className="recap-sparks"
              viewBox="0 0 40 44"
              aria-hidden="true"
            >
              <path d="m8 28 11-10M25 12l5-7M24 35l10-2" />
            </svg>
          </div>
        ))}
      </div>
      <nav
        className="recap-filters"
        aria-label={fr ? "Filtrer les choix" : "Filter choices"}
      >
        {(["all", "unanimous", "split"] as const).map((key, i) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(key);
              setPage(0);
            }}
          >
            {
              [
                fr ? "Tout voir" : "All choices",
                fr ? "Unanimes" : "Unanimous",
                fr ? "Les plus partagés" : "Most divided",
              ][i]
            }{" "}
            · {[rounds.length, same, mostDivided.length][i]}
          </button>
        ))}
      </nav>
      <p className="sr-only" role="status">
        {Math.min(2, Math.max(0, visible.length - page * 2))}{" "}
        {fr ? "dilemmes affichés" : "dilemmas shown"} · {fr ? "page" : "page"}{" "}
        {page + 1}
      </p>
      <div className="recap-grid">
        {visible
          .slice(page * 2, page * 2 + 2)
          .map(({ q, index, sides, unanimous, split }) => (
            <article className="recap-card" key={q.id}>
              <div className="recap-card-top">
                <span>
                  {String(index + 1).padStart(2, "0")} ·{" "}
                  {themes[q.theme][fr ? 0 : 1]}
                </span>
                <span
                  className={
                    unanimous ? "recap-badge unanimous" : "recap-badge"
                  }
                >
                  {unanimous
                    ? fr
                      ? "Tous d’accord"
                      : "Unanimous"
                    : split
                      ? "50 / 50"
                      : fr
                        ? "Des avis différents"
                        : "Different views"}
                </span>
              </div>
              <h2>{q.prompt[locale]}</h2>
              <div className="recap-sides">
                {sides.map((side, i) => (
                  <div className={`recap-side side-${i}`} key={i}>
                    <h3>
                      <span>{i === 0 ? "A" : "B"} · </span>
                      {side.text}
                    </h3>
                    <div className="recap-voters">
                      {side.voters.length ? (
                        side.voters.map((p) => (
                          <div key={p.id}>
                            {avatar(
                              p.name,
                              session.players.findIndex(
                                (player) => player.id === p.id,
                              ),
                            )}
                            <span>{p.name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="recap-no-votes">
                          <svg viewBox="0 0 32 32" aria-hidden="true">
                            <circle cx="16" cy="9" r="5" />
                            <circle cx="5" cy="13" r="3" />
                            <circle cx="27" cy="13" r="3" />
                            <path d="M8 28v-5a8 8 0 0 1 16 0v5ZM0 25v-3a5 5 0 0 1 7-4v7ZM25 25v-7a5 5 0 0 1 7 4v3Z" />
                          </svg>
                          {fr ? "Aucun vote" : "No votes"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="recap-vote-bar"
                aria-label={sides
                  .map(
                    (s, i) =>
                      `${i === 0 ? "A" : "B"} : ${s.voters.length} / ${n}`,
                  )
                  .join(", ")}
              >
                {sides.map(
                  (s, i) =>
                    s.voters.length > 0 && (
                      <span
                        className={`bar-${i}`}
                        key={i}
                        style={{ width: `${(s.voters.length / n) * 100}%` }}
                      >
                        {s.voters.length} {fr ? "voix" : "votes"}
                      </span>
                    ),
                )}
              </div>
            </article>
          ))}
      </div>
      {!visible.length && (
        <p className="recap-empty">
          {fr
            ? "Aucun dilemme dans cette catégorie. Explore les autres choix."
            : "No dilemmas in this category. Explore the other choices."}
        </p>
      )}
      <aside className="recap-conversation">
        <span aria-hidden="true">“</span>
        <div>
          <strong>{fr ? "On en parle ?" : "Let’s talk about it."}</strong>
          <p>
            {fr
              ? "Qu’est-ce qui aurait pu te faire changer d’avis ?"
              : "What could have changed your mind?"}
          </p>
        </div>
        <p className="recap-handnote">
          {fr ? (
            <>
              Les meilleurs débats
              <br />
              ne s’arrêtent pas ici !
            </>
          ) : (
            <>
              The best conversations
              <br />
              don’t stop here!
            </>
          )}
        </p>
      </aside>
      <div className="recap-finish">
        <button className="primary" onClick={onContinue}>
          {fr ? "Découvrir nos portraits" : "Discover our portraits"}{" "}
          <span aria-hidden="true">→</span>
        </button>
        <div className="recap-pagination">
          {page > 0 && (
            <button
              onClick={() => setPage(page - 1)}
              aria-label={fr ? "Choix précédents" : "Previous choices"}
            >
              ←
            </button>
          )}
          {visible.length > 2 && (
            <button
              className="recap-explore"
              onClick={() =>
                setPage((page + 1) % Math.ceil(visible.length / 2))
              }
            >
              {fr
                ? "Continuer à explorer les choix"
                : "Keep exploring the choices"}{" "}
              ↓{" "}
              <span>
                {page + 1} / {Math.ceil(visible.length / 2)}
              </span>
            </button>
          )}
        </div>
        <p className="recap-footer-note recap-handnote">
          {fr ? (
            <>
              Même jeu.
              <br />
              Plus de liens.
            </>
          ) : (
            <>
              Same game.
              <br />
              Closer connections.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
