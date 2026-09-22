import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../core/types";
import { questions } from "../data/questions";
import {
  listDuos,
  type MyDuo,
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
  const [duos, setDuos] = useState<MyDuo[]>([]);
  const [historyStatus, setHistoryStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  async function refreshHistory() {
    setHistoryStatus("loading");
    try {
      setDuos(await listDuos());
      setHistoryStatus("ready");
    } catch {
      setHistoryStatus("error");
    }
  }
  useEffect(() => {
    void refreshHistory();
  }, []);
  const current = questions.find((q) => q.id === ids[answers.length]);
  const resolved = useMemo(
    () => ids.map((id) => questions.find((q) => q.id === id)).filter(Boolean),
    [ids],
  );

  function beginCreate() {
    setError("");
    setIds(duelQuestions().map((q) => q.id));
    setAnswers([]);
    setDuel(null);
    setMode("answer");
  }
  async function beginJoin(selectedCode = code) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const found = await readDuel(selectedCode);
      setCode(found.code);
      setDuel(found);
      setIds(found.questions);
      setAnswers([]);
      setMode(found.complete ? "result" : found.owner ? "share" : "answer");
    } catch {
      setError(
        fr
          ? "Duo introuvable, expiré ou déjà rejoint."
          : "Duo not found, expired, or already joined.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function choose(option: 0 | 1) {
    if (busy) return;
    setError("");
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
        setDuel({
          code: created,
          questions: ids,
          complete: false,
          owner: true,
          ownerAnswers: null,
          guestAnswers: null,
        });
        setMode("share");
      }
      void refreshHistory();
    } catch {
      setAnswers(answers);
      setError(
        fr ? "Impossible de terminer ce duo." : "Could not complete this duo.",
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
      <button
        className="text-button"
        onClick={
          mode === "home"
            ? onBack
            : () => {
                setMode("home");
                setError("");
                void refreshHistory();
              }
        }
      >
        ←{" "}
        {mode === "home"
          ? fr
            ? "Retour"
            : "Back"
          : fr
            ? "Mes duos"
            : "My duos"}
      </button>
      <span className="eyebrow">{fr ? "Duo" : "Duo"}</span>
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
            {fr ? "Créer un duo" : "Create a duo"}
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
          <section className="duo-history" aria-labelledby="my-duos-title">
            <header>
              <h2 id="my-duos-title">{fr ? "Mes duos" : "My duos"}</h2>
              <button
                disabled={historyStatus === "loading"}
                onClick={() => void refreshHistory()}
              >
                {fr ? "Actualiser" : "Refresh"}
              </button>
            </header>
            {historyStatus === "loading" && (
              <p role="status">{fr ? "Chargement…" : "Loading…"}</p>
            )}
            {historyStatus === "error" && (
              <p role="alert">
                {fr
                  ? "Impossible de charger tes duos. Réessaie avec Actualiser."
                  : "Could not load your duos. Try Refresh."}
              </p>
            )}
            {historyStatus === "ready" && duos.length === 0 && (
              <p>
                {fr
                  ? "Tes duos créés et rejoints apparaîtront ici."
                  : "Duos you create and join will appear here."}
              </p>
            )}
            {duos.map((item) => (
              <article key={item.code}>
                <div>
                  <strong>Duo · {item.code}</strong>
                  <small>
                    {new Date(item.createdAt).toLocaleDateString(locale)} ·{" "}
                    {item.owner
                      ? fr
                        ? "Créé par toi"
                        : "Created by you"
                      : fr
                        ? "Rejoint"
                        : "Joined"}
                  </small>
                  <span>
                    {item.complete
                      ? fr
                        ? "Terminé"
                        : "Completed"
                      : item.expired
                        ? fr
                          ? "Expiré"
                          : "Expired"
                        : fr
                          ? "En attente d’une réponse"
                          : "Waiting for an answer"}
                  </span>
                </div>
                {(!item.expired || item.complete) && (
                  <button
                    disabled={busy}
                    onClick={() => void beginJoin(item.code)}
                  >
                    {item.complete
                      ? fr
                        ? "Voir les résultats"
                        : "View results"
                      : fr
                        ? "Voir le code"
                        : "View code"}
                  </button>
                )}
              </article>
            ))}
          </section>
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
                ? "Ton duo attend une réponse."
                : "Your duo is waiting for an answer."
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
