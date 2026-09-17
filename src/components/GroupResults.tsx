import type { Locale } from "../core/types";
import { compareGroup, rankArchetypes } from "../core/engine";
import { duoSummary } from "../core/duo";
import { archetypes, axisCopy } from "../data/archetypes";
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
  const isDuo = session.players.length === 2;
  const duo = isDuo
    ? duoSummary(
        session.players[0]!,
        session.players[1]!,
        group.profiles[0]!.profile,
        group.profiles[1]!.profile,
      )
    : null;
  const axisLabel = (axis: keyof typeof axisCopy) =>
    `${axisCopy[axis].negative[locale]} / ${axisCopy[axis].positive[locale]}`;
  const divided = questions.find(
    (q) => q.id === group.mostDivisive?.questionId,
  );
  const dividedOrder =
    divided &&
    (session.seed + session.questionIds.indexOf(divided.id) + 1) % 2 === 0
      ? ([1, 0] as const)
      : ([0, 1] as const);
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
      {duo ? (
        <section className="duo-card">
          <div className="duo-card-heading">
            <div>
              <span className="eyebrow">
                {locale === "fr" ? "VOTRE DUO" : "YOUR DUO"}
              </span>
              <h2>{names(session.players.map((p) => p.id))}</h2>
            </div>
            <span className="duo-symbol" aria-hidden="true">
              ◎
            </span>
          </div>
          <div className="duo-common-count">
            <strong>
              {duo.same}
              <small> / {duo.total}</small>
            </strong>
            <p>
              {locale === "fr"
                ? "dilemmes où vous avez choisi la même réponse"
                : "dilemmas where you chose the same answer"}
            </p>
          </div>
          <div className="duo-insights">
            <article>
              <h3>
                {locale === "fr" ? "Vos points communs" : "Your common ground"}
              </h3>
              <p>
                {duo.common.length
                  ? duo.common.map(axisLabel).join(" · ")
                  : locale === "fr"
                    ? "Vos scores dessinent des tendances différentes sur les dimensions explorées."
                    : "Your scores show different tendencies across the dimensions explored."}
              </p>
              {duo.common.length > 0 && (
                <small>
                  {locale === "fr"
                    ? "Vos scores se rapprochent sur ces dimensions, sans forcément les mêmes raisons."
                    : "Your scores are close on these dimensions, though your reasons may differ."}
                </small>
              )}
            </article>
            <article>
              <h3>
                {locale === "fr" ? "Ce qui vous distingue" : "Where you differ"}
              </h3>
              <p>
                {duo.different.length
                  ? duo.different.map(axisLabel).join(" · ")
                  : locale === "fr"
                    ? "Vos scores sont identiques sur les dimensions explorées."
                    : "Your scores match on the dimensions explored."}
              </p>
              {duo.different.length > 0 && (
                <small>
                  {locale === "fr"
                    ? "L’écart le plus marqué entre vos portraits dans cette partie."
                    : "The largest gap between your portraits in this round."}
                </small>
              )}
            </article>
          </div>
        </section>
      ) : (
        <div className="compatibility-cards">
          {[group.closest, group.furthest].map((pair, i) => (
            <article className="profile-panel" key={i}>
              <span className="eyebrow">
                {i === 0 ? t.closest : t.furthest}
              </span>
              <strong className="compatibility-number">
                {pair.similarity}
                <small>%</small>
              </strong>
              <p>{t.similarity}</p>
              <h2>{names(pair.players)}</h2>
            </article>
          ))}
        </div>
      )}
      {!isDuo && allEqual && (
        <p className="fine-print">
          {locale === "fr"
            ? "Tous les duos ont le même score : les deux catégories sont ex æquo."
            : "Every pair has the same score: both categories are tied."}
        </p>
      )}
      <section className="profile-panel division-panel">
        <span className="eyebrow">
          {isDuo
            ? locale === "fr"
              ? "LE DILEMME QUI VOUS DIVISE"
              : "THE DILEMMA THAT DIVIDES YOU"
            : t.divided}
        </span>
        {divided ? (
          <>
            <h2>{divided.prompt[locale]}</h2>
            <div className="division-options">
              {dividedOrder.map((option, index) => {
                const o = divided.options[option];
                const picked = session.players.filter(
                  (p) =>
                    p.answers.find((a) => a.questionId === divided.id)
                      ?.option === option,
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
      {!isDuo && (
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
      )}
      <button className="primary" onClick={onReplay}>
        {t.replay}
        <span>↻</span>
      </button>
    </section>
  );
}
