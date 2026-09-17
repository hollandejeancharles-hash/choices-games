import { GroupReveal } from "./components/GroupReveal";
import { packNames, packDescriptions, PACKS, type PackId } from "./data/packs";
import { ProposeDilemma, AdminDilemmas } from "./components/Community";
import { Gallery } from "./components/Gallery";
import { AnimatedLogo } from "./components/ui/animated-logo";
import { GlowButton } from "./components/ui/glow";
import { lazy, Suspense, useEffect, useState } from "react";
const OnlineRoom = lazy(() =>
  import("./components/OnlineRoom").then((m) => ({ default: m.OnlineRoom })),
);
import type { GameLength } from "./core/types";
import { copy } from "./i18n";
import { questions } from "./data/questions";
import {
  createSession,
  acknowledgeReveal,
  sessionScreen,
  initialLocale,
  isComplete,
  loadSession,
  readPreference,
  recordAnswer,
  savePreference,
  saveSession,
  type Session,
} from "./services/session";
import { scoreAnswers } from "./core/engine";
import { GroupResults } from "./components/GroupResults";
import { ShareActions } from "./components/ShareActions";
import { resultFromHash } from "./services/share";
import { ProfileView } from "./components/Profile";
import { QuestionScreen } from "./components/QuestionScreen";
import { AuroraBackground } from "./components/ui/aurora-background";
import { Testimonials } from "./components/ui/3d-testimonials";
type Screen =
  | "online"
  | "propose"
  | "admin"
  | "gallery"
  | "home"
  | "setup"
  | "handoff"
  | "question"
  | "analysis"
  | "result"
  | "round-reveal"
  | "recap";
