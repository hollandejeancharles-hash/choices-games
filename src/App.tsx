import { GameSetup, type GameConfig } from "./components/GameSetup";
import { recoveryLanding } from "./services/recovery";
import { PasswordRecovery } from "./components/PasswordRecovery";
import { GroupReveal } from "./components/GroupReveal";

import { ProposeDilemma, AdminDilemmas } from "./components/Community";
import { Gallery } from "./components/Gallery";
import { AnimatedLogo } from "./components/ui/animated-logo";
import { GlowButton } from "./components/ui/glow";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
const OnlineRoom = lazy(() =>
  import("./components/OnlineRoom").then((m) => ({ default: m.OnlineRoom })),
);

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
  | "recovery"
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
    recoveryLanding
      ? "recovery"
      : location.hash.startsWith("#room=")
        ? "online"
        : shared
          ? "result"
          : "home",
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(loadSession);
  const [storageError, setStorageError] = useState(false);
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
  const onlineAttempt = useRef<{ key: string; token: string } | null>(null);
  async function start(config: GameConfig) {
    setSelectedPlayer(null);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    const names =
      config.mode === "solo"
        ? [t.player + " 1"]
        : config.names.slice(0, config.count).map((n) => n.trim());
    if (config.mode === "group" && config.screens === "phones") {
      const { roomRequest, storeRoom } = await import("./services/rooms");
      const key = JSON.stringify(config);
      if (onlineAttempt.current?.key !== key)
        onlineAttempt.current = { key, token: crypto.randomUUID() };
      const credential = { code: "", token: onlineAttempt.current.token };
      const settings = {
        pack: config.pack,
        length: config.length,
        timer: config.timer,
        reveal: config.reveal,
        expectedPlayers: config.count,
        context: config.context,
      };
      const room = await roomRequest("create", credential, {
        name: names[0],
        settings,
        deck: createSession(["host"], config.length, seed, config.pack).deck,
      });
      storeRoom({ code: room.code, token: credential.token });
      onlineAttempt.current = null;
      setScreen("online");
      return;
    }
    setSession(
      createSession(
        names,
        config.length,
        seed,
        config.pack,
        config.mode === "group"
          ? { reveal: config.reveal, timer: config.timer }
          : undefined,
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
                {session && (
                  <button
                    className="resume"
                    onClick={() =>
                      setScreen(
                        session.mode === "group" && isComplete(session)
                          ? "recap"
                          : sessionScreen(session),
                      )
                    }
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
              <OnlineRoom locale={locale} onBack={() => setScreen("home")} />
            </Suspense>
          )}
          {screen === "propose" && (
            <ProposeDilemma locale={locale} onBack={() => setScreen("home")} />
          )}
          {screen === "recovery" && (
            <PasswordRecovery
              locale={locale}
              onLogin={() => setScreen("admin")}
            />
          )}
          {screen === "admin" && (
            <AdminDilemmas
              locale={locale}
              onBack={() => setScreen("home")}
              onRecovery={() => setScreen("recovery")}
            />
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
            <GameSetup
              locale={locale}
              onBack={() => setScreen("home")}
              onStart={start}
            />
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
                setScreen(
                  updated.pendingRecap
                    ? "recap"
                    : isComplete(updated)
                      ? "analysis"
                      : "handoff",
                );
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
