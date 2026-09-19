import type { Locale } from "../core/types";
import type { Session } from "../services/session";
import { predictionRanking } from "../services/predictions";
import "../styles/predictions.css";
export function PredictionLeaderboard({
  session,
  locale,
  questionId,
}: {
  session: Session;
  locale: Locale;
  questionId?: string;
}) {
  if (!session.groupOptions?.predictions) return null;
  const fr = locale === "fr";
  const rows = predictionRanking(session, questionId);
  const titles = fr
    ? [
        "Télépathe du groupe",
        "Radar à intuitions",
        "Fin limier",
        "Explorateur des esprits",
      ]
    : [
        "Group mind reader",
        "Intuition radar",
        "Sharp detective",
        "Mind explorer",
      ];
  const max = (session.players.length - 1) * (questionId ? 1 : session.length);
  const winners = rows.filter((r) => r.rank === 1);
  return (
    <section
      className={`prediction-leaderboard ${questionId ? "round-points" : ""}`}
      aria-label={fr ? "Classement des pronostics" : "Prediction leaderboard"}
    >
      <div className="leaderboard-heading">
        <span className="eyebrow">
          {questionId
            ? fr
              ? "Vos intuitions sur ce dilemme"
              : "Your guesses this round"
            : fr
              ? "Le palmarès des intuitions"
              : "The intuition awards"}
        </span>
        <span aria-hidden="true">✦</span>
      </div>
      {!questionId && (
        <>
          <h2>
            {winners.length > 1
              ? fr
                ? "La victoire se partage !"
                : "A shared victory!"
              : fr
                ? `${winners[0]?.name} a lu dans vos pensées !`
                : `${winners[0]?.name} read your minds!`}
          </h2>
          <p>
            {fr
              ? "Un point par bonne prédiction. Vos choix personnels ne rapportent aucun point : restez vous-mêmes."
              : "One point per correct prediction. Your own answers earn no points: be yourselves."}
          </p>
        </>
      )}
      <ol>
        {rows.map((r) => (
          <li
            key={r.id}
            className={!questionId && r.rank === 1 ? "prediction-winner" : ""}
          >
            <span className="prediction-rank">
              {r.rank}
              <small>{r.tied ? (fr ? "ex æquo" : "tied") : ""}</small>
            </span>
            <span
              className={`prediction-avatar tone-${r.index % 6}`}
              aria-hidden="true"
            >
              {r.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="prediction-identity">
              <strong>{r.name}</strong>
              {!questionId && <span>{titles[Math.min(r.rank - 1, 3)]}</span>}
            </div>
            <span className="prediction-score">
              <b>
                {questionId ? "+" : ""}
                {r.points}
              </b>
              <small>
                {questionId ? (fr ? "point(s)" : "point(s)") : `/ ${max} pts`}
              </small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
