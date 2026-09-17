import type { Locale } from "../core/types";
import { compareGroup, rankArchetypes } from "../core/engine";
import { archetypes } from "../data/archetypes";
import { questions } from "../data/questions";
import { copy } from "../i18n";
import type { Session } from "../services/session";
export function GroupResults({
  session,
  locale,
  onPlayer,
  onReplay,
}: {
  session: Session;
  locale: Locale;
  onPlayer: (id: string) => void;
  onReplay: () => void;
}) {
  const t = copy[locale],
    group = compareGroup(questions, session.players);
  const divided = questions.find(
    (q) => q.id === group.mostDivisive?.questionId,
  );
  const names = (ids: readonly string[]) =>
    ids.map((id) => session.players.find((p) => p.id === id)?.name).join(" × ");
  const allEqual = group.pairs.every(
    (pair) => pair.similarity === group.pairs[0]?.similarity,
  );
  return (
    <section className="group-results page-in">
      <span className="eyebrow">
        {t.brand} / {t.group}
      </span>
      <h1>{t.groupTitle}</h1>
      <p className="lead">{t.groupIntro}</p>
      <div className="compatibility-cards">
        {[group.closest, group.furthest].map((pair, i) => (
          <article className="profile-panel" key={i}>
            <span className="eyebrow">{i === 0 ? t.closest : t.furthest}</span>
            <strong className="compatibility-number">
              {pair.similarity}
              <small>%</small>
            </strong>
            <p>{t.similarity}</p>
            <h2>{names(pair.players)}</h2>
          </article>
        ))}
      </div>
      {allEqual && (
        <p className="fine-print">
          {locale === "fr"
            ? "Tous les duos ont le même score : les deux catégories sont ex æquo."
            : "Every pair has the same score: both categories are tied."}
        </p>
      )}
      <section className="profile-panel division-panel">
        <span className="eyebrow">{t.divided}</span>
        {divided ? (
          <>
            <h2>{divided.prompt[locale]}</h2>
            <div className="division-options">
              {divided.options.map((o, index) => {
                const picked = session.players.filter(
                  (p) =>
                    p.answers.find((a) => a.questionId === divided.id)
                      ?.option === index,
                );
                return (
                  <div key={index}>
                    <span className="eyebrow">
                      {index === 0 ? "A" : "B"} · {picked.length} /{" "}
                      {session.players.length}
                    </span>
                    <p>{o.text[locale]}</p>
                    <small>{picked.map((p) => p.name).join(", ") || "—"}</small>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p>{t.united}</p>
        )}
      </section>
      <h2 className="section-heading">{t.profiles}</h2>
      <div className="player-profiles">
        {group.profiles.map(({ player, profile }) => (
          <button
            key={player.id}
            className="player-profile"
            onClick={() => onPlayer(player.id)}
          >
            <img
              className="player-chibi"
              src={`./avatars/${rankArchetypes(profile.vector, archetypes)[0]!.archetype.id}.png`}
              alt=""
              width={80}
              height={80}
              loading="lazy"
            />
            <span>{player.name}</span>
            <strong>
              {
                rankArchetypes(profile.vector, archetypes)[0]!.archetype.name[
                  locale
                ]
              }
            </strong>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <details className="pair-details">
        <summary>
          {locale === "fr" ? "Comparer tous les duos" : "Compare every pair"}
        </summary>
        <ul>
          {group.pairs.map((pair) => (
            <li key={pair.players.join("-")}>
              <span>{names(pair.players)}</span>
              <strong>{pair.similarity} %</strong>
            </li>
          ))}
        </ul>
      </details>
      <button className="primary" onClick={onReplay}>
        {t.replay}
        <span>↻</span>
      </button>
    </section>
  );
}
