import { useEffect, useState } from "react";
import type { Locale } from "../core/types";
import { AXES } from "../core/types";
import { axisCopy } from "../data/archetypes";
import {
  communityEnabled,
  communityRequest,
  type Submission,
  type Draft,
} from "../services/community";
import "../styles/community.css";

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
    [error, setError] = useState(false);
  return (
    <section className="community-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Accueil" : "Home"}
      </button>
      <h1>
        {fr ? "À toi de poser le dilemme." : "Your turn to pose a dilemma."}
      </h1>
      <p>
        {fr
          ? "Une situation, deux choix difficiles. L’équipe relit chaque proposition avant de l’ajouter au jeu. Ne partage pas de données personnelles ni d’histoires permettant d’identifier quelqu’un."
          : "One situation, two difficult choices. The team reviews every suggestion before adding it to the game. Do not include personal data or stories that identify someone."}
      </p>
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
        <form
          className="community-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              data = new FormData(form);
            if (data.get("website")) return;
            setBusy(true);
            setError(false);
            try {
              await communityRequest("/rest/v1/rpc/submit_dilemma", {
                p_locale: data.get("locale"),
                p_prompt: data.get("prompt"),
                p_a: data.get("a"),
                p_b: data.get("b"),
              });
              setSent(true);
              form.reset();
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {fr ? "Langue de la proposition" : "Suggestion language"}
            <select name="locale" defaultValue={locale}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {fr ? "La situation" : "The situation"}
            <textarea
              name="prompt"
              required
              minLength={30}
              maxLength={1200}
              rows={5}
            />
          </label>
          <label>
            {fr ? "Choix A et sa conséquence" : "Choice A and its consequence"}
            <textarea
              name="a"
              required
              minLength={10}
              maxLength={500}
              rows={3}
            />
          </label>
          <label>
            {fr ? "Choix B et sa conséquence" : "Choice B and its consequence"}
            <textarea
              name="b"
              required
              minLength={10}
              maxLength={500}
              rows={3}
            />
          </label>
          <div className="form-trap" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="consent">
            <input type="checkbox" required />
            {fr
              ? "J’autorise la reformulation, la traduction et la publication de ma proposition dans Dilemme."
              : "I allow my suggestion to be edited, translated and published in Dilemma."}
          </label>
          {error && (
            <p role="alert">
              {fr
                ? "Envoi impossible pour le moment. Ta proposition est conservée dans le formulaire ; réessaie dans un instant."
                : "Could not send right now. Your text is still in the form; please try again shortly."}
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
          </button>
          <p className="fine-print">
            {fr
              ? "Texte stocké pour modération, sans nom ni adresse e-mail demandés. Ne ferme pas cette page avant confirmation de l’envoi."
              : "Text is stored for moderation; no name or email is requested. Keep this page open until submission is confirmed."}
          </p>
        </form>
      )}
    </section>
  );
}

export function AdminDilemmas({
  locale,
  onBack,
}: {
  locale: Locale;
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
