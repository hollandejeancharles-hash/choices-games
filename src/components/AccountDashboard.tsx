import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { AXES, type Locale } from "../core/types";
import { archetypes, axisCopy } from "../data/archetypes";
import {
  listCloudResults,
  strongestEvolution,
  type CloudResult,
} from "../services/player-cloud";
import {
  clearPlayerHistory,
  deletePlayerAccount,
  deleteResult,
  dailyState,
  exportPlayerData,
  listDuos,
  isDilemmaAdmin,
  listMyDilemmaProposals,
  isProfileAvatarId,
  profilePhotoUrl,
  selectProfileAvatar,
  uploadProfilePhoto,
  updateEmail,
  updateMyDilemmaProposal,
  updateNickname,
  type ProfileAvatarId,
  type Circle,
  type MyDuo,
  type MyDilemmaProposal,
} from "../services/player-features";
import {
  dailyQuestion,
  evolutionDirection,
  portraitIdentity,
} from "../services/account-view";
import { playerAuth } from "../services/supabase";
import { readPreference, savePreference } from "../services/session";
import { AccountIcon, type AccountIconName } from "./ui/AccountIcon";
import { AnimatedLogo } from "./ui/animated-logo";
import { BellRingIcon } from "./ui/BellRingIcon";
import { DailyDilemma } from "./DailyDilemma";
import { AsyncDuel } from "./AsyncDuel";
import { SocialSpace } from "./SocialSpace";
import { invitationToken } from "../services/social";
import { duoCodeFromLocation } from "../services/duel-links";
import { PushPreference } from "./PushPreference";

export interface AccountNavigationProps {
  locale: Locale;
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
  onLocaleChange: (locale: Locale) => void;
  onBack: () => void;
  onPropose?: () => void;
  onAdmin?: () => void;
  onPlay: () => void;
  onResume?: (() => void) | undefined;
  circles: Circle[];
  onCirclesChanged: (circles: Circle[]) => void;
}
type Page =
  | "home"
  | "portraits"
  | "proposals"
  | "detail"
  | "account"
  | "preferences"
  | "privacy"
  | "daily"
  | "duel"
  | "circles";
type Confirmation =
  | { kind: "portrait"; result: CloudResult }
  | { kind: "history" | "account" | "signout" };

