import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Locale } from "../core/types";
import { AXES } from "../core/types";
import { axisCopy } from "../data/archetypes";
import {
  communityEnabled,
  communityRequest,
  CommunityRequestError,
  validateProposal,
  type Submission,
  type Draft,
} from "../services/community";
import "../styles/community.css";
import { playerAuth } from "../services/supabase";

interface ProposalDraft {
  locale: Locale;
  prompt: string;
  a: string;
  b: string;
}
const PROPOSAL_DRAFT = "dilemma.proposal.pending.v1";

function ProposalAuth({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const fr = locale === "fr";
  const [login, setLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  useEffect(() => {
    void communityRequest("/auth/v1/settings")
      .then((settings) =>
        setGoogleAvailable(settings?.external?.google === true),
      )
      .catch(() => setGoogleAvailable(false));
  }, []);
  async function emailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    const displayName = String(data.get("displayName") ?? "").trim();
    setError("");
    setMessage("");
    if (password.length < 12) {
      setError(
        fr ? "Choisis au moins 12 caractères." : "Use at least 12 characters.",
      );
      return;
    }
    if (!login && password !== confirmation) {
      setError(
        fr
          ? "Les mots de passe ne correspondent pas."
          : "Passwords do not match.",
      );
      return;
    }
    setBusy(true);
    try {
      if (login) {
        const { error: authError } = await playerAuth.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } else {
        const { data: result, error: authError } = await playerAuth.auth.signUp(
          {
            email,
            password,
            options: {
              data: { display_name: displayName },
              emailRedirectTo: `${location.origin}${location.pathname}?propose=1`,
            },
          },
        );
        if (authError) throw authError;
        if (!result.session) {
          setMessage(
            fr
              ? "Confirme ton adresse depuis l’e-mail reçu. Ta proposition sera envoyée à ton retour."
              : "Confirm your address from the email we sent. Your suggestion will be submitted when you return.",
          );
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : fr
            ? "Connexion impossible."
            : "Could not sign in.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function googleAuth() {
    setBusy(true);
    setError("");
    const { error: authError } = await playerAuth.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}${location.pathname}?propose=1`,
      },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }
  return (
    <div className="proposal-auth-backdrop" role="presentation">
      <section
        className="proposal-auth"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-auth-title"
      >
        <button
          className="proposal-auth-close"
          onClick={onClose}
          aria-label={fr ? "Fermer" : "Close"}
        >
          ×
        </button>
        <span className="eyebrow">
          {fr ? "Dernière étape" : "One last step"}
        </span>
        <h2 id="proposal-auth-title">
          {login
            ? fr
              ? "Connecte-toi pour envoyer."
              : "Sign in to submit."
            : fr
              ? "Crée ton compte pour envoyer."
              : "Create an account to submit."}
        </h2>
        <p>
          {fr
            ? "Ta proposition est conservée pendant cette étape."
            : "Your suggestion is saved while you complete this step."}
        </p>
        {googleAvailable && (
          <>
            <button
              className="google-auth"
              disabled={busy}
              onClick={() => void googleAuth()}
            >
              <b aria-hidden="true">G</b>{" "}
              {fr ? "Continuer avec Google" : "Continue with Google"}
            </button>
            <div className="auth-separator">
              <span>{fr ? "ou par e-mail" : "or with email"}</span>
            </div>
          </>
        )}
        <form
          className="community-form proposal-auth-form"
          onSubmit={(event) => void emailAuth(event)}
        >
          {!login && (
            <label>
              {fr ? "Pseudo" : "Nickname"}
              <input
                name="displayName"
                minLength={2}
                maxLength={30}
                autoComplete="nickname"
                required
              />
            </label>
          )}
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            {fr ? "Mot de passe" : "Password"}
            <input
              name="password"
              type="password"
              minLength={12}
              autoComplete={login ? "current-password" : "new-password"}
              required
            />
          </label>
          {!login && (
            <label>
              {fr ? "Confirmer le mot de passe" : "Confirm password"}
              <input
                name="confirmation"
                type="password"
                minLength={12}
                autoComplete="new-password"
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
              : login
                ? fr
                  ? "Se connecter et envoyer"
                  : "Sign in and submit"
                : fr
                  ? "Créer mon compte et envoyer"
                  : "Create account and submit"}
          </button>
        </form>
        <button
          className="text-button auth-mode"
          onClick={() => {
            setLogin(!login);
            setError("");
            setMessage("");
          }}
        >
          {login
            ? fr
              ? "Je n’ai pas encore de compte"
              : "I don’t have an account yet"
            : fr
              ? "J’ai déjà un compte"
              : "I already have an account"}
        </button>
      </section>
    </div>
  );
}

export function ProposeDilemma({
  locale,
  onBack,
}: {
  locale: Locale;
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState(""),
    [showAuth, setShowAuth] = useState(false);
  const sending = useRef(false);
  const [draft, setDraft] = useState<ProposalDraft>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(PROPOSAL_DRAFT) || "null",
      ) as ProposalDraft | null;
      if (saved?.prompt && saved.a && saved.b) return saved;
    } catch {
      /* Ignore unavailable or invalid storage. */
    }
    return { locale, prompt: "", a: "", b: "" };
  });

  function proposalError(reason: unknown, proposal: ProposalDraft) {
    const validation = validateProposal(proposal);
    if (validation === "prompt-length")
      return fr
        ? "La situation doit contenir entre 30 et 1 200 caractères, sans compter les espaces au début ou à la fin."
        : "The situation must contain between 30 and 1,200 characters, excluding leading or trailing spaces.";
    if (validation === "option-a-length" || validation === "option-b-length")
      return fr
        ? "Chaque choix doit contenir entre 10 et 500 caractères, sans compter les espaces au début ou à la fin."
        : "Each choice must contain between 10 and 500 characters, excluding leading or trailing spaces.";
    if (validation === "choices-identical")
      return fr
        ? "Les choix A et B doivent être différents."
        : "Choices A and B must be different.";
    if (
      reason instanceof CommunityRequestError &&
      (reason.code === "23514" || reason.code === "22001")
    )
      return fr
        ? "Vérifie la longueur des textes et assure-toi que les deux choix sont différents."
        : "Check the text lengths and make sure the two choices are different.";
    if (
      reason instanceof CommunityRequestError &&
      reason.message.includes("Submission capacity reached")
    )
      return fr
        ? "Tu as atteint la limite temporaire de propositions. Réessaie dans une heure."
        : "You have reached the temporary submission limit. Try again in an hour.";
    return fr
      ? "Envoi impossible pour le moment. Ta proposition est conservée dans le formulaire ; réessaie dans un instant."
      : "Could not send right now. Your text is still in the form; please try again shortly.";
  }

  async function send(proposal: ProposalDraft) {
    if (sending.current) return false;
    const { data } = await playerAuth.auth.getSession();
    if (!data.session) return false;
    sending.current = true;
    try {
      await communityRequest(
        "/rest/v1/rpc/submit_dilemma",
        {
          p_locale: proposal.locale,
          p_prompt: proposal.prompt,
          p_a: proposal.a,
          p_b: proposal.b,
        },
        data.session.access_token,
      );
      localStorage.removeItem(PROPOSAL_DRAFT);
      setSent(true);
      setDraft({ locale, prompt: "", a: "", b: "" });
      setShowAuth(false);
      return true;
    } finally {
      sending.current = false;
    }
  }

  useEffect(() => {
    const { data } = playerAuth.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      const saved = localStorage.getItem(PROPOSAL_DRAFT);
      if (!saved) return;
      try {
        const pending = JSON.parse(saved) as ProposalDraft;
        setBusy(true);
        void send(pending)
          .catch((reason) => setError(proposalError(reason, pending)))
          .finally(() => setBusy(false));
      } catch {
        localStorage.removeItem(PROPOSAL_DRAFT);
      }
    });
    void playerAuth.auth.getSession().then(({ data: auth }) => {
      if (auth.session && localStorage.getItem(PROPOSAL_DRAFT)) {
        setBusy(true);
        void send(draft)
          .catch((reason) => setError(proposalError(reason, draft)))
          .finally(() => setBusy(false));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <section className="community-page proposal-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Accueil" : "Home"}
      </button>
      <div className="proposal-heading">
        <span className="eyebrow">{fr ? "LA COMMUNAUTÉ IMAGINE" : "CREATED BY THE COMMUNITY"}</span>
        <h1>{fr ? "À toi de poser le dilemme." : "Your turn to pose a dilemma."}</h1>
        <p>
          {fr
            ? "Crée une situation qui oblige vraiment à choisir. Deux issues, deux conséquences, aucun échappatoire évident."
            : "Create a situation that truly forces a choice. Two outcomes, two consequences, no obvious way out."}
        </p>
        <div className="proposal-principles" aria-label={fr ? "Conseils de rédaction" : "Writing tips"}>
          <span><b>01</b>{fr ? "Une tension claire" : "A clear tension"}</span>
          <span><b>02</b>{fr ? "Deux coûts réels" : "Two real costs"}</span>
          <span><b>03</b>{fr ? "Aucune bonne réponse" : "No right answer"}</span>
        </div>
      </div>
      {!communityEnabled ? (
        <p className="notice">
          {fr
            ? "Les propositions ouvriront bientôt. Le formulaire attend l’activation du service de modération."
            : "Submissions will open soon. The form is waiting for the moderation service to be activated."}
        </p>
      ) : sent ? (
        <div role="status" className="notice">
          <h2>{fr ? "Proposition reçue !" : "Suggestion received!"}</h2>
          <p>
            {fr
              ? "Elle est en attente de modération. Elle n’est pas encore visible dans le jeu."
              : "It is awaiting review and is not yet visible in the game."}
          </p>
          <button className="text-button" onClick={() => setSent(false)}>
            {fr ? "En proposer une autre" : "Suggest another"}
          </button>
        </div>
      ) : (
        <div className="proposal-workspace">
        <form
          className="community-form proposal-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (data.get("website")) return;
            const proposal: ProposalDraft = {
              locale: data.get("locale") as Locale,
              prompt: String(data.get("prompt") ?? ""),
              a: String(data.get("a") ?? ""),
              b: String(data.get("b") ?? ""),
            };
            setDraft(proposal);
            setBusy(true);
            setError("");
            const validation = validateProposal(proposal);
            if (validation) {
              setError(proposalError(null, proposal));
              setBusy(false);
              return;
            }
            proposal.prompt = proposal.prompt.trim();
            proposal.a = proposal.a.trim();
            proposal.b = proposal.b.trim();
            try {
              if (!(await send(proposal))) {
                localStorage.setItem(PROPOSAL_DRAFT, JSON.stringify(proposal));
                setShowAuth(true);
              }
            } catch (reason) {
              setError(proposalError(reason, proposal));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="proposal-editor-topline">
            <span>{fr ? "TON BROUILLON" : "YOUR DRAFT"}</span>
            <label>
            <span>{fr ? "Langue" : "Language"}</span>
            <select
              name="locale"
              value={draft.locale}
              onChange={(event) =>
                setDraft({ ...draft, locale: event.target.value as Locale })
              }
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
            </label>
          </div>
          <label className="proposal-field proposal-situation">
            <span className="proposal-field-title"><b>1</b>{fr ? "Pose la situation" : "Set the scene"}<small>{draft.prompt.length}/1200</small></span>
            <textarea
              name="prompt"
              required
              minLength={30}
              maxLength={1200}
              rows={5}
              value={draft.prompt}
              onChange={(event) =>
                setDraft({ ...draft, prompt: event.target.value })
              }
              placeholder={fr ? "Ex. Tu peux révéler une vérité qui protège le public, mais elle mettra un proche en danger…" : "E.g. You can reveal a truth that protects the public, but it will put someone close to you in danger…"}
            />
          </label>
          <div className="proposal-options">
          <label className="proposal-field proposal-option proposal-option-a">
            <span className="proposal-field-title"><b>A</b>{fr ? "Premier choix" : "First choice"}<small>{draft.a.length}/500</small></span>
            <textarea
              name="a"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              value={draft.a}
              onChange={(event) =>
                setDraft({ ...draft, a: event.target.value })
              }
              placeholder={fr ? "L’action et ce qu’elle coûte." : "The action and what it costs."}
            />
          </label>
          <label className="proposal-field proposal-option proposal-option-b">
            <span className="proposal-field-title"><b>B</b>{fr ? "Second choix" : "Second choice"}<small>{draft.b.length}/500</small></span>
            <textarea
              name="b"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              value={draft.b}
              onChange={(event) =>
                setDraft({ ...draft, b: event.target.value })
              }
              placeholder={fr ? "L’alternative et ce qu’elle coûte." : "The alternative and what it costs."}
            />
          </label>
          <span className="proposal-or" aria-hidden="true">{fr ? "ou" : "or"}</span>
          </div>
          <div className="form-trap" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="proposal-submit-zone">
          <label className="consent">
            <input type="checkbox" required />
            {fr
              ? "J’autorise la reformulation, la traduction et la publication de ma proposition dans Dilemme."
              : "I allow my suggestion to be edited, translated and published in Dilemma."}
          </label>
          {error && (
            <p className="proposal-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? fr
                ? "Envoi…"
                : "Sending…"
              : fr
                ? "Envoyer pour validation"
                : "Submit for review"}
            <span aria-hidden="true">↗</span>
          </button>
          <p className="fine-print">
            {fr
              ? "La proposition sera associée à ton compte pour limiter les abus. Elle ne sera publiée qu’après modération."
              : "The suggestion will be linked to your account to prevent abuse. It will only be published after review."}
          </p>
          </div>
        </form>
        <aside className="proposal-preview" aria-label={fr ? "Aperçu du dilemme" : "Dilemma preview"}>
          <div className="proposal-preview-head">
            <span className="eyebrow">{fr ? "APERÇU EN DIRECT" : "LIVE PREVIEW"}</span>
            <i aria-hidden="true" />
          </div>
          <div className="proposal-preview-card">
            <span>{fr ? "TA SITUATION" : "YOUR SITUATION"}</span>
            <h2>{draft.prompt.trim() || (fr ? "Ton dilemme prendra vie ici pendant que tu écris." : "Your dilemma will come alive here as you write.")}</h2>
            <div>
              <article className="preview-proposal-a">
                <b>A</b>
                <p>{draft.a.trim() || (fr ? "Le premier choix apparaîtra ici." : "The first choice will appear here.")}</p>
              </article>
              <article className="preview-proposal-b">
                <b>B</b>
                <p>{draft.b.trim() || (fr ? "Le second choix apparaîtra ici." : "The second choice will appear here.")}</p>
              </article>
              <span aria-hidden="true">{fr ? "ou" : "or"}</span>
            </div>
          </div>
          <p>{fr ? "L’équipe pourra reformuler et traduire le texte avant publication." : "The team may edit and translate the text before publication."}</p>
        </aside>
        </div>
      )}
      {showAuth && (
        <ProposalAuth locale={locale} onClose={() => setShowAuth(false)} />
      )}
    </section>
  );
}

export function AdminDilemmas({
  locale,
  onBack,
  onRecovery,
}: {
  locale: Locale;
  onRecovery: () => void;
  onBack: () => void;
}) {
  const fr = locale === "fr";
  const [refreshToken, setRefreshToken] = useState("");
  const [token, setToken] = useState(""),
    [rows, setRows] = useState<Submission[]>([]),
    [selected, setSelected] = useState<Submission | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const refresh = async (access: string) => {
    const result = await communityRequest(
      "/rest/v1/dilemma_submissions?select=*&status=eq.pending&order=created_at.asc&limit=100",
      undefined,
      access,
    );
    setRows(result);
  };
  const report = (e: unknown) =>
    setError(
      e instanceof Error && e.message === "access-denied"
        ? fr
          ? "Accès refusé ou session expirée. Reconnecte-toi avec un compte admin."
          : "Access denied or session expired. Sign in with an admin account."
        : fr
          ? "Opération impossible. Réessaie ; aucune confirmation de succès n’a été reçue."
          : "Operation failed. Please retry; no success was confirmed.",
    );
  useEffect(() => {
    if (!refreshToken) return;
    const id = setInterval(
      () => {
        void communityRequest("/auth/v1/token?grant_type=refresh_token", {
          refresh_token: refreshToken,
        })
          .then((auth) => {
            setToken(auth.access_token);
            setRefreshToken(auth.refresh_token);
          })
          .catch(() => {
            setToken("");
            setRefreshToken("");
            setRows([]);
            setSelected(null);
            setError(
              fr
                ? "Session expirée. Reconnecte-toi pour continuer."
                : "Session expired. Sign in again to continue.",
            );
          });
      },
      30 * 60 * 1000,
    );
    return () => clearInterval(id);
  }, [refreshToken, fr]);
  return (
    <section className="community-page admin-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Accueil" : "Home"}
      </button>
      <h1>{fr ? "Modération des dilemmes" : "Dilemma moderation"}</h1>
      {!communityEnabled ? (
        <p className="notice">
          {fr
            ? "Service de modération non configuré."
            : "Moderation service is not configured."}
        </p>
      ) : !token ? (
        <form
          className="community-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              const auth = await communityRequest(
                "/auth/v1/token?grant_type=password",
                { email: data.get("email"), password: data.get("password") },
              );
              const allowed = await communityRequest(
                "/rest/v1/rpc/is_dilemma_admin",
                {},
                auth.access_token,
              );
              if (allowed !== true) throw new Error("access-denied");
              await refresh(auth.access_token);
              setToken(auth.access_token);
              setRefreshToken(auth.refresh_token);
            } catch (e) {
              report(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            E-mail
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            {fr ? "Mot de passe" : "Password"}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <p className="fine-print">
            {fr
              ? "Accès réservé aux comptes autorisés. Ta session reste uniquement dans cet onglet."
              : "Authorized accounts only. Your session stays in this tab only."}
          </p>
          <button className="primary" disabled={busy}>
            {fr ? "Connexion admin" : "Admin sign in"}
          </button>
          <button type="button" className="text-button" onClick={onRecovery}>
            {fr ? "Mot de passe oublié ?" : "Forgot password?"}
          </button>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <button
              className="text-button"
              onClick={() => {
                void communityRequest("/auth/v1/logout", {}, token).catch(
                  () => {},
                );
                setToken("");
                setRefreshToken("");
                setRows([]);
                setSelected(null);
                setError("");
                setStatus("");
              }}
            >
              {fr ? "Déconnexion" : "Sign out"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await refresh(token);
                } catch (e) {
                  report(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {fr ? "Actualiser" : "Refresh"}
            </button>
          </div>
          <p>
            {fr
              ? "100 propositions en attente maximum par page. Après traitement, les suivantes apparaissent. Rien n’est publié sans validation."
              : "Up to 100 pending suggestions are shown. Process them to see the next ones. Nothing is published without approval."}
          </p>
          {!rows.length && (
            <p>
              {fr
                ? "Aucune proposition en attente."
                : "No pending suggestions."}
            </p>
          )}
          <div className="moderation-list">
            {rows.map((row) => (
              <button
                className="moderation-item"
                disabled={busy}
                key={row.id}
                aria-pressed={selected?.id === row.id}
                onClick={() => {
                  setSelected(row);
                  setStatus("");
                }}
              >
                <small>
                  {row.locale.toUpperCase()} ·{" "}
                  {new Date(row.created_at).toLocaleDateString(locale)}
                </small>
                <span>{row.prompt}</span>
              </button>
            ))}
          </div>
          {selected && (
            <form
              key={selected.id}
              className="community-form moderation-editor"
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const draft = Object.fromEntries(
                  data.entries(),
                ) as unknown as Draft;
                setBusy(true);
                setError("");
                setStatus("");
                try {
                  await communityRequest(
                    "/rest/v1/rpc/publish_dilemma",
                    { p_id: selected.id, p_draft: draft },
                    token,
                  );
                  setSelected(null);
                  setStatus(
                    fr
                      ? "Publié. Le dilemme sera disponible au prochain chargement du jeu."
                      : "Published. The dilemma will be available on the next game load.",
                  );
                  await refresh(token);
                } catch (e) {
                  report(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>
                {fr
                  ? "Relire et préparer la publication"
                  : "Review and prepare publication"}
              </h2>
              <blockquote>
                <p>{selected.prompt}</p>
                <p>A · {selected.option_a}</p>
                <p>B · {selected.option_b}</p>
              </blockquote>
              {(["fr", "en"] as const).map((lang) => (
                <fieldset key={lang}>
                  <legend>
                    {lang === "fr" ? "Version française" : "English version"}
                  </legend>
                  {(
                    [
                      [
                        "prompt",
                        fr ? "Situation" : "Situation",
                        selected.prompt,
                      ],
                      ["a", fr ? "Choix A" : "Choice A", selected.option_a],
                      ["b", fr ? "Choix B" : "Choice B", selected.option_b],
                    ] as const
                  ).map(([field, label, original]) => (
                    <label key={field}>
                      {label}
                      <textarea
                        name={`${field}_${lang}`}
                        required
                        minLength={field === "prompt" ? 30 : 10}
                        maxLength={field === "prompt" ? 1200 : 500}
                        rows={3}
                        defaultValue={selected.locale === lang ? original : ""}
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
              <label>
                {fr
                  ? "Axe mesuré (A = pôle positif, B = pôle négatif)"
                  : "Measured axis (A = positive pole, B = negative pole)"}
                <select name="axis">
                  {AXES.map((axis) => (
                    <option key={axis} value={axis}>
                      {axisCopy[axis].positive[locale]} /{" "}
                      {axisCopy[axis].negative[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                {fr
                  ? "Vérifie les deux langues et inverse les choix si nécessaire : A vaut +3 sur l’axe choisi, B vaut −3. Une publication est immuable pour préserver les parties en cours."
                  : "Check both languages and swap the choices if needed: A scores +3 on the selected axis, B scores −3. Published entries are immutable to preserve ongoing games."}
              </p>
              <label className="consent">
                <input type="checkbox" required />
                {fr
                  ? "J’ai vérifié les traductions, l’absence de données personnelles et l’équilibre des deux choix."
                  : "I have checked translations, absence of personal data and the balance between both choices."}
              </label>
              <button className="primary" disabled={busy}>
                {fr ? "Valider et publier" : "Approve and publish"}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await communityRequest(
                      "/rest/v1/rpc/reject_dilemma",
                      { p_id: selected.id },
                      token,
                    );
                    setSelected(null);
                    await refresh(token);
                    setStatus(
                      fr ? "Proposition refusée." : "Suggestion rejected.",
                    );
                  } catch (e) {
                    report(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {fr ? "Refuser cette proposition" : "Reject this suggestion"}
              </button>
            </form>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
