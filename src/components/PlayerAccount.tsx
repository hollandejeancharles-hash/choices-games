import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "../core/types";
import { archetypes, axisCopy } from "../data/archetypes";
import {
  listCloudResults,
  strongestEvolution,
  type CloudResult,
} from "../services/player-cloud";
import { playerAuth } from "../services/supabase";

type Mode = "register" | "login" | "forgot" | "reset";
const redirectUrl = () => `${location.origin}${location.pathname}?account=1`;

export function PlayerAccount({
  locale,
  onBack,
}: {
  locale: Locale;
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<CloudResult[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(location.hash.slice(1)).get("type") === "recovery"
      ? "reset"
      : "register",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void playerAuth.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = playerAuth.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || mode === "reset") return;
    setHistoryBusy(true);
    void listCloudResults()
      .then(setResults)
      .catch(() =>
        setError(
          fr
            ? "L’historique cloud est momentanément indisponible."
            : "Cloud history is temporarily unavailable.",
        ),
      )
      .finally(() => setHistoryBusy(false));
  }, [user, mode, fr]);

  const label = (key: "register" | "login" | "forgot") =>
    key === "register"
      ? fr
        ? "Créer un compte"
        : "Create an account"
      : key === "login"
        ? fr
          ? "Se connecter"
          : "Sign in"
        : fr
          ? "Mot de passe oublié"
          : "Forgot password";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    setError("");
    setMessage("");
    if (mode !== "forgot" && password.length < 12) {
      setError(
        fr
          ? "Choisis un mot de passe d’au moins 12 caractères."
          : "Use a password with at least 12 characters.",
      );
      return;
    }
    if (
      (mode === "register" || mode === "reset") &&
      password !== confirmation
    ) {
      setError(
        fr
          ? "Les mots de passe ne correspondent pas."
          : "Passwords do not match.",
      );
      return;
    }
    if (
      mode === "register" &&
      (displayName.length < 2 || displayName.length > 30)
    ) {
      setError(
        fr
          ? "Choisis un pseudo entre 2 et 30 caractères."
          : "Choose a nickname between 2 and 30 characters.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error } = await playerAuth.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: redirectUrl(),
          },
        });
        if (error) throw error;
        setMessage(
          data.session
            ? fr
              ? "Compte créé. Tu es connecté·e."
              : "Account created. You are signed in."
            : fr
              ? "Vérifie ta boîte mail pour confirmer ton adresse avant de jouer."
              : "Check your inbox to confirm your email before playing.",
        );
      } else if (mode === "login") {
        const { error } = await playerAuth.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await playerAuth.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl(),
        });
        if (error) throw error;
        setMessage(
          fr
            ? "Si cette adresse est inscrite, un e-mail de récupération vient d’être envoyé."
            : "If that address is registered, a recovery email has been sent.",
        );
      } else {
        const { error } = await playerAuth.auth.updateUser({ password });
        if (error) throw error;
        history.replaceState(null, "", `${location.pathname}?account=1`);
        setMode("register");
      }
    } catch (reason) {
      const detail =
        reason instanceof Error ? reason.message.toLowerCase() : "";
      setError(
        detail.includes("rate limit")
          ? fr
            ? "Trop de demandes. Attends quelques minutes avant de réessayer."
            : "Too many requests. Wait a few minutes and try again."
          : detail ||
              (fr
                ? "Impossible de continuer pour le moment."
                : "Unable to continue right now."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (user && mode !== "reset") {
    const name =
      typeof user.user_metadata.display_name === "string"
        ? user.user_metadata.display_name
        : user.email;
    const evolution =
      results.length >= 2
        ? strongestEvolution(results[0]!.vector, results[1]!.vector)
        : null;
    return (
      <section className="account-page account-dashboard page-in">
        <button className="text-button" onClick={onBack}>
          ← {fr ? "Retour au jeu" : "Back to game"}
        </button>
        <span className="eyebrow">{fr ? "Espace joueur" : "Player space"}</span>
        <h1>{fr ? `Bienvenue, ${name}.` : `Welcome, ${name}.`}</h1>
        <p>
          {fr
            ? "Ta partie en cours et tes portraits solo sont synchronisés en privé sur tes appareils."
            : "Your current game and solo portraits sync privately across your devices."}
        </p>
        <button className="primary" onClick={onBack}>
          {fr ? "Jouer" : "Play"}
          <span>→</span>
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="account-history">
          <div className="account-section-heading">
            <div>
              <span className="eyebrow">
                {fr ? "Chronologie privée" : "Private timeline"}
              </span>
              <h2>{fr ? "Mes portraits" : "My portraits"}</h2>
            </div>
            <span>{results.length}/20</span>
          </div>
          {evolution && (
            <div className="evolution-card">
              <span>{fr ? "Évolution récente" : "Recent evolution"}</span>
              <strong>{axisCopy[evolution.axis].positive[locale]}</strong>
              <b>
                {evolution.delta > 0 ? "+" : ""}
                {Math.round(evolution.delta)}
              </b>
            </div>
          )}
          {historyBusy ? (
            <p role="status">
              {fr ? "Chargement de tes portraits…" : "Loading your portraits…"}
            </p>
          ) : results.length === 0 ? (
            <p className="history-empty">
              {fr
                ? "Termine une partie solo pour commencer ta chronologie."
                : "Finish a solo game to start your timeline."}
            </p>
          ) : (
            <div className="history-list">
              {results.map((item) => {
                const archetype = archetypes.find(
                  (entry) => entry.id === item.archetypeId,
                );
                return (
                  <article key={item.id}>
                    <img src={`./avatars/${item.archetypeId}.png`} alt="" />
                    <div>
                      <strong>
                        {archetype?.name[locale] ?? item.archetypeId}
                      </strong>
                      <span>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                        }).format(new Date(item.completedAt))}{" "}
                        · {item.length} {fr ? "choix" : "choices"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <p className="account-privacy">
          {fr
            ? "Tes réponses détaillées ne figurent pas dans l’historique. La sauvegarde active reste privée grâce aux règles d’accès Supabase."
            : "Detailed answers are not kept in history. Your active save remains private through Supabase access rules."}
        </p>
        <button
          className="text-button account-signout"
          onClick={() => void playerAuth.auth.signOut()}
        >
          {fr ? "Se déconnecter" : "Sign out"}
        </button>
      </section>
    );
  }

  return (
    <section className="account-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Retour au jeu" : "Back to game"}
      </button>
      <span className="eyebrow">{fr ? "Compte joueur" : "Player account"}</span>
      <h1>
        {mode === "reset"
          ? fr
            ? "Choisis un nouveau mot de passe."
            : "Choose a new password."
          : `${label(mode as "register" | "login" | "forgot")}.`}
      </h1>
      <p>
        {mode === "register"
          ? fr
            ? "Conserve ton identité de joueur et retrouve-la sur tous tes appareils."
            : "Keep your player identity and find it on every device."
          : mode === "login"
            ? fr
              ? "Retrouve ton espace joueur."
              : "Return to your player space."
            : fr
              ? "Nous t’enverrons un lien sécurisé par e-mail."
              : "We will email you a secure link."}
      </p>
      <form className="account-form" onSubmit={(event) => void submit(event)}>
        {mode === "register" && (
          <label>
            {fr ? "Pseudo" : "Nickname"}
            <input
              name="displayName"
              autoComplete="nickname"
              minLength={2}
              maxLength={30}
              required
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {mode !== "forgot" && (
          <label>
            {fr ? "Mot de passe" : "Password"}
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={12}
              required
            />
          </label>
        )}
        {(mode === "register" || mode === "reset") && (
          <label>
            {fr ? "Confirmer le mot de passe" : "Confirm password"}
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? fr
              ? "Un instant…"
              : "Just a moment…"
            : mode === "reset"
              ? fr
                ? "Enregistrer"
                : "Save"
              : label(mode as "register" | "login" | "forgot")}
          <span>→</span>
        </button>
      </form>
      <div className="account-links">
        {mode !== "register" && (
          <button
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            {label("register")}
          </button>
        )}
        {mode !== "login" && mode !== "reset" && (
          <button
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            {label("login")}
          </button>
        )}
        {mode !== "forgot" && mode !== "reset" && (
          <button
            onClick={() => {
              setMode("forgot");
              setError("");
            }}
          >
            {label("forgot")}
          </button>
        )}
      </div>
    </section>
  );
}
