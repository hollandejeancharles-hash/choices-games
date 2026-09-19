import type { Locale } from "../core/types";
import { compareGroup, rankArchetypes } from "../core/engine";
import { groupStory, longestDiscussion } from "../core/group-story";
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
  const fr = locale === "fr";
  const story = groupStory(group.profiles, locale);
  const discussed = longestDiscussion(
    session.discussionDurations,
    session.questionIds,
  );
  const divided = questions.find((q) => q.id === discussed?.id);
  const agreed = session.questionIds.filter((id) =>
    session.players.every(
      (p) =>
        p.answers.find((a) => a.questionId === id)?.option ===
        session.players[0]?.answers.find((a) => a.questionId === id)?.option,
    ),
  ).length;
  const dividedOrder =
    divided &&
    (session.seed + session.questionIds.indexOf(divided.id) + 1) % 2 === 0
      ? ([1, 0] as const)
      : ([0, 1] as const);
  return (
    <section className="group-results group-story page-in">
      <div className="story-hero">
        <div>
          <span className="eyebrow">
            {fr ? "LE PORTRAIT DE VOTRE PARTIE" : "THE STORY OF YOUR GAME"}
          </span>
          <h1>
            {fr ? (
              <>
                Ce qui vous rapproche.
                <br />
                <em>Ce qui vous surprend.</em>
              </>
            ) : (
              <>
                What brings you together.
                <br />
                <em>What surprises you.</em>
              </>
            )}
          </h1>
          <ul
            className="story-participants"
            aria-label={
              fr ? "Les joueurs de cette partie" : "Players in this game"
            }
          >
            {session.players.map((p, i) => (
              <li key={p.id}>
                <span
                  className={`recap-avatar avatar-${i % 4}`}
                  aria-hidden="true"
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="story-opening">
        {fr
          ? `Vous avez fait le même choix sur ${agreed} des ${session.questionIds.length} dilemmes. Voici ce que vos réponses racontent de cette partie, et quelques pistes pour poursuivre la conversation.`
          : `You made the same choice on ${agreed} of ${session.questionIds.length} dilemmas. Here is what your answers suggest about this game, and a few ways to keep the conversation going.`}
      </p>
      <div className="story-paragraphs">
        <article>
          <span className="story-symbol" aria-hidden="true">
            ◎
          </span>
          <h2>{fr ? "Votre terrain commun" : "Your common ground"}</h2>
          <p>{story.common}</p>
        </article>
        <article>
          <span className="story-symbol" aria-hidden="true">
            ↗
          </span>
          <h2>{fr ? "Vos façons de voir" : "Your different perspectives"}</h2>
          <p>{story.different}</p>
        </article>
      </div>
      <section className="profile-panel division-panel">
        <span className="eyebrow">
          {fr ? "LA CONVERSATION QUI A DURÉ" : "THE CONVERSATION THAT LASTED"}
        </span>
        <h2 className="story-discussion-title">
          {fr
            ? "Vous aviez encore des choses à vous dire."
            : "You still had more to say."}
        </h2>
        {divided ? (
          <>
            <p className="story-duration">
              {fr
                ? `Environ ${Math.max(1, Math.round((discussed?.ms ?? 0) / 1000))} secondes sur cette révélation : votre plus long temps enregistré.`
                : `About ${Math.max(1, Math.round((discussed?.ms ?? 0) / 1000))} seconds on this reveal: your longest recorded time.`}
            </p>
            <h3>{divided.prompt[locale]}</h3>
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
          <p>
            {fr
              ? "Aucun temps de discussion n’a été enregistré pour cette partie. Il sera mesuré entre la révélation des réponses et le passage au dilemme suivant lorsque les réponses sont révélées après chaque question."
              : "No discussion time was recorded for this game. It is measured between revealing the answers and moving to the next dilemma when answers are revealed after each question."}
          </p>
        )}
      </section>
      <h2 className="section-heading">
        {fr ? "Et chacun dans tout ça ?" : "And each of you?"}
      </h2>
      <p className="story-profile-intro">
        {fr
          ? "Ouvre un portrait pour retrouver les nuances de ses choix."
          : "Open a portrait to explore the nuances behind their choices."}
      </p>
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
      <button className="primary" onClick={onReplay}>
        {t.replay}
        <span>↻</span>
      </button>
    </section>
  );
}
