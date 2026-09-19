import { PredictionTurn } from "./PredictionTurn";
import type { Guesses } from "../services/predictions";
import { observeDiscussion } from "../services/discussion";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { Locale } from "../core/types";
import { PACKS, packNames, type PackId } from "../data/packs";
import { questions } from "../data/questions";
import { createSession, type Session } from "../services/session";
import {
  invitationUrl,
  roomCodeFromHash,
  roomRequest,
  storedRoom,
  storeRoom,
  type RoomCredential,
  type RoomSettings,
  type RoomState,
} from "../services/rooms";
import { QuestionScreen } from "./QuestionScreen";
import { GroupReveal } from "./GroupReveal";
import { GroupResults } from "./GroupResults";
import { ProfileView } from "./Profile";
import { ShareActions } from "./ShareActions";
import { scoreAnswers } from "../core/engine";
export function OnlineRoom({
  locale,
  onBack,
  initialSettings,
}: {
  locale: Locale;
  initialSettings?: RoomSettings;
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const invited = Boolean(roomCodeFromHash(location.hash));
  const [credential, setCredential] = useState<RoomCredential | null>(() => {
    const old = storedRoom();
    const code = roomCodeFromHash(location.hash);
    return old && (!code || old.code === code) ? old : null;
  });
  const credentialRef = useRef(credential);
  credentialRef.current = credential;
  const [room, setRoom] = useState<RoomState | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(() => roomCodeFromHash(location.hash));
  const [settings, setSettings] = useState<RoomSettings>(
    initialSettings ?? {
      pack: "general",
      length: 10,
      timer: 20,
      reveal: "round",
      predictions: true,
    },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [qr, setQr] = useState(""),
    [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<string | null>(null),
    [view, setView] = useState<"recap" | "results">("recap");
  const [pending, setPending] = useState<{
    round: number;
    option: 0 | 1;
    guesses?: Guesses;
  } | null>(null);
  const inFlight = useRef(false),
    mounted = useRef(true),
    offset = useRef(0);
  const [now, setNow] = useState(Date.now());
  const discussionDurations = useRef<Record<string, number>>({});
  const finishedInitialized = useRef(false);
  const accept = (data: RoomState) => {
    discussionDurations.current = observeDiscussion(data);
    offset.current = Date.parse(data.serverNow) - Date.now();
    setRoom(data);
    if (data.phase === "finished" && data.deck) {
      if (!finishedInitialized.current) {
        finishedInitialized.current = true;
        setView("recap");
      }
      for (const q of data.deck) {
        const index = questions.findIndex((x) => x.id === q.id);
        if (index < 0) questions.push(q);
      }
    }
  };
  async function request(
    action: string,
    payload: Record<string, unknown> = {},
    who = credentialRef.current,
    quiet = false,
  ) {
    if (!who) return;
    if (inFlight.current) {
      if (quiet) return;
      while (inFlight.current && mounted.current)
        await new Promise((resolve) => setTimeout(resolve, 100));
      if (!mounted.current) return;
    }
    inFlight.current = true;
    if (!quiet) setBusy(true);
    try {
      const data = await roomRequest(action, who, payload);
      if (!mounted.current) return;
      if (who.code !== data.code || who.creation) {
        const next = { code: data.code, token: who.token };
        storeRoom(next);
        setCredential(next);
        credentialRef.current = next;
      }
      accept(data);
      setError("");
      if (action === "answer") setPending(null);
      return true;
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "connection-error");
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!credential) return;
    void request(
      credential.code ? (credential.creation ? "join" : "state") : "create",
      credential.creation ?? {},
      credential,
    );
    const id = setInterval(() => {
      if (!document.hidden)
        void request("state", {}, credentialRef.current, true);
    }, 2000);
    return () => clearInterval(id);
  }, [credential?.code, credential?.token]);
  useEffect(() => {
    if (!room) return;
    let active = true;
    void QRCode.toDataURL(invitationUrl(room.code), {
      width: 256,
      margin: 4,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setError("qr-error");
      });
    return () => {
      active = false;
    };
  }, [room?.code]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  function connect(join: boolean) {
    if (!name.trim() || (!/^[A-Fa-f0-9]{8}$/.test(code) && join)) return;
    const token = crypto.randomUUID();
    const creation = {
      name: name.trim(),
      settings: { ...settings, predictions: true },
      deck: createSession(
        ["host"],
        settings.length,
        crypto.getRandomValues(new Uint32Array(1))[0]!,
        settings.pack,
      ).deck,
    };
    const next: RoomCredential = join
      ? { code: code.toUpperCase(), token, creation: { name: name.trim() } }
      : { code: "", token, creation };
    try {
      storeRoom(next);
      setCredential(next);
      credentialRef.current = next;
      void request(
        join ? "join" : "create",
        join ? { name: name.trim() } : creation,
        next,
      );
    } catch {
      setError("storage-unavailable");
    }
  }
  const exit = () => {
    try {
      if (!room || room.phase === "finished" || room.phase === "closed")
        storeRoom(null);
    } catch {}
    setCredential(null);
    credentialRef.current = null;
    setRoom(null);
    setPending(null);
    if (location.hash.startsWith("#room="))
      history.replaceState(null, "", location.pathname + location.search);
    onBack();
  };
  useEffect(() => {
    if (
      pending &&
      room &&
      (room.round !== pending.round ||
        room.players.find((p) => p.id === room.me)?.answered)
    )
      setPending(null);
  }, [room, pending]);
  const errorCopy =
    error.includes("Could not find") || error.includes("schema cache")
      ? fr
        ? "Le service de salons attend encore son activation."
        : "Rooms are waiting for server activation."
      : error.includes("room-full")
        ? fr
          ? "Ce salon est complet (6 joueurs)."
          : "This room is full (6 players)."
        : error.includes("already-started")
          ? fr
            ? "La partie a déjà commencé."
            : "The game has already started."
          : error.includes("room-unavailable") || error.includes("not-a-member")
            ? fr
              ? "Salon expiré, fermé ou accès retiré."
              : "Room expired, closed or access removed."
            : fr
              ? "Connexion interrompue. Réessaie ; tes choix déjà reçus restent enregistrés."
              : "Connection interrupted. Try again; received answers stay saved.";
  const errorBox = error && (
    <div className="notice" role="alert">
      {errorCopy}
      <button
        className="text-button"
        disabled={busy}
        onClick={() =>
          void request(
            pending ? "answer" : credential?.code ? "state" : "create",
            pending ?? credential?.creation ?? {},
          )
        }
      >
        {fr ? "Réessayer" : "Retry"}
      </button>
    </div>
  );
  if (!credential)
    return (
      <section className="online-entry page-in">
        <button className="text-button" onClick={exit}>
          ← {fr ? "Retour" : "Back"}
        </button>
        <span className="eyebrow">
          {fr
            ? "ENSEMBLE, CHACUN SUR SON TÉLÉPHONE"
            : "TOGETHER, EACH ON YOUR OWN PHONE"}
        </span>
        <h1>
          {fr ? "Une partie. Tous vos écrans." : "One game. All your screens."}
        </h1>
        <p className="lead">
          {fr
            ? "Crée un salon privé ou rejoins tes amis. Sans compte, avec un pseudo."
            : "Create a private room or join your friends. No account, just a nickname."}
        </p>
        <label>
          {fr ? "Ton pseudo" : "Your nickname"}
          <input
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />
        </label>
        <div className={`online-entry-grid ${invited ? "invited-entry" : ""}`}>
          {!invited && (
            <section className="profile-panel">
              <h2>{fr ? "Créer un salon" : "Create a room"}</h2>
              <label>
                Pack
                <select
                  value={settings.pack}
                  onChange={(e) =>
                    setSettings({ ...settings, pack: e.target.value as PackId })
                  }
                >
                  {PACKS.map((p) => (
                    <option key={p} value={p}>
                      {packNames[p][locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {fr ? "Questions" : "Questions"}
                <select
                  value={settings.length}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      length: Number(e.target.value) as 10 | 15 | 25,
                    })
                  }
                >
                  {[10, 15, 25].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                {fr ? "Révélation" : "Reveal"}
                <select
                  value={settings.reveal}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reveal: e.target.value as "round" | "end",
                    })
                  }
                >
                  <option value="round">
                    {fr ? "Après chaque question" : "After each question"}
                  </option>
                  <option value="end">
                    {fr ? "Tout à la fin" : "All at the end"}
                  </option>
                </select>
              </label>
              <label>
                {fr ? "Chrono indicatif" : "Optional timer"}
                <select
                  value={settings.timer}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      timer: Number(e.target.value) as 0 | 20 | 30,
                    })
                  }
                >
                  <option value={20}>20 s</option>
                  <option value={30}>30 s</option>
                  <option value={0}>{fr ? "Sans limite" : "No limit"}</option>
                </select>
              </label>
              <button
                className="primary"
                disabled={!name.trim() || busy}
                onClick={() => connect(false)}
              >
                {fr
                  ? "Créer mon salon et son QR code"
                  : "Create my room and QR code"}{" "}
                →
              </button>
            </section>
          )}
          <section className="profile-panel join-room">
            <h2>{fr ? "Rejoindre mes amis" : "Join my friends"}</h2>
            <p>
              {fr
                ? "Scanne leur QR code ou saisis le code à 8 caractères."
                : "Scan their QR code or enter the 8-character code."}
            </p>
            <label>
              {fr ? "Code du salon" : "Room code"}
              <input
                maxLength={8}
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""),
                  )
                }
                autoCapitalize="characters"
                spellCheck={false}
              />
            </label>
            <button
              className="primary"
              disabled={!name.trim() || code.length !== 8 || busy}
              onClick={() => connect(true)}
            >
              {fr ? "Rejoindre" : "Join"} →
            </button>
          </section>
        </div>
        {errorBox}
      </section>
    );
  if (!room)
    return (
      <section className="online-entry">
        <h1>{fr ? "Connexion au salon…" : "Connecting to the room…"}</h1>
        {errorBox}
        <button className="text-button" onClick={exit}>
          {fr ? "Retour" : "Back"}
        </button>
      </section>
    );
  const host = room.me === room.host,
    me = room.players.find((p) => p.id === room.me);
  const waiting = room.players.filter((p) => p.answered).length;
  const remaining = room.startedAt
    ? Math.max(
        0,
        Math.ceil(
          room.settings.timer -
            (now + offset.current - Date.parse(room.startedAt)) / 1000,
        ),
      )
    : room.settings.timer;
  const status = (
    <div className="room-status">
      <span>
        {fr ? "Salon" : "Room"} <strong>{room.code}</strong> · {waiting}/
        {room.players.length} {fr ? "réponses" : "answers"}
      </span>
      <button className="text-button" onClick={exit}>
        {fr ? "Retour à l’accueil" : "Back home"}
      </button>
      {host && room.phase !== "finished" && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void request("close")}
        >
          {fr ? "Fermer le salon pour tous" : "Close room for everyone"}
        </button>
      )}
    </div>
  );
  if (room.phase === "closed")
    return (
      <section className="online-entry">
        <h1>{fr ? "Le salon est fermé." : "The room is closed."}</h1>
        <button className="primary" onClick={exit}>
          {fr ? "Accueil" : "Home"}
        </button>
      </section>
    );
  if (room.phase === "lobby")
    return (
      <section className="online-lobby page-in">
        {status}
        {errorBox}
        <span className="eyebrow">
          {fr ? "LA SOIRÉE COMMENCE ICI" : "THE EVENING STARTS HERE"}
        </span>
        <h1>{fr ? "Tout le monde est là ?" : "Is everyone here?"}</h1>
        <p className="lead">
          {packNames[room.settings.pack][locale]} · {room.settings.length}{" "}
          {fr ? "questions" : "questions"} ·{" "}
          {fr ? "2 à 6 joueurs" : "2–6 players"}
        </p>
        {room.settings.expectedPlayers && (
          <p className="fine-print">
            {room.players.length}/{room.settings.expectedPlayers}{" "}
            {fr
              ? "joueurs attendus sont arrivés. Chacun rejoint avec son propre pseudo."
              : "expected players have arrived. Everyone joins with their own nickname."}
          </p>
        )}
        <div className="lobby-grid">
          <div className="room-invite">
            {qr && (
              <img
                src={qr}
                width={256}
                height={256}
                alt={
                  fr
                    ? "QR code pour rejoindre ce salon"
                    : "QR code to join this room"
                }
              />
            )}
            <strong className="room-code">{room.code}</strong>
            <button
              className="text-button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(invitationUrl(room.code))
                  .then(() => setCopied(true))
                  .catch(() => setError("clipboard"));
              }}
            >
              {copied
                ? fr
                  ? "Lien copié ✓"
                  : "Link copied ✓"
                : fr
                  ? "Copier le lien d’invitation"
                  : "Copy invitation link"}
            </button>
            <p>
              {fr
                ? "Scanne, choisis ton pseudo, et c’est parti."
                : "Scan, pick a nickname, and you’re in."}
            </p>
          </div>
          <div className="room-members">
            <h2>
              {room.players.length}/6 {fr ? "dans le salon" : "in the room"}
            </h2>
            {room.players.map((p) => (
              <div className="room-member" key={p.id}>
                <span
                  className={`presence ${p.online ? "online" : ""}`}
                  aria-hidden="true"
                />
                <strong>{p.name}</strong>
                <small>
                  {p.id === room.host
                    ? fr
                      ? "Hôte"
                      : "Host"
                    : p.online
                      ? fr
                        ? "Prêt·e"
                        : "Ready"
                      : fr
                        ? "Hors ligne"
                        : "Offline"}
                </small>
                {host && p.id !== room.host && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => void request("remove", { player: p.id })}
                    aria-label={`${fr ? "Retirer" : "Remove"} ${p.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {host ? (
              <button
                className="primary"
                disabled={busy || room.players.length < 2}
                onClick={() => void request("start")}
              >
                {fr ? "Lancer la partie" : "Start the game"} →
              </button>
            ) : (
              <p className="online-wait">
                {fr
                  ? "L’hôte lance la partie quand tout le monde est prêt."
                  : "The host starts when everyone is ready."}
              </p>
            )}
            <p className="fine-print">
              {fr
                ? "Garde ce navigateur pour revenir après une déconnexion. Les entrées ferment au lancement. Salon valable 2 heures."
                : "Keep this browser to reconnect. Joining closes at launch. Room expires after 2 hours."}
            </p>
          </div>
        </div>
      </section>
    );
  if (room.phase === "question" && room.question)
    return (
      <>
        {status}
        {errorBox}
        {room.settings.timer > 0 && (
          <div className="online-timer">
            {remaining
              ? `${remaining} s`
              : fr
                ? "Temps écoulé : tu peux encore répondre."
                : "Time’s up — you can still answer."}
          </div>
        )}
        {me?.answered || pending ? (
          <section className="online-waiting">
            <span className="waiting-mark" aria-hidden="true">
              ✓
            </span>
            <h1>
              {pending
                ? fr
                  ? "Envoi de tes choix…"
                  : "Sending your choice…"
                : fr
                  ? room.settings.predictions
                    ? "Tes choix et pronostics sont à l’abri."
                    : "Ton choix est à l’abri."
                  : "Your choice is safe."}
            </h1>
            <p>
              {waiting}/{room.players.length}{" "}
              {fr
                ? "ont répondu. Les autres prennent leur décision."
                : "have answered. Others are making their choice."}
            </p>
            <div className="waiting-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </section>
        ) : room.settings.predictions ? (
          <PredictionTurn
            key={`${room.code}-${room.round}`}
            question={room.question}
            locale={locale}
            index={room.round + 1}
            length={room.settings.length}
            reversed={(room.seed + room.round + 1) % 2 === 0}
            name={me?.name ?? ""}
            onPause={exit}
            players={room.players}
            me={room.me}
            storageKey={`dilemma.prediction.online.${room.code}.${room.me}.${room.round}`}
            onSubmit={async (option, _duration, guesses) => {
              const answer = { round: room.round, option, guesses };
              setPending(answer);
              return Boolean(await request("answer", answer));
            }}
          />
        ) : (
          <QuestionScreen
            key={`${room.code}-${room.round}`}
            question={room.question}
            locale={locale}
            index={room.round + 1}
            length={room.settings.length}
            reversed={(room.seed + room.round + 1) % 2 === 0}
            name={me?.name ?? ""}
            onPause={exit}
            onAnswer={(option) => {
              const answer = { round: room.round, option };
              setPending(answer);
              void request("answer", answer);
            }}
          />
        )}
      </>
    );
  if (room.phase === "reveal" && room.question) {
    const q = room.question;
    if (!questions.some((x) => x.id === q.id)) questions.push(q);
    const fake: Session = {
      version: 1,
      mode: "group",
      seed: room.seed,
      length: room.settings.length,
      currentPlayer: 0,
      questionIds: Array.from({ length: room.round + 1 }, (_, i) =>
        i === room.round ? q.id : `past-${i}`,
      ),
      pendingReveal: room.round,
      groupOptions: {
        reveal: room.settings.reveal,
        timer: room.settings.timer,
        predictions: room.settings.predictions === true,
      },
      predictions: (room.predictions ?? [])
        .filter((g) => g.round === room.round)
        .map((g) => ({ ...g, questionId: q.id })),
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        answers: Array.from({ length: room.round + 1 }, (_, i) => ({
          questionId: i === room.round ? q.id : `past-${i}`,
          option:
            room.answers.find((a) => a.player === p.id && a.round === i)
              ?.option ?? 0,
          durationMs: 0,
        })),
      })),
    };
    return (
      <div className={`online-reveal ${host ? "" : "guest-reveal"}`}>
        {status}
        {errorBox}
        <GroupReveal
          session={fake}
          locale={locale}
          onContinue={() => {
            if (host) void request("next", { round: room.round });
          }}
        />
        {!host && (
          <p className="online-wait">
            {fr
              ? "L’hôte passe à la suite après la discussion."
              : "The host continues after the discussion."}
          </p>
        )}
      </div>
    );
  }
  if (room.phase === "finished" && room.deck) {
    const session: Session = {
      version: 1,
      mode: "group",
      seed: room.seed,
      length: room.settings.length,
      currentPlayer: 0,
      questionIds: room.deck.map((q) => q.id),
      discussionDurations: discussionDurations.current,
      groupOptions: {
        reveal: room.settings.reveal,
        timer: room.settings.timer,
        predictions: room.settings.predictions === true,
      },
      predictions: (room.predictions ?? []).map((g) => ({
        ...g,
        questionId: room.deck![g.round]!.id,
      })),
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        answers: room.answers
          .filter((a) => a.player === p.id)
          .sort((a, b) => a.round - b.round)
          .map((a) => ({
            questionId: room.deck![a.round]!.id,
            option: a.option,
            durationMs: a.duration,
          })),
      })),
    };
    const player = session.players.find((p) => p.id === selected);
    if (player) {
      const portrait = {
        profile: scoreAnswers(room.deck, player.answers),
        name: player.name,
        length: room.settings.length,
      };
      return (
        <>
          {status}
          <button className="text-button" onClick={() => setSelected(null)}>
            ← {fr ? "Le groupe" : "The group"}
          </button>
          <ProfileView key={player.id} portrait={portrait} locale={locale}>
            <ShareActions portrait={portrait} locale={locale} onReplay={exit} />
          </ProfileView>
        </>
      );
    }
    return (
      <>
        {status}
        {errorBox}
        {view === "recap" ? (
          <GroupReveal
            session={session}
            locale={locale}
            recap
            onContinue={() => setView("results")}
          />
        ) : (
          <>
            <button className="text-button" onClick={() => setView("recap")}>
              {fr ? "Revoir toutes les réponses" : "Review all answers"}
            </button>
            <GroupResults
              session={session}
              locale={locale}
              onPlayer={setSelected}
              onReplay={exit}
            />
          </>
        )}
      </>
    );
  }
  return (
    <>
      {status}
      {errorBox}
    </>
  );
}
