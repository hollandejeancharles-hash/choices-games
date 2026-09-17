import { useState } from "react";
import type { Locale } from "../core/types";
import {
  clearRecovery,
  hasRecoveryAccess,
  requestRecovery,
  updateRecoveredPassword,
} from "../services/recovery";
export function PasswordRecovery({
  locale,
  onLogin,
}: {
  locale: Locale;
  onLogin: () => void;
}) {
  const fr = locale === "fr";
  const [reset, setReset] = useState(hasRecoveryAccess),
    [sent, setSent] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const leave = () => {
    clearRecovery();
    history.replaceState(null, "", location.pathname);
    onLogin();
  };
  return (
    <section className="community-page admin-page page-in">
      <button className="text-button" onClick={leave}>
        ← {fr ? "Connexion admin" : "Admin sign in"}
      </button>
      <h1>
        {done
          ? fr
            ? "Mot de passe modifié."
            : "Password changed."
          : reset
            ? fr
              ? "Choisis ton nouveau mot de passe."
              : "Choose your new password."
            : fr
              ? "Retrouve ton accès admin."
              : "Recover your admin access."}
      </h1>
      {done ? (
        <>
          <p role="status">
            {fr
              ? "Ton compte et tes droits sont conservés. Connecte-toi avec ton nouveau mot de passe."
              : "Your account and permissions are unchanged. Sign in with your new password."}
          </p>
          <button className="primary" onClick={leave}>
            {fr ? "Se connecter" : "Sign in"}
          </button>
        </>
      ) : sent ? (
        <div className="notice" role="status">
          <h2>{fr ? "Vérifie ta boîte mail." : "Check your inbox."}</h2>
          <p>
            {fr
              ? "Si cette adresse correspond à un compte, un lien de récupération lui sera envoyé. Vérifie aussi les indésirables. Le lien ouvre la page pour choisir ton nouveau mot de passe."
              : "If this address belongs to an account, a recovery link will be sent. Check your spam folder too. The link opens the page to choose your new password."}
          </p>
          <button className="text-button" onClick={() => setSent(false)}>
            {fr ? "Utiliser une autre adresse" : "Use another address"}
          </button>
        </div>
      ) : (
        <form
          className="community-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setError("");
            if (reset && data.get("password") !== data.get("confirmation")) {
              setError(
                fr
                  ? "Les mots de passe ne correspondent pas."
                  : "Passwords do not match.",
              );
              return;
            }
            setBusy(true);
            try {
              if (reset) {
                await updateRecoveredPassword(String(data.get("password")));
                form.reset();
                setDone(true);
              } else {
                await requestRecovery(String(data.get("email")));
                setSent(true);
              }
            } catch (e) {
              const code = e instanceof Error ? e.message : "";
              if (code === "expired") {
                clearRecovery();
                setReset(false);
              }
              setError(
                code === "expired"
                  ? fr
                    ? "Ce lien est expiré ou invalide. Demande un nouvel e-mail."
                    : "This link is expired or invalid. Request a new email."
                  : code === "rate-limit"
                    ? fr
                      ? "Trop de demandes. Attends quelques minutes avant de réessayer."
                      : "Too many requests. Wait a few minutes before trying again."
                    : fr
                      ? "Impossible de terminer. Réessaie dans un instant ; aucune modification n’est confirmée."
                      : "Could not complete the request. Try again shortly; no change is confirmed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            {reset
              ? fr
                ? "Utilise au moins 12 caractères. Ne partage jamais ce mot de passe ni ton lien de récupération."
                : "Use at least 12 characters. Never share your password or recovery link."
              : fr
                ? "Saisis l’adresse e-mail de ton compte. Nous t’enverrons un lien pour définir un nouveau mot de passe. Un lien déjà utilisé ou expiré nécessite une nouvelle demande."
                : "Enter your account email to request a password reset link. Used or expired links require a new request."}
          </p>
          {reset ? (
            <>
              <label>
                {fr ? "Nouveau mot de passe" : "New password"}
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <label>
                {fr ? "Confirmer le mot de passe" : "Confirm password"}
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" required />
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? fr
                ? "Un instant…"
                : "Please wait…"
              : reset
                ? fr
                  ? "Enregistrer mon mot de passe"
                  : "Save my password"
                : fr
                  ? "Envoyer le lien de récupération"
                  : "Send recovery link"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
