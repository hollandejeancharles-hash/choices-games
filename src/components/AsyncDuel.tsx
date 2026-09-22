import { useEffect, useMemo, useState } from "react";
import type { Locale } from "../core/types";
import { questions } from "../data/questions";
import {
  listDuos,
  type MyDuo,
  answerDuel,
  createDuel,
  createDuelInvitation,
  readDuel,
  sendDuelInvitationEmail,
  type Circle,
  type DuelState,
} from "../services/player-features";
import { duoLink } from "../services/duel-links";
import { socialState, type Friend } from "../services/social";

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
  initialCode,
}: {
  locale: Locale;
  circles: Circle[];
  onBack: () => void;
  initialCode?: string | undefined;
}) {
  const fr = locale === "fr";
  const [mode, setMode] = useState<
    "home" | "setup" | "answer" | "share" | "result"
  >("home");
  const [destination, setDestination] = useState<"friend" | "circle">("friend");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendTarget, setFriendTarget] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [code, setCode] = useState("");
  const [circle, setCircle] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<(0 | 1)[]>([]);
  const [guesses, setGuesses] = useState<(0 | 1)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<0 | 1 | null>(null);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    void socialState()
      .then((state) => {
        setFriends(state.friends);
        setFriendTarget(state.friends[0]?.id ?? "email");
      })
      .catch(() => setFriendTarget("email"))
      .finally(() => setFriendsLoading(false));
  }, []);
  useEffect(() => {
    if (initialCode) void beginJoin(initialCode);
  }, [initialCode]);
  const current = questions.find((q) => q.id === ids[answers.length]);
  const resolved = useMemo(
    () => ids.map((id) => questions.find((q) => q.id === id)).filter(Boolean),
    [ids],
  );

  function beginCreate() {
    setError("");
    setMessage("");
    setCircle("");
    setDestination("friend");
    setFriendTarget(friends[0]?.id ?? "email");
    setInviteEmail("");
    setMode("setup");
  }
  function beginAnswer(questionIds = ids) {
    setError("");
    setMessage("");
    setIds(questionIds);
    setAnswers([]);
    setGuesses([]);
    setSelectedAnswer(null);
    setDuel(null);
    setMode("answer");
  }
  async function createAndInvite() {
    if (busy) return;
    const questionIds = duelQuestions().map((q) => q.id);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await createDuel(questionIds, circle || undefined);
      const createdDuel: DuelState = {
        code: created,
        questions: questionIds,
        complete: false,
        owner: true,
        mineAnswered: false,
        partnerAnswered: false,
        ownerAnswers: null,
        guestAnswers: null,
        ownerGuesses: null,
        guestGuesses: null,
      };
      setCode(created);
      setIds(questionIds);
      setDuel(createdDuel);
      setMode("share");
      if (destination === "friend") {
        const invitation = await createDuelInvitation(
          created,
          friendTarget === "email" ? null : friendTarget,
          friendTarget === "email" ? inviteEmail.trim() : null,
        );
        void refreshHistory();
        try {
          await sendDuelInvitationEmail(invitation.id);
          setMessage(
            invitation.recipientFound
              ? fr
                ? "Invitation envoyée : le Duo est déjà visible dans vos deux comptes."
                : "Invitation sent: the Duo is already visible in both accounts."
              : fr
                ? "Invitation envoyée par e-mail."
                : "Invitation sent by email.",
          );
        } catch {
          setError(
            fr
              ? "Le Duo est visible dans les comptes, mais l’e-mail n’a pas pu être envoyé."
              : "The Duo is visible in both accounts, but the email could not be sent.",
          );
        }
      } else {
        setMessage(
          fr
            ? "Duo créé. Tu peux répondre maintenant ou plus tard."
            : "Duo created. You can answer now or later.",
        );
        void refreshHistory();
      }
    } catch {
      setError(
        fr
          ? "Impossible de créer et d’envoyer ce Duo."
          : "Could not create and send this Duo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function beginJoin(selectedCode = code) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const found = await readDuel(selectedCode);
      setCode(found.code);
      setDuel(found);
      setIds(found.questions);
      setAnswers([]);
      setGuesses([]);
      setSelectedAnswer(null);
      setMode(
        found.complete ? "result" : found.mineAnswered ? "share" : "answer",
      );
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
  async function shareDuo() {
    const activeCode = duel?.code ?? code;
    if (!activeCode) return;
    const url = duoLink(activeCode);
    setError("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Dilemme · Duo",
          text: fr
            ? "Je t’invite à répondre à ce Duo sur Dilemme."
            : "I’m inviting you to answer this Duo on Dilemma.",
          url,
        });
        setMessage(fr ? "Invitation partagée." : "Invitation shared.");
      } else {
        await navigator.clipboard.writeText(url);
        setMessage(fr ? "Lien d’invitation copié." : "Invitation link copied.");
      }
    } catch (reason) {
      if ((reason as { name?: string })?.name !== "AbortError") {
        setError(
          fr
            ? "Impossible de partager automatiquement. Copie le lien ci-dessous."
            : "Could not share automatically. Copy the link below.",
        );
      }
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
      if (!duel) throw new Error("duel-not-created");
      const result = await answerDuel(duel.code, nextAnswers, nextGuesses);
      setDuel(result);
      setMode(result.complete ? "result" : "share");
      if (!result.complete)
        setMessage(
          fr
            ? "Tes réponses sont enregistrées. Le résultat apparaîtra quand ton ami aura répondu."
            : "Your answers are saved. Results will appear after your friend answers.",
        );
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
              ? "Choisis avec qui jouer et envoie l’invitation immédiatement. Chacun pourra répondre quand il le souhaite."
              : "Choose who to play with and send the invitation immediately. Each person can answer when ready."}
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
              <article
                key={item.code}
                className={item.invited ? "duo-history-invited" : undefined}
              >
                <button
                  className="duo-history-main"
                  disabled={busy || (item.expired && !item.complete)}
                  onClick={() => void beginJoin(item.code)}
                  aria-label={
                    item.invited
                      ? `${fr ? "Lancer le Duo" : "Start Duo"} ${item.code}`
                      : `${fr ? "Ouvrir le Duo" : "Open Duo"} ${item.code}`
                  }
                >
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
                        : !item.mineAnswered
                          ? fr
                            ? "À toi de répondre"
                            : "Your turn to answer"
                          : item.invited
                            ? fr
                              ? "Invitation reçue"
                              : "Invitation received"
                            : fr
                              ? "En attente d’une réponse"
                              : "Waiting for an answer"}
                  </span>
                </button>
                {(!item.expired || item.complete) && (
                  <button
                    className="duo-history-action"
                    disabled={busy}
                    onClick={() => void beginJoin(item.code)}
                  >
                    {item.complete
                      ? fr
                        ? "Voir les résultats"
                        : "View results"
                      : !item.mineAnswered
                        ? fr
                          ? "Répondre"
                          : "Answer"
                        : fr
                          ? "Ouvrir"
                          : "Open"}
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
          {destination === "friend" && (
            <div className="duel-recipient">
              <h2>{fr ? "Choisis ton ami" : "Choose your friend"}</h2>
              {friendsLoading ? (
                <p role="status">
                  {fr ? "Chargement de tes amis…" : "Loading your friends…"}
                </p>
              ) : friends.length ? (
                <>
                  <div className="duel-friend-list">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        aria-pressed={friendTarget === friend.id}
                        onClick={() => setFriendTarget(friend.id)}
                      >
                        {friend.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-pressed={friendTarget === "email"}
                      onClick={() => setFriendTarget("email")}
                    >
                      {fr ? "Une autre personne" : "Someone else"}
                    </button>
                  </div>
                </>
              ) : (
                <p>
                  {fr
                    ? "Tu n’as pas encore d’ami dans Dilemme. Invite quelqu’un par e-mail."
                    : "You don’t have friends on Dilemma yet. Invite someone by email."}
                </p>
              )}
              {friendTarget === "email" && (
                <label>
                  {fr ? "Adresse e-mail de ton ami" : "Your friend’s email"}
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="ami@exemple.fr"
                    required
                  />
                </label>
              )}
            </div>
          )}
          <button
            className="primary"
            disabled={
              busy ||
              (destination === "friend" && friendsLoading) ||
              (destination === "circle" && !circle) ||
              (destination === "friend" &&
                (friendTarget === "" ||
                  (friendTarget === "email" &&
                    !/^\S+@\S+\.\S+$/.test(inviteEmail.trim()))))
            }
            onClick={() => void createAndInvite()}
          >
            {busy
              ? fr
                ? "Création…"
                : "Creating…"
              : fr
                ? "Créer et envoyer l’invitation"
                : "Create and send invitation"}
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
            {duel?.mineAnswered
              ? fr
                ? "Tes réponses sont enregistrées."
                : "Your answers are saved."
              : fr
                ? "L’invitation est partie."
                : "The invitation is on its way."}
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
            {duel?.mineAnswered
              ? fr
                ? "Tu retrouveras le résultat ici dès que ton ami aura répondu."
                : "The result will appear here as soon as your friend answers."
              : fr
                ? "Le Duo est enregistré dans Mes duos. Tu peux répondre maintenant ou revenir plus tard."
                : "The Duo is saved in My duos. You can answer now or come back later."}
          </p>
          <div className="duel-share-actions">
            <button className="primary" onClick={() => void shareDuo()}>
              {fr ? "Partager l’invitation" : "Share invitation"}
              <span>↗</span>
            </button>
            <label>
              {fr ? "Lien direct" : "Direct link"}
              <input readOnly value={duoLink(duel?.code ?? code)} />
            </label>
          </div>
          {!duel?.mineAnswered ? (
            <button
              className="primary"
              onClick={() => beginAnswer(duel?.questions)}
            >
              {fr ? "Répondre maintenant" : "Answer now"}
              <span>→</span>
            </button>
          ) : (
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
          <button className="primary" onClick={beginCreate}>
            {fr ? "Créer une revanche" : "Create a rematch"}
            <span>→</span>
          </button>
        </>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