export default function App() {
  const [shared, setShared] = useState(() => resultFromHash(location.hash));
  const [invalidLink, setInvalidLink] = useState(
    () => location.hash.startsWith("#r=") && !resultFromHash(location.hash),
  );
  const [locale, setLocale] = useState(() => shared?.locale ?? initialLocale());
  const [dark, setDark] = useState(
    () => readPreference("dilemma.theme") === "dark",
  );
  const [screen, setScreen] = useState<Screen>(
    location.hash.startsWith("#room=") ? "online" : shared ? "result" : "home",
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(loadSession);
  const [storageError, setStorageError] = useState(false);
  const [pack, setPack] = useState<PackId>("general");
  const [revealMode, setRevealMode] = useState<"round" | "end">("round");
  const [timeLimit, setTimeLimit] = useState<0 | 20 | 30>(20);
  const [mode, setMode] = useState<"solo" | "group">("solo");
  const [length, setLength] = useState<GameLength>(15),
    [count, setCount] = useState(2);
  const [names, setNames] = useState(["", "", "", "", "", ""]);
  const t = copy[locale];
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `${t.brand} — ${t.tagline}`;
    savePreference("dilemma.locale", locale);
  }, [locale, t]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    savePreference("dilemma.theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (session) setStorageError(!saveSession(session));
  }, [session]);
  useEffect(() => {
    if (screen !== "analysis") return;
    const timer = setTimeout(() => setScreen("result"), 1500);
    return () => clearTimeout(timer);
  }, [screen]);
  useEffect(() => {
    if (screen !== "question") document.getElementById("main")?.focus();
    window.scrollTo({ top: 0 });
  }, [screen, selectedPlayer]);
  function leaveShare() {
    setShared(null);
    setInvalidLink(false);
    if (location.hash.startsWith("#r="))
      history.replaceState(null, "", location.pathname + location.search);
  }
  function replay() {
    leaveShare();
    setSelectedPlayer(null);
    setScreen("setup");
  }
  useEffect(() => {
    const changed = () => {
      if (location.hash.startsWith("#room=")) {
        setShared(null);
        setScreen("online");
        return;
      }
      const result = resultFromHash(location.hash);
      setShared(result);
      setInvalidLink(location.hash.startsWith("#r=") && !result);
      if (result) {
        setLocale(result.locale);
        setScreen("result");
      }
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  function start() {
    setSelectedPlayer(null);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    setSession(
      createSession(
        Array.from(
          { length: mode === "solo" ? 1 : count },
          (_, i) => names[i]?.trim() || `${t.player} ${i + 1}`,
        ),
        length,
        seed,
        pack,
        mode === "group" ? { reveal: revealMode, timer: timeLimit } : undefined,
      ),
    );
    setScreen("handoff");
  }
  function answer(option: 0 | 1, duration: number) {
    if (!session) return;
    const updated = recordAnswer(session, option, duration);
    setSession(updated);
    setScreen(
      updated.pendingReveal !== undefined
        ? "round-reveal"
        : updated.pendingRecap
          ? "recap"
          : isComplete(updated)
            ? "analysis"
            : updated.mode === "group"
              ? "handoff"
              : "question",
    );
  }
  const current = session
    ? questions.find((q) => q.id === session.questionIds.at(-1))
    : undefined;
  return (
    <AuroraBackground enabled={screen === "home"}>
      <div className="app-shell">
        <a className="skip" href="#main">
          {locale === "fr" ? "Aller au contenu" : "Skip to content"}
        </a>
        <header>
          <button
            className="brand"
            onClick={() => {
              leaveShare();
              setScreen("home");
            }}
            aria-label={`${t.brand} · ${t.home}`}
          >
            <AnimatedLogo interactive />
            <span>
              {t.brand}
              <span className="brand-period">.</span>
            </span>
          </button>
          <nav
            className="header-nav"
            aria-label={
              locale === "fr" ? "Découvrir Dilemme" : "Explore Dilemma"
            }
          >
            <button
              aria-current={screen === "gallery" ? "page" : undefined}
              onClick={() => {
                leaveShare();
                setScreen("gallery");
              }}
            >
              {locale === "fr" ? "Les dix personnages" : "The ten characters"}
            </button>
            <button
              aria-current={screen === "propose" ? "page" : undefined}
              onClick={() => {
                leaveShare();
                setScreen("propose");
              }}
            >
              {locale === "fr" ? "Proposer un dilemme" : "Suggest a dilemma"}
            </button>
          </nav>
          <div className="header-tools">
            <div className="locale-switch" aria-label={t.language}>
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  lang={l}
                  aria-pressed={locale === l}
                  onClick={() => setLocale(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              className="theme-button"
              aria-label={t.theme}
              onClick={() => setDark(!dark)}
            >
              {dark ? "☼" : "◐"}
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {invalidLink && (
            <p className="notice" role="status">
              {t.invalidLink}
            </p>
          )}
          {storageError && (
            <p role="status" className="notice">
              {t.storageError}
            </p>
          )}
          {screen === "home" && (
            <section className="home page-in">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="live-dot" />
                  {t.tagline}
                </span>
                <h1>
                  {t.heroA}
                  <br />
                  {t.heroB}
                  <br />
                  <em>{t.heroC}</em>
                </h1>
                <p className="hero-intro">{t.intro}</p>
                <GlowButton onClick={() => setScreen("setup")}>
                  {t.start}
                  <span aria-hidden="true">↗</span>
                </GlowButton>
                <button
                  className="online-home-link"
                  onClick={() => setScreen("online")}
                >
                  {locale === "fr"
                    ? "Jouer chacun sur son téléphone"
                    : "Play on separate phones"}{" "}
                  <span aria-hidden="true">↗</span>
                </button>
                {session && (
                  <button
                    className="resume"
                    onClick={() => setScreen(sessionScreen(session))}
                  >
                    {t.resume} <span>→</span>
                  </button>
                )}
                <div className="hero-facts">
                  <span>{`${questions.filter((q) => q.pack).length} ${locale === "fr" ? "dilemmes" : "dilemmas"}`}</span>
                  <span>{t.feature2}</span>
                  <span>{t.feature3}</span>
                </div>
              </div>
              <div className="hero-art">
                <div className="palette-fan" aria-hidden="true">
                  <span className="fan-card fan-coral" />
                  <span className="fan-card fan-emerald" />
                  <span className="fan-card fan-sky" />
                  <span className="fan-card fan-gold" />
                  <span className="fan-card fan-tangerine" />
                </div>
                <div className="example-card">
                  <span className="eyebrow">{t.exampleTag}</span>
                  <AnimatedLogo />
                  <p>{t.example}</p>
                  <div className="example-rule" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <span>{t.exampleFoot}</span>
                </div>
              </div>
            </section>
          )}
          {screen === "online" && (
            <Suspense
              fallback={
                <p role="status">
                  {locale === "fr" ? "Chargement du salon…" : "Loading room…"}
                </p>
              }
            >
              <OnlineRoom
                locale={locale}
                initialSettings={{
                  pack,
                  length,
                  timer: timeLimit,
                  reveal: revealMode,
                }}
                onBack={() => setScreen("home")}
              />
            </Suspense>
          )}
          {screen === "propose" && (
            <ProposeDilemma locale={locale} onBack={() => setScreen("home")} />
          )}
          {screen === "admin" && (
            <AdminDilemmas locale={locale} onBack={() => setScreen("home")} />
          )}
          {screen === "gallery" && (
            <Gallery
              locale={locale}
              onBack={() => setScreen("home")}
              onPlay={replay}
            />
          )}
          {screen === "home" && <Testimonials locale={locale} />}
          {screen === "setup" && (
            <section className="setup setup-redesign page-in">
              <button className="text-button" onClick={() => setScreen("home")}>
                ← {t.back}
              </button>
              <div className="setup-heading">
                <span className="eyebrow">
                  {locale === "fr"
                    ? "À CHAQUE PARTIE, UN NOUVEL ANGLE"
                    : "A NEW ANGLE, EVERY GAME"}
                </span>
                <h1>
                  {locale === "fr"
                    ? "À toi de choisir le terrain."
                    : "Choose your playground."}
                </h1>
                <p>
                  {locale === "fr"
                    ? "Des liens qui comptent. Des choix qui bousculent. Compose ta partie."
                    : "Real connections. Tough choices. Make this game yours."}
                </p>
              </div>
              <div className="setup-layout">
                <fieldset className="setup-packs">
                  <legend>
                    <span className="setup-step">01</span>
                    {locale === "fr"
                      ? "De quoi on parle ?"
                      : "What’s on the table?"}
                  </legend>
                  <div className="setup-pack-grid">
                    {PACKS.map((id, i) => (
                      <button
                        key={id}
                        className={`setup-pack setup-pack--${id}`}
                        aria-pressed={pack === id}
                        onClick={() => setPack(id)}
                      >
                        <span className="setup-pack-top">
                          <span
                            className="setup-pack-symbol"
                            aria-hidden="true"
                          >
                            {["✳", "◎", "♡", "⌂"][i]}
                          </span>
                          <span className="setup-pack-check" aria-hidden="true">
                            {pack === id ? "✓" : "+"}
                          </span>
                        </span>
                        <strong>{packNames[id][locale]}</strong>
                        <span className="setup-pack-description">
                          {packDescriptions[id][locale]}
                        </span>
                        <span className="setup-pack-bottom">
                          <small>
                            {questions.filter((q) => q.pack === id).length}{" "}
                            {locale === "fr"
                              ? "dilemmes à explorer"
                              : "dilemmas to explore"}
                          </small>
                          <span aria-hidden="true">↗</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <aside
                  className="setup-settings"
                  aria-label={locale === "fr" ? "Ta partie" : "Your game"}
                >
                  <fieldset>
                    <legend>
                      <span className="setup-step">02</span>
                      {locale === "fr" ? "Avec qui ?" : "Who’s playing?"}
                    </legend>
                    <div className="setup-mode-switch">
                      {(["solo", "group"] as const).map((m) => (
                        <button
                          key={m}
                          aria-pressed={mode === m}
                          onClick={() => setMode(m)}
                        >
                          {t[m]}
                        </button>
                      ))}
                    </div>
                    <p className="setup-help">
                      {mode === "solo"
                        ? t.soloDesc
                        : locale === "fr"
                          ? "Sur cet appareil : passez-vous l’écran à tour de rôle."
                          : "On this device: take turns passing the screen."}
                    </p>
                  </fieldset>
                  {mode === "group" && (
                    <div className="group-setup">
                      <button
                        className="setup-online-access"
                        onClick={() => setScreen("online")}
                      >
                        <strong>
                          {locale === "fr"
                            ? "Chacun sur son téléphone"
                            : "Each on your own phone"}{" "}
                          <span aria-hidden="true">↗</span>
                        </strong>
                        <span>
                          {locale === "fr"
                            ? "Créer un salon et afficher le QR code d’invitation"
                            : "Create a room and show the invitation QR code"}
                        </span>
                      </button>
                      <label>
                        {t.players}
                        <select
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                        >
                          {[2, 3, 4, 5, 6].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <div className="name-grid">
                        {Array.from({ length: count }, (_, i) => (
                          <label key={i}>
                            {t.player} {i + 1}
                            <input
                              maxLength={40}
                              value={names[i]}
                              placeholder={`${t.name} ${i + 1}`}
                              onChange={(e) =>
                                setNames(
                                  names.map((name, j) =>
                                    j === i ? e.target.value : name,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <fieldset>
                    <legend>
                      <span className="setup-step">03</span>
                      {locale === "fr"
                        ? "Jusqu’où on va ?"
                        : "How deep do we go?"}
                    </legend>
                    <div className="setup-lengths">
                      {([10, 15, 25] as const).map((n, i) => (
                        <button
                          key={n}
                          aria-pressed={length === n}
                          onClick={() => setLength(n)}
                        >
                          <strong>{n}</strong>
                          <span>{t.questions}</span>
                          <small>{[t.short, t.standard, t.long][i]}</small>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  {mode === "group" && (
                    <fieldset className="group-rhythm">
                      <legend>
                        {locale === "fr"
                          ? "Le rythme du groupe"
                          : "Your group’s rhythm"}
                      </legend>
                      <span className="group-setting-label">
                        {locale === "fr"
                          ? "Quand découvrir les réponses ?"
                          : "When do we reveal answers?"}
                      </span>
                      <div className="reveal-mode-options">
                        {(["round", "end"] as const).map((value) => (
                          <button
                            key={value}
                            aria-pressed={revealMode === value}
                            onClick={() => setRevealMode(value)}
                          >
                            <strong>
                              {value === "round"
                                ? locale === "fr"
                                  ? "Après chaque question"
                                  : "After each question"
                                : locale === "fr"
                                  ? "Tout à la fin"
                                  : "All at the end"}
                            </strong>
                            <span>
                              {value === "round"
                                ? locale === "fr"
                                  ? "On choisit, on découvre, on débat."
                                  : "Choose, reveal, discuss."
                                : locale === "fr"
                                  ? "On garde le suspense jusqu’au récap."
                                  : "Keep the suspense until the recap."}
                            </span>
                          </button>
                        ))}
                      </div>
                      <span className="group-setting-label">
                        {locale === "fr"
                          ? "Temps pour choisir"
                          : "Time to choose"}
                      </span>
                      <div className="timer-options">
                        {([20, 30, 0] as const).map((value) => (
                          <button
                            key={value}
                            aria-pressed={timeLimit === value}
                            onClick={() => setTimeLimit(value)}
                          >
                            {value
                              ? `${value} s`
                              : locale === "fr"
                                ? "Sans limite"
                                : "No limit"}
                          </button>
                        ))}
                      </div>
                      <p className="setup-help">
                        {locale === "fr"
                          ? "À zéro, tu peux encore répondre. Le chrono ne change pas ton portrait."
                          : "At zero, you can still answer. The timer does not affect your portrait."}
                      </p>
                    </fieldset>
                  )}
                  <div className="setup-recap" aria-live="polite">
                    <span>
                      {locale === "fr" ? "AU PROGRAMME" : "YOUR LINE-UP"}
                    </span>
                    <strong>{packNames[pack][locale]}</strong>
                    <p>
                      {length} {t.questions} ·{" "}
                      {mode === "solo"
                        ? t.solo
                        : `${count} ${locale === "fr" ? "joueurs" : "players"}`}
                    </p>
                  </div>
                  <button className="primary setup-launch" onClick={start}>
                    {t.launch}
                    <span>→</span>
                  </button>
                  <p className="setup-endnote">
                    {locale === "fr"
                      ? "Suis ton instinct. Prends le temps qu’il te faut."
                      : "Trust your instinct. Take all the time you need."}
                  </p>
                </aside>
              </div>
            </section>
          )}
          {screen === "handoff" && session && (
            <section className="handoff page-in">
              <img src="./dilemme-logo.png" alt="" />
              <span className="eyebrow">
                {session.mode === "group" ? t.pass : t.ready}
              </span>
              <h1>
                {session.mode === "group"
                  ? session.players[session.currentPlayer]?.name
                  : t.brand + "."}
              </h1>
              <p>
                {session.mode === "group"
                  ? session.groupOptions?.reveal === "round"
                    ? locale === "fr"
                      ? "Les choix restent cachés jusqu’au dernier joueur. Passe l’appareil sans dévoiler ta réponse."
                      : "Choices stay hidden until the last player answers. Pass the device without revealing your answer."
                    : t.private
                  : t.readyCopy}
              </p>
              <button className="primary" onClick={() => setScreen("question")}>
                {t.reveal}
                <span>→</span>
              </button>
              <button className="text-button" onClick={() => setScreen("home")}>
                {t.quit}
              </button>
            </section>
          )}
          {screen === "question" && session && current && (
            <QuestionScreen
              key={`${current.id}-${session.currentPlayer}`}
              question={current}
              locale={locale}
              index={session.questionIds.length}
              length={session.length}
              reversed={(session.seed + session.questionIds.length) % 2 === 0}
              name={
                session.mode === "group"
                  ? session.players[session.currentPlayer]!.name
                  : ""
              }
              timeLimit={
                session.mode === "group"
                  ? (session.groupOptions?.timer ?? 0)
                  : 0
              }
              onAnswer={answer}
              onPause={() => setScreen("home")}
            />
          )}
          {(screen === "round-reveal" || screen === "recap") && session && (
            <GroupReveal
              key={`${screen}-${session.pendingReveal ?? "all"}`}
              session={session}
              locale={locale}
              recap={screen === "recap"}
              onContinue={() => {
                const updated = acknowledgeReveal(session);
                setSession(updated);
                setScreen(isComplete(updated) ? "analysis" : "handoff");
              }}
            />
          )}
          {screen === "analysis" && (
            <section className="analysis" role="status">
              <div className="analysis-symbol">
                <AnimatedLogo compact />
              </div>
              <h1>{t.analysis}</h1>
              <p>{t.analysisCopy}</p>
              <div className="loading-line" />
            </section>
          )}
          {screen === "result" && shared && (
            <>
              <p className="notice">{t.shared}</p>
              <ProfileView
                key={`shared-${JSON.stringify(shared.profile.vector)}`}
                portrait={{
                  profile: shared.profile,
                  name: "",
                  length: shared.length,
                }}
                locale={locale}
              >
                <ShareActions
                  portrait={{
                    profile: shared.profile,
                    name: "",
                    length: shared.length,
                  }}
                  locale={locale}
                  onReplay={replay}
                />
              </ProfileView>
            </>
          )}
          {screen === "result" &&
            !shared &&
            session &&
            (session.mode === "group" && !selectedPlayer ? (
              <>
                <button
                  className="text-button recap-return"
                  onClick={() => setScreen("recap")}
                >
                  {locale === "fr"
                    ? "↗ Revoir toutes nos réponses"
                    : "↗ Review all our answers"}
                </button>
                <GroupResults
                  session={session}
                  locale={locale}
                  onPlayer={(id) => {
                    setSelectedPlayer(id);
                    window.scrollTo({ top: 0 });
                  }}
                  onReplay={replay}
                />
              </>
            ) : (
              <>
                {session.mode === "group" && (
                  <button
                    className="text-button group-back"
                    onClick={() => setSelectedPlayer(null)}
                  >
                    ← {t.groupBack}
                  </button>
                )}
                <ProfileView
                  key={`${session.seed}-${selectedPlayer ?? "solo"}`}
                  portrait={{
                    profile: scoreAnswers(
                      questions,
                      (
                        session.players.find((p) => p.id === selectedPlayer) ??
                        session.players[0]!
                      ).answers,
                    ),
                    name:
                      session.mode === "solo"
                        ? ""
                        : (
                            session.players.find(
                              (p) => p.id === selectedPlayer,
                            ) ?? session.players[0]!
                          ).name,
                    length: session.length,
                  }}
                  locale={locale}
                >
                  <ShareActions
                    portrait={{
                      profile: scoreAnswers(
                        questions,
                        (
                          session.players.find(
                            (p) => p.id === selectedPlayer,
                          ) ?? session.players[0]!
                        ).answers,
                      ),
                      name: "",
                      length: session.length,
                    }}
                    locale={locale}
                    onReplay={replay}
                  />
                </ProfileView>
              </>
            ))}
        </main>
        <footer>
          <span>
            {t.brand}. <span className="muted">FR / EN</span>
          </span>
          <nav>
            <button
              className="text-button"
              onClick={() => {
                leaveShare();
                setScreen("admin");
              }}
            >
              Admin
            </button>
          </nav>
          <span>{t.tagline}</span>
        </footer>
      </div>
    </AuroraBackground>
  );
}