export function AccountDashboard({
  user,
  locale,
  dark,
  onThemeChange,
  onLocaleChange,
  onBack,
  onPropose,
  onAdmin,
  onPlay,
  onResume,
  circles,
  onCirclesChanged,
}: AccountNavigationProps & { user: User }) {
  const fr = locale === "fr";
  const text = (a: string, b: string) => (fr ? a : b);
  const [page, setPage] = useState<Page>(() =>
    duoCodeFromLocation()
      ? "duel"
      : invitationToken()
        ? "circles"
        : new URLSearchParams(location.search).get("section") === "proposals"
          ? "proposals"
          : new URLSearchParams(location.search).get("activity") === "daily"
            ? "daily"
            : "home",
  );
  const [results, setResults] = useState<CloudResult[]>([]);
  const [historyBusy, setHistoryBusy] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [duoInvitations, setDuoInvitations] = useState<MyDuo[]>([]);
  const [dailyPending, setDailyPending] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [proposals, setProposals] = useState<MyDilemmaProposal[]>([]);
  const [proposalsBusy, setProposalsBusy] = useState(true);
  const [proposalsError, setProposalsError] = useState(false);
  const [proposalsVersion, setProposalsVersion] = useState(0);
  const [editingProposal, setEditingProposal] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [duoToOpen, setDuoToOpen] = useState<string | undefined>(
    duoCodeFromLocation() ?? undefined,
  );
  const [selected, setSelected] = useState<CloudResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [dialogError, setDialogError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const initialPage = useRef(true);
  const [motion, setMotion] = useState(
    () => readPreference("dilemma.account.motion") !== "off",
  );
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const name =
    typeof user.user_metadata.display_name === "string" &&
    user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name
      : text("Joueur", "Player");
  const [nickname, setNickname] = useState(name);
  const [email, setEmail] = useState(user.email ?? "");
  const selectedAvatar = isProfileAvatarId(user.user_metadata.avatar_id)
    ? user.user_metadata.avatar_id
    : null;
  const uploadedPath =
    user.user_metadata.avatar_kind === "upload" &&
    typeof user.user_metadata.avatar_path === "string"
      ? user.user_metadata.avatar_path
      : null;
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );
  const [avatarOverride, setAvatarOverride] = useState<ProfileAvatarId | null>(
    selectedAvatar,
  );
  const initials = name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();
  const avatarSource = avatarOverride
    ? `./avatars/${avatarOverride}.png`
    : uploadedAvatarUrl;
  const playerAvatar = (className = "c-avatar") => (
    <span className={className} aria-hidden="true">
      {avatarSource ? <img src={avatarSource} alt="" /> : initials}
    </span>
  );
  const titles: Record<Page, string> = {
    home: text("Vue d’ensemble", "Overview"),
    portraits: text("Mes portraits", "My portraits"),
    proposals: text("Mes propositions", "My suggestions"),
    detail: text("Mon portrait", "My portrait"),
    account: text("Mon compte", "My account"),
    preferences: text("Préférences", "Preferences"),
    privacy: text("Mes données", "My data"),
    daily: text("Dilemme du jour", "Daily dilemma"),
    duel: text("Duo", "Duo"),
    circles: text("Mes cercles", "My circles"),
  };
  useEffect(() => {
    let active = true;
    void isDilemmaAdmin()
      .then((allowed) => {
        if (active) setAdmin(allowed === true);
      })
      .catch(() => {
        if (active) setAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);
  useEffect(() => {
    let active = true;
    const refreshDaily = () =>
      void dailyState(day, dailyQuestion(day).id)
        .then((state) => {
          if (active) setDailyPending(state.mine === null);
        })
        .catch(() => {
          if (active) setDailyPending(false);
        });
    refreshDaily();
    window.addEventListener("focus", refreshDaily);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshDaily);
    };
  }, [user.id, day]);
  useEffect(() => {
    let active = true;
    setProposalsBusy(true);
    setProposalsError(false);
    void listMyDilemmaProposals()
      .then((items) => {
        if (active) setProposals(items);
      })
      .catch(() => {
        if (active) setProposalsError(true);
      })
      .finally(() => {
        if (active) setProposalsBusy(false);
      });
    return () => {
      active = false;
    };
  }, [user.id, proposalsVersion]);
  useEffect(() => {
    setNickname(name);
  }, [name]);
  useEffect(() => {
    setEmail(user.email ?? "");
  }, [user.email]);
  useEffect(() => {
    setAvatarOverride(selectedAvatar);
    if (!uploadedPath) {
      setUploadedAvatarUrl(null);
      return;
    }
    let active = true;
    void profilePhotoUrl(uploadedPath)
      .then((url) => {
        if (active) setUploadedAvatarUrl(url);
      })
      .catch(() => {
        if (active) setUploadedAvatarUrl(null);
      });
    return () => {
      active = false;
    };
  }, [selectedAvatar, uploadedPath]);
  useEffect(() => {
    let current = true;
    setHistoryBusy(true);
    setHistoryError(false);
    void listCloudResults()
      .then((items) => {
        if (current) setResults(items);
      })
      .catch(() => {
        if (current) setHistoryError(true);
      })
      .finally(() => {
        if (current) setHistoryBusy(false);
      });
    return () => {
      current = false;
    };
  }, [user.id, historyVersion]);
  useEffect(() => {
    let active = true;
    const refreshInvitations = () =>
      void listDuos()
        .then((items) => {
          if (active)
            setDuoInvitations(
              items.filter((item) => item.invited && !item.expired),
            );
        })
        .catch(() => {
          if (active) setDuoInvitations([]);
        });
    refreshInvitations();
    const timer = window.setInterval(refreshInvitations, 5_000);
    window.addEventListener("focus", refreshInvitations);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refreshInvitations);
    };
  }, [user.id]);
  function openDuo(code?: string) {
    setDuoToOpen(code);
    setNotificationsOpen(false);
    navigate("duel");
  }
  useEffect(() => {
    const refresh = () => setDay(new Date().toISOString().slice(0, 10));
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    if (initialPage.current) {
      initialPage.current = false;
      return;
    }
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  useEffect(() => {
    const node = dialog.current;
    if (!confirmation || !node) return;
    setConfirmationText("");
    setDialogError("");
    node.showModal();
    return () => {
      node.close();
    };
  }, [confirmation]);
  function navigate(next: Page) {
    setPage(next);
    setMessage("");
    setError("");
  }
  async function perform(
    action: () => Promise<void>,
    success: string,
    inDialog = false,
  ) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setDialogError("");
    try {
      await action();
      setMessage(success);
      if (inDialog) setConfirmation(null);
    } catch {
      const failure = text(
        "L’action n’a pas pu aboutir. Vérifie ta connexion et réessaie.",
        "Could not complete this action. Check your connection and try again.",
      );
      if (inDialog) setDialogError(failure);
      else setError(failure);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!confirmation) return;
    const target = confirmation;
    if (
      target.kind === "account" &&
      confirmationText !== text("SUPPRIMER", "DELETE")
    )
      return;
    void perform(
      async () => {
        if (target.kind === "portrait") {
          await deleteResult(target.result.id);
          setResults((items) =>
            items.filter((item) => item.id !== target.result.id),
          );
          if (selected?.id === target.result.id) {
            setSelected(null);
            setPage("portraits");
          }
        } else if (target.kind === "history") {
          await clearPlayerHistory();
          setResults([]);
          setSelected(null);
        } else if (target.kind === "account") {
          await deletePlayerAccount();
        } else {
          const { error: authError } = await playerAuth.auth.signOut();
          if (authError) throw authError;
        }
      },
      target.kind === "portrait"
        ? text("Portrait supprimé.", "Portrait deleted.")
        : text("Action effectuée.", "Action completed."),
      true,
    );
  }
  function date(value: string) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
      new Date(value),
    );
  }
  const evolution =
    results.length >= 2
      ? strongestEvolution(results[0]!.vector, results[1]!.vector)
      : null;
  const question = dailyQuestion(day);
  const notificationCount = duoInvitations.length + (dailyPending ? 1 : 0);
  function navButton(target: Page, icon?: AccountIconName) {
    return (
      <button
        key={target}
        onClick={() => navigate(target)}
        aria-current={
          page === target || (page === "detail" && target === "portraits")
            ? "page"
            : undefined
        }
      >
        {icon ? (
          <AccountIcon name={icon} />
        ) : (
          <span className="c-icon" aria-hidden="true">
            ◎
          </span>
        )}
        {titles[target]}
      </button>
    );
  }
  function history(recent = false) {
    if (historyBusy)
      return (
        <div className="c-history-loading" role="status">
          {text("Chargement de tes portraits…", "Loading your portraits…")}
        </div>
      );
    if (historyError)
      return (
        <div className="c-empty" role="alert">
          <h2>
            {text(
              "Tes portraits sont momentanément indisponibles.",
              "Your portraits are temporarily unavailable.",
            )}
          </h2>
          <button
            className="c-button"
            onClick={() => setHistoryVersion((value) => value + 1)}
          >
            {text("Réessayer", "Try again")}
          </button>
        </div>
      );
    if (!results.length)
      return (
        <div className="c-empty">
          <AccountIcon name="fingerprint" size={30} />
          <h2>
            {text("Ton histoire commence ici.", "Your story starts here.")}
          </h2>
          <p>
            {text(
              "Termine une partie solo pour découvrir ton premier portrait.",
              "Finish a solo game to discover your first portrait.",
            )}
          </p>
          <button className="c-button c-primary" onClick={onPlay}>
            {text("Jouer ma première partie", "Play my first game")} ↗
          </button>
        </div>
      );
    return (
      <div className="c-gallery">
        {(recent ? results.slice(0, 3) : results).map((result, index) => {
          const portrait = portraitIdentity(result, locale);
          return (
            <article className="c-portrait" key={result.id}>
              <button
                className="c-portraitview"
                onClick={() => {
                  setSelected(result);
                  navigate("detail");
                }}
                aria-label={`${text("Ouvrir le portrait", "Open portrait")} ${portrait.name}`}
              >
                <div className="c-portraitart">
                  {index === 0 && (
                    <span className="c-portraitbadge">
                      {text("LE PLUS RÉCENT", "MOST RECENT")}
                    </span>
                  )}
                  <img src={portrait.image} alt="" loading="lazy" />
                </div>
                <div className="c-portraitbody">
                  <span className="c-portraittitle">
                    {portrait.name}
                    <span aria-hidden="true">↗</span>
                  </span>
                  <span className="c-portraitmeta">
                    {date(result.completedAt)} · {result.length}{" "}
                    {text("choix", "choices")}
                  </span>
                </div>
              </button>
              {!recent && (
                <div className="c-portraitactions">
                  <button
                    className="c-quiet"
                    disabled={busy}
                    onClick={() =>
                      setConfirmation({ kind: "portrait", result })
                    }
                    aria-label={`${text("Supprimer le portrait", "Delete portrait")} ${portrait.name} · ${date(result.completedAt)}`}
                  >
                    {text("Supprimer", "Delete")}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  }
  const currentPortrait = selected ? portraitIdentity(selected, locale) : null;
  return (
    <div id="player-space" data-motion={motion ? "on" : "off"}>
      <div className="c-shell">
        <aside
          className="c-sidebar"
          aria-label={text(
            "Navigation de l’espace joueur",
            "Player space navigation",
          )}
        >
          <button
            className="c-logo"
            onClick={onBack}
            aria-label={text("Dilemme · accueil", "Dilemme · home")}
          >
            <AnimatedLogo />
            <span>
              Dilemme<em>.</em>
            </span>
          </button>
          <div>
            <p className="c-navcaption c-eyebrow">
              {text("Mon espace", "My space")}
            </p>
            <nav className="c-nav" aria-label={text("Mon espace", "My space")}>
              {navButton("home", "dashboard")}
              {navButton("portraits", "fingerprint")}
              {navButton("proposals", "lightbulb")}
            </nav>
          </div>
          <div>
            <p className="c-navcaption c-eyebrow">
              {text("À toi de jouer", "Time to play")}
            </p>
            <nav className="c-nav" aria-label={text("Activités", "Activities")}>
              {navButton("daily", "ticket")}
              {navButton("duel", "swords")}
              {navButton("circles", "users")}
            </nav>
          </div>
          <div className="c-sidebarbottom">
            <nav className="c-nav" aria-label={text("Réglages", "Settings")}>
              {navButton("account", "account")}
              {navButton("preferences", "sliders")}
              {admin && onAdmin && (
                <button onClick={onAdmin}>
                  <span className="c-icon" aria-hidden="true">
                    ◇
                  </span>
                  {text("Administration", "Administration")}
                </button>
              )}
            </nav>
            <button className="c-user" onClick={() => navigate("account")}>
              {playerAvatar()}
              <span>
                <strong>{name}</strong>
                <span className="c-small c-muted">
                  {text("Espace personnel", "Personal space")}
                </span>
              </span>
              <span aria-hidden="true">⌃</span>
            </button>
          </div>
        </aside>
        <div className="c-workspace">
          <div className="c-topbar">
            <div className="c-breadcrumb">
              <span>{text("Espace joueur", "Player space")}</span>
              <span aria-hidden="true">/</span>
              <b>{titles[page]}</b>
            </div>
            <button className="c-logo c-mobilebrand" onClick={onBack}>
              <span>
                Dilemme<em>.</em>
              </span>
            </button>
            <div className="c-topactions">
              <button className="c-quiet c-return" onClick={onBack}>
                {text("Retour au jeu", "Back to game")} ↗
              </button>
              <button
                className="c-quiet c-theme-toggle"
                aria-label={text("Changer le thème", "Switch theme")}
                onClick={() => onThemeChange(!dark)}
              >
                {dark ? "☼" : "◐"}
              </button>
              <div className="c-notifications">
                <button
                  className="c-notification-button"
                  aria-label={text("Notifications", "Notifications")}
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen((open) => !open)}
                >
                  <BellRingIcon />
                  {notificationCount > 0 && (
                    <b aria-label={`${notificationCount}`}>
                      {notificationCount}
                    </b>
                  )}
                </button>
                {notificationsOpen && (
                  <section
                    className="c-notification-panel"
                    aria-label={text(
                      "Notifications reçues",
                      "Received notifications",
                    )}
                  >
                    <strong>{text("Notifications", "Notifications")}</strong>
                    {!dailyPending && duoInvitations.length === 0 ? (
                      <p>
                        {text(
                          "Aucune nouvelle invitation.",
                          "No new invitation.",
                        )}
                      </p>
                    ) : (
                      <>
                        {dailyPending && (
                          <button
                            className="c-daily-notification"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate("daily");
                            }}
                          >
                            <span>
                              {text(
                                "Dilemme du jour en attente",
                                "Today's dilemma is waiting",
                              )}
                            </span>
                            <small>
                              {text(
                                "Tu n’as pas encore fait ton choix aujourd’hui.",
                                "You have not made today's choice yet.",
                              )}
                            </small>
                          </button>
                        )}
                        {duoInvitations.map((invitation) => (
                          <button
                            key={invitation.code}
                            onClick={() => openDuo(invitation.code)}
                          >
                            <span>
                              {text(
                                "Invitation Duo reçue",
                                "Duo invitation received",
                              )}
                            </span>
                            <small>Duo · {invitation.code}</small>
                          </button>
                        ))}
                      </>
                    )}
                  </section>
                )}
              </div>
              <button
                className="c-avatar c-avatar-button"
                onClick={() => navigate("account")}
                aria-label={titles.account}
              >
                {avatarSource ? <img src={avatarSource} alt="" /> : initials}
              </button>
            </div>
          </div>
          <div
            className="c-main"
            ref={heading}
            tabIndex={-1}
            aria-label={titles[page]}
          >
            {page === "home" && (
              <section className="c-home">
                <div className="c-pagehead">
                  <div>
                    <div className="c-eyebrow">
                      {text("Heureux de te retrouver", "Good to see you again")}
                    </div>
                    <h1>
                      {text("Bonjour", "Hello")}, {name}
                      <em>.</em>
                    </h1>
                    <p>
                      {text(
                        "Chaque choix révèle une nouvelle facette de toi.",
                        "Every choice reveals another side of you.",
                      )}
                    </p>
                  </div>
                  <span className="c-date">
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    }).format(new Date(day))}
                  </span>
                </div>
                {duoInvitations.length > 0 && (
                  <button
                    className="c-notice c-duo-invite"
                    onClick={() => openDuo(duoInvitations[0]?.code)}
                  >
                    <strong>
                      {text(
                        `${duoInvitations.length} invitation${duoInvitations.length > 1 ? "s" : ""} Duo reçue${duoInvitations.length > 1 ? "s" : ""}`,
                        `${duoInvitations.length} Duo invitation${duoInvitations.length > 1 ? "s" : ""} waiting`,
                      )}
                    </strong>
                    <span>{text("Répondre maintenant →", "Answer now →")}</span>
                  </button>
                )}
                <div className="c-herogrid">
                  <article className="c-hero">
                    <span className="c-eyebrow">
                      {text("Le prochain chapitre", "The next chapter")}
                    </span>
                    <h2>
                      {text("Tes choix.", "Your choices.")}
                      <br />
                      <em>{text("Ton histoire.", "Your story.")}</em>
                    </h2>
                    <p>
                      {text(
                        "Tu n’es jamais tout à fait la même personne. Et aujourd’hui ?",
                        "You are never quite the same person. What about today?",
                      )}
                    </p>
                    <button
                      className="c-button c-primary"
                      onClick={onResume ?? onPlay}
                    >
                      {onResume
                        ? text("Reprendre ma partie", "Resume my game")
                        : text("Lancer une partie", "Start a game")}{" "}
                      ↗
                    </button>
                    {onResume && (
                      <button
                        className="c-textlink c-new-game"
                        onClick={onPlay}
                      >
                        {text("Nouvelle partie", "New game")} →
                      </button>
                    )}
                    <div className="c-heroart" aria-hidden="true">
                      <span className="c-asterisk">✳</span>
                      <img src="./avatars/scout.png" alt="" />
                    </div>
                  </article>
                  <article className="c-daily">
                    <div className="c-dailyhead">
                      <AccountIcon name="ticket" size={30} />
                      <span className="c-daily-label">{titles.daily}</span>
                      <span className="c-pill">
                        {text("1 jour · 1 choix", "1 day · 1 choice")}
                      </span>
                    </div>
                    <h2>{question.prompt[locale]}</h2>
                    <p>
                      {text(
                        "Le dilemme du jour t’attend.",
                        "Your daily dilemma is waiting.",
                      )}
                    </p>
                    <button
                      className="c-textlink"
                      onClick={() => navigate("daily")}
                    >
                      {text("Faire mon choix", "Make my choice")}{" "}
                      <span aria-hidden="true">↗</span>
                    </button>
                  </article>
                </div>
                <div className="c-socialrow">
                  <button className="c-social" onClick={() => navigate("duel")}>
                    <span className="c-icondisc">
                      <AccountIcon name="swords" />
                    </span>
                    <span>
                      <strong>{text("Face à face.", "Face to face.")}</strong>
                      <small>
                        {text(
                          "Cinq dilemmes. Deux points de vue.",
                          "Five dilemmas. Two perspectives.",
                        )}
                      </small>
                    </span>
                    <span className="c-round" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                  <button className="c-social" onClick={onResume ?? onPlay}>
                    <span className="c-icondisc" aria-hidden="true">
                      <AccountIcon name="users" />
                    </span>
                    <span>
                      <strong>
                        {text("Entre vous.", "Your inner circle.")}
                      </strong>
                      <small>
                        {text(
                          onResume
                            ? "Reprends votre expérience principale."
                            : "Lancez votre expérience principale.",
                          onResume
                            ? "Resume your main experience."
                            : "Start your main experience.",
                        )}
                      </small>
                    </span>
                    <span className="c-round" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </div>
                <div className="c-sectionhead">
                  <h2>
                    {text(
                      "Les visages de tes choix",
                      "The faces of your choices",
                    )}
                  </h2>
                  <button
                    className="c-textlink"
                    onClick={() => navigate("portraits")}
                  >
                    {text("Tous mes portraits", "All my portraits")} →
                  </button>
                </div>
                {history(true)}
                <p className="c-privacyline">
                  {text(
                    "Un espace rien qu’à toi. Tes portraits restent privés.",
                    "A space of your own. Your portraits stay private.",
                  )}
                </p>
              </section>
            )}
            {page === "portraits" && (
              <section>
                <div className="c-pagehead">
                  <div>
                    <div className="c-eyebrow">
                      {text(
                        "Ta chronologie personnelle",
                        "Your personal timeline",
                      )}
                    </div>
                    <h1>{titles.portraits}.</h1>
                    <p>
                      {text(
                        "Des instantanés de toi. Jamais des étiquettes.",
                        "Snapshots of you. Never labels.",
                      )}
                    </p>
                  </div>
                  {!historyBusy && !historyError && (
                    <span className="c-tag">
                      {results.length} / 20 portraits
                    </span>
                  )}
                </div>
                {!historyBusy &&
                  !historyError &&
                  evolution &&
                  evolution.delta !== 0 && (
                    <div className="c-evolution">
                      <div>
                        <div className="c-eyebrow">
                          {text(
                            "Entre tes deux dernières parties",
                            "Between your last two games",
                          )}
                        </div>
                        <h2>
                          {text("Vers plus de", "Towards more")}{" "}
                          {evolutionDirection(
                            evolution,
                            locale,
                          ).toLocaleLowerCase(locale)}
                          .
                        </h2>
                        <p>
                          {text(
                            "Tes réponses ont évolué sur cet axe.",
                            "Your answers have shifted along this axis.",
                          )}
                        </p>
                      </div>
                      <div className="c-evolutionnum">
                        {Math.round(Math.abs(evolution.delta))}
                        <small>
                          {text("points d’écart", "points of change")}
                        </small>
                      </div>
                    </div>
                  )}
                {history()}
                <p className="c-privacyline">
                  {text(
                    "Tes 20 derniers portraits, sans le détail de tes réponses.",
                    "Your last 20 portraits, without your detailed answers.",
                  )}
                </p>
              </section>
            )}
            {page === "proposals" && (
              <section className="c-proposals-page">
                <div className="c-pagehead">
                  <div>
                    <div className="c-eyebrow">
                      {text(
                        "Tes idées, leur parcours",
                        "Your ideas, their journey",
                      )}
                    </div>
                    <h1>{titles.proposals}.</h1>
                    <p>
                      {text(
                        "Suis ici chaque dilemme envoyé à la communauté.",
                        "Follow every dilemma you have sent to the community.",
                      )}
                    </p>
                  </div>
                  {!proposalsBusy && !proposalsError && (
                    <span className="c-proposal-count">
                      {proposals.length}{" "}
                      {text(
                        proposals.length > 1 ? "propositions" : "proposition",
                        proposals.length === 1 ? "suggestion" : "suggestions",
                      )}
                    </span>
                  )}
                </div>
                {proposalsBusy ? (
                  <div className="c-history-loading" role="status">
                    {text(
                      "Chargement de tes propositions…",
                      "Loading your suggestions…",
                    )}
                  </div>
                ) : proposalsError ? (
                  <div className="c-empty" role="alert">
                    <h2>
                      {text(
                        "Tes propositions sont momentanément indisponibles.",
                        "Your suggestions are temporarily unavailable.",
                      )}
                    </h2>
                    <button
                      className="c-button"
                      onClick={() => setProposalsVersion((value) => value + 1)}
                    >
                      {text("Réessayer", "Try again")}
                    </button>
                  </div>
                ) : proposals.length === 0 ? (
                  <div className="c-empty">
                    <span className="c-proposal-empty-icon" aria-hidden="true">
                      A / B
                    </span>
                    <h2>
                      {text(
                        "Aucun dilemme proposé pour le moment.",
                        "No dilemma suggested yet.",
                      )}
                    </h2>
                    <p>
                      {text(
                        "Imagine un choix impossible et soumets-le à la communauté.",
                        "Imagine an impossible choice and submit it to the community.",
                      )}
                    </p>
                    <button
                      className="c-button c-primary"
                      onClick={onPropose ?? onBack}
                    >
                      {text("Proposer un dilemme", "Suggest a dilemma")} ↗
                    </button>
                  </div>
                ) : (
                  <div className="c-proposal-list">
                    {proposals.map((proposal) => {
                      const status = {
                        pending: text("En modération", "In review"),
                        published: text("Publié", "Published"),
                        rejected: text("Non retenu", "Not selected"),
                      }[proposal.status];
                      return (
                        <article className="c-proposal-card" key={proposal.id}>
                          <div className="c-proposal-meta">
                            <span
                              className={`c-proposal-status is-${proposal.status}`}
                            >
                              {status}
                            </span>
                            <time dateTime={proposal.createdAt}>
                              {date(proposal.createdAt)}
                            </time>
                            <span>{proposal.locale.toUpperCase()}</span>
                          </div>
                          {editingProposal === proposal.id ? (
                            <form
                              className="c-proposal-edit"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const form = new FormData(event.currentTarget);
                                const prompt = String(
                                  form.get("prompt") ?? "",
                                ).trim();
                                const optionA = String(
                                  form.get("optionA") ?? "",
                                ).trim();
                                const optionB = String(
                                  form.get("optionB") ?? "",
                                ).trim();
                                if (
                                  prompt.length < 30 ||
                                  optionA.length < 10 ||
                                  optionB.length < 10 ||
                                  optionA === optionB
                                ) {
                                  setError(
                                    text(
                                      "La situation doit faire au moins 30 caractères et chaque choix au moins 10 caractères. Les deux choix doivent être différents.",
                                      "The situation must be at least 30 characters and each choice at least 10 characters. Choices must be different.",
                                    ),
                                  );
                                  return;
                                }
                                void perform(
                                  async () => {
                                    await updateMyDilemmaProposal(
                                      proposal.id,
                                      prompt,
                                      optionA,
                                      optionB,
                                    );
                                    setProposals((items) =>
                                      items.map((item) =>
                                        item.id === proposal.id
                                          ? {
                                              ...item,
                                              prompt,
                                              optionA,
                                              optionB,
                                            }
                                          : item,
                                      ),
                                    );
                                    setEditingProposal(null);
                                  },
                                  text(
                                    "Proposition mise à jour.",
                                    "Suggestion updated.",
                                  ),
                                );
                              }}
                            >
                              <label>
                                {text("Situation", "Situation")}
                                <textarea
                                  name="prompt"
                                  defaultValue={proposal.prompt}
                                  minLength={30}
                                  maxLength={1200}
                                  required
                                />
                              </label>
                              <div className="c-proposal-edit-choices">
                                <label>
                                  <span>
                                    <b>A</b>
                                    {text("Premier choix", "First choice")}
                                  </span>
                                  <textarea
                                    name="optionA"
                                    defaultValue={proposal.optionA}
                                    minLength={10}
                                    maxLength={500}
                                    required
                                  />
                                </label>
                                <label>
                                  <span>
                                    <b>B</b>
                                    {text("Second choix", "Second choice")}
                                  </span>
                                  <textarea
                                    name="optionB"
                                    defaultValue={proposal.optionB}
                                    minLength={10}
                                    maxLength={500}
                                    required
                                  />
                                </label>
                              </div>
                              <div className="c-proposal-edit-actions">
                                <button
                                  className="c-button c-primary"
                                  disabled={busy}
                                >
                                  {text("Enregistrer", "Save")}
                                </button>
                                <button
                                  type="button"
                                  className="c-quiet"
                                  disabled={busy}
                                  onClick={() => setEditingProposal(null)}
                                >
                                  {text("Annuler", "Cancel")}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <h2>{proposal.prompt}</h2>
                              <div className="c-proposal-choices">
                                <div>
                                  <b>A</b>
                                  <p>{proposal.optionA}</p>
                                </div>
                                <span aria-hidden="true">
                                  {text("ou", "or")}
                                </span>
                                <div>
                                  <b>B</b>
                                  <p>{proposal.optionB}</p>
                                </div>
                              </div>
                              <div className="c-proposal-footer">
                                <p className="c-proposal-help">
                                  {proposal.status === "pending"
                                    ? text(
                                        "L’équipe la relit avant sa publication dans le jeu.",
                                        "The team reviews it before it can appear in the game.",
                                      )
                                    : proposal.status === "published"
                                      ? text(
                                          "Ta proposition fait maintenant partie du jeu.",
                                          "Your suggestion is now part of the game.",
                                        )
                                      : text(
                                          "Cette proposition n’a pas été retenue pour le jeu.",
                                          "This suggestion was not selected for the game.",
                                        )}
                                </p>
                                {proposal.status === "pending" && (
                                  <button
                                    className="c-button c-proposal-edit-button"
                                    onClick={() => {
                                      setError("");
                                      setEditingProposal(proposal.id);
                                    }}
                                  >
                                    {text("Modifier", "Edit")}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
            {page === "detail" && selected && currentPortrait && (
              <section>
                <div className="c-pagehead">
                  <button
                    className="c-textlink"
                    onClick={() => navigate("portraits")}
                  >
                    ← {titles.portraits}
                  </button>
                  <span className="c-tag">
                    {text("Portrait privé", "Private portrait")}
                  </span>
                </div>
                <article className="c-panel">
                  <div className="c-detailgrid">
                    <img
                      className="c-detailart"
                      src={currentPortrait.image}
                      alt=""
                    />
                    <div className="c-detailcopy">
                      <span className="c-eyebrow">
                        {date(selected.completedAt)} · {selected.length}{" "}
                        {text("choix", "choices")}
                      </span>
                      <h1>{currentPortrait.name}</h1>
                      <p>{currentPortrait.description}</p>
                      <p className="c-small">
                        {text(
                          "Ce portrait reflète tes choix dans une partie, pas une définition de ta personnalité.",
                          "This portrait reflects the choices in one game, not a definition of your personality.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="c-bars">
                    {AXES.map((axis) => (
                      <div key={axis}>
                        <div className="c-barlabels">
                          <span>{axisCopy[axis].negative[locale]}</span>
                          <span>{axisCopy[axis].positive[locale]}</span>
                        </div>
                        <div
                          className="c-bar"
                          role="meter"
                          aria-label={`${axisCopy[axis].negative[locale]} – ${axisCopy[axis].positive[locale]}`}
                          aria-valuemin={-100}
                          aria-valuemax={100}
                          aria-valuenow={selected.vector[axis]}
                        >
                          <span
                            style={{
                              width: `${(selected.vector[axis] + 100) / 2}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            )}
            {page === "account" && (
              <section>
                <div className="c-pagehead">
                  <div>
                    <div className="c-eyebrow">
                      {text("Ton identité de joueur", "Your player identity")}
                    </div>
                    <h1>{titles.account}.</h1>
                    <p>
                      {text(
                        "Les bonnes informations. Au bon endroit.",
                        "The right information. In the right place.",
                      )}
                    </p>
                  </div>
                  <AccountIcon name="account" />
                </div>
                <div className="c-settings">
                  <div className="c-panel">
                    <div className="c-avatar-editor">
                      {playerAvatar("c-avatar c-avatar-large")}
                      <div>
                        <h2>{text("Photo de profil", "Profile picture")}</h2>
                        <p>
                          {text(
                            "Choisis un personnage Dilemme ou importe ta propre photo.",
                            "Choose a Dilemma character or upload your own photo.",
                          )}
                        </p>
                      </div>
                    </div>
                    <div
                      className="c-avatar-grid"
                      role="group"
                      aria-label={text(
                        "Avatars disponibles",
                        "Available avatars",
                      )}
                    >
                      {archetypes.map((archetype) => (
                        <button
                          key={archetype.id}
                          type="button"
                          className="c-avatar-choice"
                          aria-pressed={avatarOverride === archetype.id}
                          aria-label={archetype.name[locale]}
                          disabled={busy}
                          onClick={() =>
                            void perform(
                              async () => {
                                await selectProfileAvatar(
                                  archetype.id as ProfileAvatarId,
                                  uploadedPath,
                                );
                                setAvatarOverride(
                                  archetype.id as ProfileAvatarId,
                                );
                                setUploadedAvatarUrl(null);
                              },
                              text("Avatar mis à jour.", "Avatar updated."),
                            )
                          }
                        >
                          <img src={`./avatars/${archetype.id}.png`} alt="" />
                        </button>
                      ))}
                    </div>
                    <label className="c-photo-upload c-button">
                      {text("Importer une photo", "Upload a photo")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void perform(
                            async () => {
                              const url = await uploadProfilePhoto(
                                file,
                                user.id,
                              );
                              setAvatarOverride(null);
                              setUploadedAvatarUrl(url);
                              event.target.value = "";
                            },
                            text("Photo mise à jour.", "Photo updated."),
                          );
                        }}
                      />
                    </label>
                    <p className="c-small c-muted">
                      {text(
                        "JPEG, PNG ou WebP · 5 Mo maximum. Ta photo reste dans un espace privé.",
                        "JPEG, PNG or WebP · 5 MB maximum. Your photo stays in private storage.",
                      )}
                    </p>
                    <hr className="c-divider" />
                    <h2>
                      {text("Informations personnelles", "Personal details")}
                    </h2>
                    <p>
                      {text(
                        "Ton pseudo te représente dans tes parties.",
                        "Your nickname represents you in games.",
                      )}
                    </p>
                    <form
                      className="c-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const value = nickname.trim();
                        if (value.length < 2) {
                          setError(
                            text(
                              "Choisis un pseudo entre 2 et 30 caractères.",
                              "Use a nickname between 2 and 30 characters.",
                            ),
                          );
                          return;
                        }
                        void perform(
                          () => updateNickname(value),
                          text("Pseudo mis à jour.", "Nickname updated."),
                        );
                      }}
                    >
                      <label>
                        {text("Pseudo", "Nickname")}
                        <input
                          name="nickname"
                          value={nickname}
                          onChange={(event) => setNickname(event.target.value)}
                          minLength={2}
                          maxLength={30}
                          required
                          autoComplete="nickname"
                        />
                        <small>
                          {text(
                            "Entre 2 et 30 caractères.",
                            "Between 2 and 30 characters.",
                          )}
                        </small>
                      </label>
                      <button
                        className="c-button c-primary"
                        disabled={busy || nickname.trim() === name}
                      >
                        {text("Enregistrer mon pseudo", "Save nickname")}
                      </button>
                    </form>
                    <hr className="c-divider" />
                    <form
                      className="c-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void perform(
                          () => updateEmail(email),
                          text(
                            "Vérifie les e-mails de confirmation pour valider ton changement d’adresse.",
                            "Check the confirmation emails to verify your address change.",
                          ),
                        );
                      }}
                    >
                      <label>
                        {text("Adresse e-mail", "Email address")}
                        <input
                          name="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          autoComplete="email"
                        />
                        <small>
                          {text(
                            "Une nouvelle adresse doit être confirmée par e-mail.",
                            "A new address must be confirmed by email.",
                          )}
                        </small>
                      </label>
                      <button
                        className="c-button"
                        disabled={busy || email.trim() === user.email}
                      >
                        {text("Modifier mon adresse", "Change email")}
                      </button>
                    </form>
                  </div>
                  <aside className="c-panel c-profilecard">
                    {playerAvatar()}
                    <div>
                      <h3>{name}</h3>
                      <p>
                        {text("Ton espace personnel", "Your personal space")}
                      </p>
                    </div>
                    <hr className="c-divider" />
                    <button
                      className="c-textlink"
                      onClick={() => navigate("preferences")}
                    >
                      {titles.preferences}
                      <AccountIcon name="sliders" />
                    </button>
                    <button
                      className="c-textlink"
                      onClick={() => navigate("proposals")}
                    >
                      {titles.proposals} →
                    </button>
                    <button
                      className="c-textlink"
                      onClick={() => navigate("privacy")}
                    >
                      {titles.privacy} →
                    </button>
                    <hr className="c-divider" />
                    <button
                      className="c-quiet"
                      onClick={() => setConfirmation({ kind: "signout" })}
                      disabled={busy}
                    >
                      {text("Se déconnecter", "Sign out")}
                    </button>
                  </aside>
                </div>
              </section>
            )}
            {page === "preferences" && (
              <section>
                <div className="c-pagehead">
                  <div>
                    <div className="c-eyebrow">
                      {text("Comme tu l’aimes", "Just the way you like it")}
                    </div>
                    <h1>{titles.preferences}.</h1>
                    <p>
                      {text(
                        "Un espace agréable, à ta façon.",
                        "Make yourself at home.",
                      )}
                    </p>
                  </div>
                  <AccountIcon name="sliders" />
                </div>
                <div className="c-panel">
                  <div className="c-settingrow">
                    <div>
                      <h3>{text("Apparence", "Appearance")}</h3>
                      <p>
                        {text(
                          "Choisis le thème qui te convient.",
                          "Choose the theme that suits you.",
                        )}
                      </p>
                    </div>
                    <label>
                      {text("Thème", "Theme")}
                      <select
                        value={dark ? "dark" : "light"}
                        onChange={(event) =>
                          onThemeChange(event.target.value === "dark")
                        }
                      >
                        <option value="light">{text("Clair", "Light")}</option>
                        <option value="dark">{text("Sombre", "Dark")}</option>
                      </select>
                    </label>
                  </div>
                  <div className="c-settingrow">
                    <div>
                      <h3>{text("Langue", "Language")}</h3>
                      <p>
                        {text(
                          "Pour ton espace et tes parties.",
                          "For your space and your games.",
                        )}
                      </p>
                    </div>
                    <label>
                      {text("Langue de l’interface", "Interface language")}
                      <select
                        value={locale}
                        onChange={(event) =>
                          onLocaleChange(event.target.value as Locale)
                        }
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                  </div>
                  <div className="c-settingrow">
                    <div>
                      <h3>
                        {text("Animations des icônes", "Icon animations")}
                      </h3>
                      <p>
                        {text(
                          "Au survol et au clavier. Les préférences de ton appareil restent prioritaires.",
                          "On hover and keyboard focus. Your device’s reduced-motion preference always takes priority.",
                        )}
                      </p>
                    </div>
                    <label>
                      {text("Animations", "Animations")}
                      <select
                        value={motion ? "on" : "off"}
                        onChange={(event) => {
                          setMotion(event.target.value === "on");
                          if (
                            !savePreference(
                              "dilemma.account.motion",
                              event.target.value,
                            )
                          )
                            setError(
                              text(
                                "Cette préférence ne peut pas être mémorisée sur cet appareil.",
                                "This preference cannot be saved on this device.",
                              ),
                            );
                        }}
                      >
                        <option value="on">
                          {text("Activées", "Enabled")}
                        </option>
                        <option value="off">
                          {text("Désactivées", "Disabled")}
                        </option>
                      </select>
                    </label>
                  </div>
                  <PushPreference locale={locale} />
                </div>
              </section>
            )}
            {page === "privacy" && (
              <section>
                <div className="c-pagehead">
                  <div>
                    <div className="c-eyebrow">
                      {text("Tu gardes la main", "You are in control")}
                    </div>
                    <h1>{titles.privacy}.</h1>
                    <p>
                      {text(
                        "Ta vie privée fait partie du jeu.",
                        "Your privacy is part of the game.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="c-panel">
                  <div className="c-settingrow">
                    <div>
                      <h3>
                        {text("Récupérer mes données", "Download my data")}
                      </h3>
                      <p>
                        {text(
                          "Une copie de ton profil, de ta sauvegarde et de tes portraits.",
                          "A copy of your profile, saved game and portraits.",
                        )}
                      </p>
                    </div>
                    <button
                      className="c-button"
                      disabled={busy || historyBusy || historyError}
                      onClick={() =>
                        void perform(
                          async () => {
                            const current = await listCloudResults();
                            const data = await exportPlayerData(current);
                            const url = URL.createObjectURL(
                              new Blob([JSON.stringify(data, null, 2)], {
                                type: "application/json",
                              }),
                            );
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = "dilemme-mes-donnees.json";
                            link.click();
                            window.setTimeout(
                              () => URL.revokeObjectURL(url),
                              1000,
                            );
                          },
                          text("Export téléchargé.", "Export downloaded."),
                        )
                      }
                    >
                      {text("Exporter", "Export")}
                    </button>
                  </div>
                  <div className="c-settingrow">
                    <div>
                      <h3>
                        {text("Effacer mon historique", "Clear my history")}
                      </h3>
                      <p>
                        {text(
                          "Supprime tes portraits. Ton compte reste disponible.",
                          "Delete your portraits. Keep your account.",
                        )}
                      </p>
                    </div>
                    <button
                      className="c-button"
                      disabled={
                        busy || historyBusy || historyError || !results.length
                      }
                      onClick={() => setConfirmation({ kind: "history" })}
                    >
                      {text("Effacer l’historique", "Clear history")}
                    </button>
                  </div>
                  <div className="c-settingrow">
                    <div>
                      <h3>
                        {text("Supprimer mon compte", "Delete my account")}
                      </h3>
                      <p>
                        {text(
                          "Une suppression définitive de ton compte et de ses données.",
                          "Permanently delete your account and its data.",
                        )}
                      </p>
                    </div>
                    <button
                      className="c-button c-danger"
                      disabled={busy}
                      onClick={() => setConfirmation({ kind: "account" })}
                    >
                      {text("Supprimer le compte", "Delete account")}
                    </button>
                  </div>
                </div>
              </section>
            )}
            <div className="c-activity-page">
              {page === "daily" && (
                <DailyDilemma
                  key={day}
                  locale={locale}
                  onBack={() => navigate("home")}
                  onAnswered={() => setDailyPending(false)}
                />
              )}
              {page === "duel" && (
                <AsyncDuel
                  locale={locale}
                  circles={circles}
                  initialCode={duoToOpen}
                  onBack={() => navigate("home")}
                />
              )}
              {page === "circles" && (
                <SocialSpace
                  locale={locale}
                  onBack={() => navigate("home")}
                  onChanged={onCirclesChanged}
                  onDuo={() => navigate("duel")}
                />
              )}
            </div>
            {busy && (
              <p className="c-notice" role="status">
                {text("Enregistrement en cours…", "Saving…")}
              </p>
            )}
            {message && (
              <p className="c-notice" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="c-notice c-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="c-footer">
            <span>
              {text(
                "Chaque choix raconte quelque chose.",
                "Every choice tells a story.",
              )}
            </span>
            <nav
              className="c-inline"
              aria-label={text("Liens du compte", "Account links")}
            >
              <button onClick={() => navigate("account")}>
                {titles.account}
              </button>
              <button onClick={() => navigate("preferences")}>
                {titles.preferences}
              </button>
              <button onClick={() => navigate("privacy")}>
                {text("Confidentialité", "Privacy")}
              </button>
            </nav>
          </div>
        </div>
      </div>
      <nav
        className="c-mobile-nav"
        aria-label={text("Navigation mobile", "Mobile navigation")}
      >
        {(
          [
            ["home", "dashboard", text("Accueil", "Home")],
            ["portraits", "fingerprint", text("Portraits", "Portraits")],
            ["daily", "ticket", text("Du jour", "Daily")],
            ["duel", "swords", text("Duo", "Duo")],
            ["circles", "users", text("Cercles", "Circles")],
          ] as const
        ).map(([target, icon, label]) => (
          <button
            key={target}
            onClick={() => navigate(target)}
            aria-current={
              page === target || (page === "detail" && target === "portraits")
                ? "page"
                : undefined
            }
            aria-label={titles[target]}
          >
            {icon ? (
              <AccountIcon name={icon} />
            ) : (
              <span className="c-icon" aria-hidden="true">
                ◎
              </span>
            )}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {confirmation && (
        <dialog
          className="c-confirm-dialog"
          ref={dialog}
          aria-labelledby="account-confirm-title"
          aria-describedby="account-confirm-description"
          onCancel={(event) => {
            if (busy) event.preventDefault();
            else setConfirmation(null);
          }}
          onClose={() => {
            if (!busy) setConfirmation(null);
          }}
        >
          <div className="c-dialogbox">
            <div className="c-sectionhead">
              <span className="c-eyebrow">Dilemme</span>
              <button
                className="c-round"
                onClick={() => setConfirmation(null)}
                disabled={busy}
                aria-label={text("Fermer", "Close")}
              >
                ×
              </button>
            </div>
            <h2 id="account-confirm-title">
              {confirmation.kind === "portrait"
                ? text("Supprimer ce portrait ?", "Delete this portrait?")
                : confirmation.kind === "history"
                  ? text("Effacer tes portraits ?", "Clear your portraits?")
                  : confirmation.kind === "account"
                    ? text("Supprimer ton compte ?", "Delete your account?")
                    : text("Quitter ton espace ?", "Leave your space?")}
            </h2>
            <p id="account-confirm-description">
              {confirmation.kind === "account"
                ? text(
                    "Cette action est définitive. Ton compte, tes portraits et ta sauvegarde seront supprimés.",
                    "This is permanent. Your account, portraits and saved game will be deleted.",
                  )
                : confirmation.kind === "signout"
                  ? text(
                      "Tu retrouveras tes portraits à ta prochaine connexion.",
                      "Your portraits will be here when you sign in again.",
                    )
                  : text(
                      "Cette suppression ne peut pas être annulée.",
                      "This deletion cannot be undone.",
                    )}
            </p>
            <form className="c-form" onSubmit={confirm}>
              {confirmation.kind === "account" && (
                <label>
                  {text(
                    "Écris SUPPRIMER pour confirmer",
                    "Type DELETE to confirm",
                  )}
                  <input
                    value={confirmationText}
                    onChange={(event) =>
                      setConfirmationText(event.target.value)
                    }
                    autoComplete="off"
                    disabled={busy}
                  />
                </label>
              )}
              {dialogError && (
                <p className="c-formerror" role="alert">
                  {dialogError}
                </p>
              )}
              <div className="c-dialogactions">
                <button
                  type="button"
                  className="c-button"
                  autoFocus
                  disabled={busy}
                  onClick={() => setConfirmation(null)}
                >
                  {text("Annuler", "Cancel")}
                </button>
                <button
                  className="c-button c-primary"
                  disabled={
                    busy ||
                    (confirmation.kind === "account" &&
                      confirmationText !== text("SUPPRIMER", "DELETE"))
                  }
                >
                  {busy
                    ? text("Un instant…", "Just a moment…")
                    : confirmation.kind === "signout"
                      ? text("Se déconnecter", "Sign out")
                      : text("Supprimer", "Delete")}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
