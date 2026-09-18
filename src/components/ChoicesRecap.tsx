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
  const visible = rounds.filter(
    (r) => filter === "all" || (filter === "unanimous" ? r.unanimous : r.split),
  );
  const avatar = (name: string, i: number) => (
    <span className={`recap-avatar avatar-${i % 4}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
  return (
    <section className="choices-recap page-in">
      <div className="recap-hero">
        <div>
          <p className="eyebrow">
            {fr ? "VOS CHOIX, CÔTE À CÔTE" : "YOUR CHOICES, SIDE BY SIDE"}
          </p>
          <h1>
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
          {session.players.map((p, i) => (
            <div key={p.id}>
              {avatar(p.name, i)}
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="recap-stats">
        {[
          [same, fr ? "Tous d’accord" : "Unanimous"],
          [split, fr ? "Partagés à 50–50" : "Split 50–50"],
          [
            rounds.length - same - split,
            fr ? "Une majorité se dessine" : "A majority emerges",
          ],
        ].map(([value, label], i) => (
          <div className={`recap-stat stat-${i}`} key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
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
            onClick={() => setFilter(key)}
          >
            {
              [
                fr ? "Tout voir" : "All choices",
                fr ? "Unanimes" : "Unanimous",
                fr ? "À 50–50" : "Split 50–50",
              ][i]
            }{" "}
            · {[rounds.length, same, split][i]}
          </button>
        ))}
      </nav>
      <p className="sr-only" role="status">
        {visible.length} {fr ? "dilemmes affichés" : "dilemmas shown"}
      </p>
      <div className="recap-grid">
        {visible.map(({ q, index, sides, unanimous, split }) => (
          <article className="recap-card" key={q.id}>
            <div className="recap-card-top">
              <span>
                {fr ? "DILEMME" : "DILEMMA"}{" "}
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={unanimous ? "recap-badge unanimous" : "recap-badge"}
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
                      <p>{fr ? "Aucun vote" : "No votes"}</p>
                    )}
                  </div>
                  <small>
                    {side.voters.length} {fr ? "voix" : "votes"}
                  </small>
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
                    />
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
      </aside>
      <div className="recap-finish">
        <button className="primary" onClick={onContinue}>
          {fr ? "Découvrir nos portraits" : "Discover our portraits"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
