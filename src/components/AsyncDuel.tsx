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
  const [mode, setMode] = useState<
    "home" | "setup" | "answer" | "share" | "result"
  >("home");
  const [destination, setDestination] = useState<"friend" | "circle">("friend");
  const [code, setCode] = useState("");
  const [circle, setCircle] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<(0 | 1)[]>([]);
  const [guesses, setGuesses] = useState<(0 | 1)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<0 | 1 | null>(null);
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
    setCircle("");
    setDestination("friend");
    setMode("setup");
  }
  function beginAnswer() {
    setError("");
    setIds(duelQuestions().map((q) => q.id));
    setAnswers([]);
    setGuesses([]);
    setSelectedAnswer(null);
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
      setGuesses([]);
      setSelectedAnswer(null);
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
  function chooseAnswer(option: 0 | 1) {
    setSelectedAnswer(option);
  }
  async function chooseGuess(option: 0 | 1) {
    if (busy) return;
    if (selectedAnswer === null) return;
    setError("");
    const nextAnswers = [...answers, selectedAnswer] as (0 | 1)[];
    const nextGuesses = [...guesses, option] as (0 | 1)[];
    setAnswers(nextAnswers);
    setGuesses(nextGuesses);
    setSelectedAnswer(null);
    if (nextAnswers.length < 5) return;
    setBusy(true);
    try {
      if (duel) {
        const result = await answerDuel(duel.code, nextAnswers, nextGuesses);
        setDuel(result);
        setMode("result");
      } else {
        const created = await createDuel(
          ids,
          nextAnswers,
          circle || undefined,
          nextGuesses,
        );
        setCode(created);
        setDuel({
          code: created,
          questions: ids,
          complete: false,
          owner: true,
          ownerAnswers: null,
          guestAnswers: null,
          ownerGuesses: null,
          guestGuesses: null,
        });
        setMode("share");
      }
      void refreshHistory();
    } catch {
      setAnswers(answers);
      setGuesses(guesses);
      setSelectedAnswer(selectedAnswer);
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
  const myGuesses = duel?.owner ? duel.ownerGuesses : duel?.guestGuesses;
  const partnerAnswers = duel?.owner ? duel.guestAnswers : duel?.ownerAnswers;
  const correctGuesses =
    myGuesses && partnerAnswers
      ? myGuesses.filter((guess, i) => guess === partnerAnswers[i]).length
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
              ? "Choisis avec qui jouer, réponds à cinq choix et devine les réponses de ton duo."
              : "Choose who to play with, answer five choices, and predict your duo’s answers."}
          </p>
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
      {mode === "setup" && (
        <>
          <h1>{fr ? "Avec qui joues-tu ?" : "Who are you playing with?"}</h1>
          <p>
            {fr
              ? "Choisis d’inviter un ami ou de lancer ce duo dans un cercle avant de découvrir les dilemmes."
              : "Choose a friend or a circle before discovering the dilemmas."}
          </p>
          <div className="duel-destinations">
            <button
              aria-pressed={destination === "friend"}
              onClick={() => {
                setDestination("friend");
                setCircle("");
              }}
            >
              <strong>{fr ? "Envoyer à un ami" : "Send to a friend"}</strong>
              <span>
                {fr
                  ? "Tu partageras un code privé."
                  : "You’ll share a private code."}
              </span>
            </button>
            <button
              aria-pressed={destination === "circle"}
              disabled={!circles.length}
              onClick={() => setDestination("circle")}
            >
              <strong>
                {fr ? "Le faire dans un cercle" : "Play in a circle"}
              </strong>
              <span>
                {circles.length
                  ? fr
                    ? "Le résultat rejoindra l’historique du cercle."
                    : "The result will be added to the circle history."
                  : fr
                    ? "Crée ou rejoins d’abord un cercle."
                    : "Create or join a circle first."}
              </span>
            </button>
          </div>
          {destination === "circle" && (
            <label>
              {fr ? "Choisir le cercle" : "Choose a circle"}
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
          <button
            className="primary"
            disabled={destination === "circle" && !circle}
            onClick={beginAnswer}
          >
            {fr ? "Continuer vers les dilemmes" : "Continue to dilemmas"}
            <span>→</span>
          </button>
        </>
      )}
      {mode === "answer" && current && (
        <>
          <div className="duel-progress">{answers.length + 1}/5</div>
          <span className="eyebrow">
            {selectedAnswer === null
              ? fr
                ? "Ton choix"
                : "Your choice"
              : fr
                ? "Ta prédiction"
                : "Your prediction"}
          </span>
          <h1>
            {selectedAnswer === null
              ? current.prompt[locale]
              : fr
                ? "Que va répondre ton duo ?"
                : "What will your duo choose?"}
          </h1>
          {selectedAnswer !== null && <p>{current.prompt[locale]}</p>}
          <div className="daily-choices">
            {current.options.map((option, index) => (
              <button
                key={index}
                disabled={busy}
                onClick={() =>
                  selectedAnswer === null
                    ? chooseAnswer(index as 0 | 1)
                    : void chooseGuess(index as 0 | 1)
                }
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
          {myGuesses && partnerAnswers && (
            <p className="duel-prediction-score">
              {fr
                ? `${correctGuesses} prédiction${correctGuesses > 1 ? "s" : ""} juste${correctGuesses > 1 ? "s" : ""} sur 5.`
                : `${correctGuesses} of 5 predictions correct.`}
            </p>
          )}
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
                    {myGuesses && partnerAnswers && (
                      <small>
                        {myGuesses[i] === partnerAnswers[i]
                          ? fr
                            ? "Prédiction juste"
                            : "Correct prediction"
                          : fr
                            ? "Prédiction manquée"
                            : "Missed prediction"}
                      </small>
                    )}
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
