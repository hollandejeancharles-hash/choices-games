import { useMemo, useState } from "react";
import type { Locale } from "../core/types";
import { questions } from "../data/questions";
import {
  answerDuel,
  createDuel,
  readDuel,
  type Circle,
  type DuelState,
} from "../services/player-features";

function duelQuestions() {
  return questions
    .filter((q) => q.pack === "general")
    .sort(() => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32 - 0.5)
    .slice(0, 5);
}

export function AsyncDuel({
  locale,
  circles,
  onBack,
}: {
  locale: Locale;
  circles: Circle[];
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const [mode, setMode] = useState<"home" | "answer" | "share" | "result">(
    "home",
  );
  const [code, setCode] = useState("");
  const [circle, setCircle] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<(0 | 1)[]>([]);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = questions.find((q) => q.id === ids[answers.length]);
  const resolved = useMemo(
    () => ids.map((id) => questions.find((q) => q.id === id)).filter(Boolean),
    [ids],
  );

  function beginCreate() {
    setIds(duelQuestions().map((q) => q.id));
    setAnswers([]);
    setDuel(null);
    setMode("answer");
  }
  async function beginJoin() {
    setBusy(true);
    setError("");
    try {
      const found = await readDuel(code);
      setDuel(found);
      setIds(found.questions);
      setAnswers([]);
      setMode(found.complete ? "result" : found.owner ? "share" : "answer");
    } catch {
      setError(
        fr
          ? "Duel introuvable, expiré ou déjà rejoint."
          : "Duel not found, expired, or already joined.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function choose(option: 0 | 1) {
    const next = [...answers, option] as (0 | 1)[];
    setAnswers(next);
    if (next.length < 5) return;
    setBusy(true);
    try {
      if (duel) {
        const result = await answerDuel(duel.code, next);
        setDuel(result);
        setMode("result");
      } else {
        const created = await createDuel(ids, next, circle || undefined);
        setCode(created);
        setMode("share");
      }
    } catch {
      setError(
        fr
          ? "Impossible de terminer ce duel."
          : "Could not complete this duel.",
      );
    } finally {
      setBusy(false);
    }
  }
  const agreements =
    duel?.complete && duel.ownerAnswers && duel.guestAnswers
      ? duel.ownerAnswers.filter(
          (answer, i) => answer === duel.guestAnswers![i],
        ).length
      : 0;
  return (
    <section className="duel-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Retour" : "Back"}
      </button>
      <span className="eyebrow">{fr ? "Duel asynchrone" : "Async duel"}</span>
      {mode === "home" && (
        <>
          <h1>
            {fr
              ? "Même dilemme. Deux regards."
              : "Same dilemma. Two perspectives."}
          </h1>
          <p>
            {fr
              ? "Réponds à cinq choix, puis partage un code privé à une personne."
              : "Answer five choices, then share a private code with one person."}
          </p>
          {circles.length > 0 && (
            <label>
              {fr
                ? "Associer à un cercle (facultatif)"
                : "Add to a circle (optional)"}
              <select
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
              >
                <option value="">—</option>
                {circles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="primary" onClick={beginCreate}>
            {fr ? "Créer un duel" : "Create a duel"}
            <span>→</span>
          </button>
          <div className="duel-join">
            <label>
              {fr ? "Code reçu" : "Invite code"}
              <input
                value={code}
                maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <button
              disabled={code.length !== 8 || busy}
              onClick={() => void beginJoin()}
            >
              {fr ? "Rejoindre" : "Join"}
            </button>
          </div>
        </>
      )}
      {mode === "answer" && current && (
        <>
          <div className="duel-progress">{answers.length + 1}/5</div>
          <h1>{current.prompt[locale]}</h1>
          <div className="daily-choices">
            {current.options.map((option, index) => (
              <button
                key={index}
                disabled={busy}
                onClick={() => void choose(index as 0 | 1)}
              >
                <strong>{index === 0 ? "A" : "B"}</strong>
                <span>{option.text[locale]}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {mode === "share" && (
        <>
          <h1>
            {duel?.owner
              ? fr
                ? "Ton duel attend une réponse."
                : "Your duel is waiting for an answer."
              : fr
                ? "Code prêt à partager."
                : "Your code is ready."}
          </h1>
          <div className="duel-code">{duel?.code ?? code}</div>
          <p>
            {fr
              ? "Envoie uniquement ce code à la personne de ton choix. Il expire après 14 jours."
              : "Share this code only with the person you choose. It expires after 14 days."}
          </p>
          {duel?.owner && (
            <button onClick={() => void beginJoin()}>
              {fr ? "Actualiser" : "Refresh"}
            </button>
          )}
        </>
      )}
      {mode === "result" && duel && (
        <>
          <h1>
            {fr
              ? `${agreements} accord${agreements > 1 ? "s" : ""} sur 5.`
              : `${agreements} of 5 in agreement.`}
          </h1>
          <div className="duel-results">
            {resolved.map(
              (question, i) =>
                question && (
                  <article key={question.id}>
                    <p>{question.prompt[locale]}</p>
                    <span>
                      {duel.ownerAnswers?.[i] === duel.guestAnswers?.[i]
                        ? fr
                          ? "Même choix"
                          : "Same choice"
                        : fr
                          ? "Choix différents"
                          : "Different choices"}
                    </span>
                  </article>
                ),
            )}
          </div>
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
