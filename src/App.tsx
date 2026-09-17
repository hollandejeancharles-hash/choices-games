import { useEffect, useState } from "react";
import type { GameLength } from "./core/types";
import { copy } from "./i18n";
import { questions } from "./data/questions";
import {
  createSession,
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
type Screen = "home" | "setup" | "handoff" | "question" | "analysis" | "result";
export default function App() {
  const [shared, setShared] = useState(() => resultFromHash(location.hash));
  const [invalidLink, setInvalidLink] = useState(
    () => location.hash.startsWith("#r=") && !resultFromHash(location.hash),
  );
  const [locale, setLocale] = useState(() => shared?.locale ?? initialLocale());
  const [dark, setDark] = useState(
    () => readPreference("dilemma.theme") === "dark",
  );
  const [screen, setScreen] = useState<Screen>(shared ? "result" : "home");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(loadSession);
  const [storageError, setStorageError] = useState(false);
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
      ),
    );
    setScreen("handoff");
  }
  function answer(option: 0 | 1, duration: number) {
    if (!session) return;
    const updated = recordAnswer(session, option, duration);
    setSession(updated);
    setScreen(
      isComplete(updated)
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
            <img src="./dilemme-logo.png" alt="" />
            <span>
              {t.brand}
              <span className="brand-period">.</span>
            </span>
          </button>
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
                <button className="primary" onClick={() => setScreen("setup")}>
                  {t.start}
                  <span>↗</span>
                </button>
                {session && (
                  <button
                    className="resume"
                    onClick={() =>
                      setScreen(isComplete(session) ? "result" : "handoff")
                    }
                  >
                    {t.resume} <span>→</span>
                  </button>
                )}
                <div className="hero-facts">
                  <span>{t.feature1}</span>
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
                  <img src="./dilemme-logo.png" alt="" />
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
                <span className="art-caption">
                  01 — 60 <span>↗</span>
                </span>
              </div>
              <p className="content-note">{t.note}</p>
            </section>
          )}
          {screen === "setup" && (
            <section className="setup page-in">
              <button className="text-button" onClick={() => setScreen("home")}>
                ← {t.back}
              </button>
              <span className="eyebrow">01 / {t.brand}</span>
              <h1>{t.setupTitle}</h1>
              <p className="lead">{t.setupIntro}</p>
              <div className="mode-grid">
                {(["solo", "group"] as const).map((m) => (
                  <button
                    key={m}
                    className={`mode-card ${mode === m ? "active" : ""}`}
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    <span>{m === "solo" ? "◉" : "◉ ◉"}</span>
                    <strong>{t[m]}</strong>
                    <small>{t[m === "solo" ? "soloDesc" : "groupDesc"]}</small>
                  </button>
                ))}
              </div>
              <fieldset>
                <legend>{t.duration}</legend>
                <div className="length-grid">
                  {([10, 15, 25] as const).map((n, i) => (
                    <button
                      key={n}
                      className={`length-card ${length === n ? "active" : ""}`}
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
                <div className="group-setup">
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
              <p className="content-note">{t.note}</p>
              <button className="primary" onClick={start}>
                {t.launch}
                <span>→</span>
              </button>
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
              <p>{session.mode === "group" ? t.private : t.readyCopy}</p>
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
              onAnswer={answer}
              onPause={() => setScreen("home")}
            />
          )}
          {screen === "analysis" && (
            <section className="analysis" role="status">
              <div className="analysis-symbol">
                <img src="./dilemme-logo.png" alt="" />
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
              <GroupResults
                session={session}
                locale={locale}
                onPlayer={(id) => {
                  setSelectedPlayer(id);
                  window.scrollTo({ top: 0 });
                }}
                onReplay={replay}
              />
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
          <span>{t.tagline}</span>
        </footer>
      </div>
    </AuroraBackground>
  );
}
