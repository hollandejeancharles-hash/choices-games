import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  AccountDashboard,
  type AccountNavigationProps,
} from "./AccountDashboard";
import { playerAuth } from "../services/supabase";

type Mode = "register" | "login" | "forgot" | "reset";
import { accountRedirect, invitationToken } from "../services/social";
const redirectUrl = accountRedirect;

export function PlayerAccount(props: AccountNavigationProps) {
  const { locale, onBack } = props;
  const fr = locale === "fr";
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(location.hash.slice(1)).get("type") === "recovery"
      ? "reset"
      : "register",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    void playerAuth.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active || authEventReceived) return;
        setUser(error ? null : data.user);
        setAuthLoading(false);
      })
      .catch(() => {
        if (active && !authEventReceived) setAuthLoading(false);
      });
    const { data } = playerAuth.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

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

  if (authLoading)
    return (
      <section className="account-page" role="status">
        {fr ? "Chargement de ton espace…" : "Loading your space…"}
      </section>
    );
  if (user && mode !== "reset") {
    return <AccountDashboard key={user.id} user={user} {...props} />;
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
      {invitationToken() && (
        <p className="notice">
          {fr
            ? "Une invitation t’attend. Connecte-toi ou crée ton compte avec l’adresse invitée ; tu pourras ensuite l’accepter."
            : "An invitation is waiting. Sign in or create your account using the invited email, then accept it."}
        </p>
      )}
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
