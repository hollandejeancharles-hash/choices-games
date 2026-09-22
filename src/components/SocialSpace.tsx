import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Locale } from "../core/types";
import type { Circle } from "../services/player-features";
import { PrivateCircles } from "./PrivateCircles";
import { AccountIcon } from "./ui/AccountIcon";
import {
  cancelInvitation,
  createInvitation,
  invitationLink,
  invitationToken,
  previewInvitation,
  removeFriend,
  respondInvitation,
  sendInvitationEmail,
  socialState,
  type InvitationKind,
  type InvitationPreview,
  type SocialState,
} from "../services/social";

export function SocialSpace({
  locale,
  onBack,
  onChanged,
  onDuo,
}: {
  locale: Locale;
  onBack: () => void;
  onChanged?: ((circles: Circle[]) => void) | undefined;
  onDuo?: (() => void) | undefined;
}) {
  const fr = locale === "fr",
    t = (a: string, b: string) => (fr ? a : b);
  const [tab, setTab] = useState<"circles" | "friends">("circles");
  const [data, setData] = useState<SocialState>({
    friends: [],
    invitations: [],
  });
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [target, setTarget] = useState<{
    kind: InvitationKind;
    circle: Circle | null;
  } | null>(null);
  const [channel, setChannel] = useState<"email" | "link">("email");
  const [email, setEmail] = useState(""),
    [link, setLink] = useState("");
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [circleVersion, setCircleVersion] = useState(0);
  const lock = useRef(false),
    request = useRef(crypto.randomUUID());
  const composer = useRef<HTMLDivElement>(null);
  const [pendingToken, setPendingToken] = useState(invitationToken);
  async function refresh() {
    setLoading(true);
    setLoadError(false);
    try {
      setData(await socialState());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!pendingToken) return;
    let active = true;
    void previewInvitation(pendingToken)
      .then((p) => {
        if (active) setPreview(p);
      })
      .catch(() => {
        if (active)
          setError(
            t(
              "Invitation indisponible, expirée ou destinée à une autre adresse. Connecte-toi avec l’adresse invitée.",
              "This invitation is unavailable, expired or addressed to another email. Sign in with the invited address.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [pendingToken, fr]);
  useEffect(() => {
    if (target) composer.current?.focus();
  }, [target]);
  function openInvite(kind: InvitationKind, circle: Circle | null = null) {
    setTarget({ kind, circle });
    setEmail("");
    setLink("");
    setMessage("");
    setError("");
    request.current = crypto.randomUUID();
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (reason) {
      const detail = String((reason as { message?: string })?.message ?? "");
      setError(
        detail.includes("rate-limit")
          ? t(
              "Trop d’invitations. Réessaie plus tard.",
              "Too many invitations. Try again later.",
            )
          : detail.includes("self-invitation")
            ? t(
                "Choisis une autre adresse que la tienne.",
                "Choose an address other than your own.",
              )
            : t(
                "Impossible de terminer. Vérifie l’invitation et réessaie.",
                "Could not complete. Check the invitation and try again.",
              ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function mail(id: string) {
    try {
      await sendInvitationEmail(id);
      setMessage(
        t(
          "E-mail envoyé. L’invitation est en attente d’acceptation.",
          "Email sent. Waiting for acceptance.",
        ),
      );
    } catch {
      setError(
        t(
          "Invitation enregistrée, mais l’e-mail n’a pas été envoyé. Tu peux partager le lien ou réessayer après l’activation du service d’envoi.",
          "Invitation saved, but the email was not sent. Share the link or try again once email delivery is enabled.",
        ),
      );
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    void run(async () => {
      const created = await createInvitation(
        target.kind,
        target.circle?.id ?? null,
        channel === "email" ? email.trim() : null,
        request.current,
      );
      setLink(invitationLink(created.token));
      if (channel === "email") await mail(created.id);
      else
        setMessage(
          t(
            "Lien prêt à partager. Il peut être accepté par une personne et expire après 14 jours.",
            "Link ready to share. One person can accept it within 14 days.",
          ),
        );
    });
  }
  async function share(value: string) {
    setLink(value);
    try {
      if (navigator.share)
        await navigator.share({
          title: "Dilemme",
          text: t("Retrouvons-nous sur Dilemme.", "Join me on Dilemme."),
          url: value,
        });
      else {
        await navigator.clipboard.writeText(value);
        setMessage(t("Lien copié.", "Link copied."));
      }
    } catch {
      setMessage(
        t("Tu peux copier le lien ci-dessous.", "You can copy the link below."),
      );
    }
  }
  function dismissPreview() {
    setPreview(null);
    setPendingToken(null);
    const url = new URL(location.href);
    url.searchParams.delete("invite");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  async function respond(token: string, accept: boolean) {
    await respondInvitation(token, accept);
    setCircleVersion((v) => v + 1);
    if (token === pendingToken) dismissPreview();
    setMessage(
      accept
        ? t("Invitation acceptée.", "Invitation accepted.")
        : t("Invitation refusée.", "Invitation declined."),
    );
  }
  const statuses = {
    pending: t("En attente", "Pending"),
    accepted: t("Acceptée", "Accepted"),
    declined: t("Refusée", "Declined"),
    cancelled: t("Annulée", "Cancelled"),
    expired: t("Expirée", "Expired"),
  };
  return (
    <section className="social-space page-in">
      <button className="text-button" onClick={onBack}>
        ← {t("Retour", "Back")}
      </button>
      <span className="eyebrow">{t("Entre vous", "Together")}</span>
      <h1>{t("Les choix se partagent.", "Choices bring us together.")}</h1>
      <p>
        {t(
          "Retrouve tes cercles, invite tes proches et garde le contact.",
          "Find your circles, invite people and stay in touch.",
        )}
      </p>
      {preview && (
        <section
          className="social-panel social-incoming"
          aria-label={t("Invitation reçue", "Received invitation")}
        >
          <h2>
            {preview.kind === "circle"
              ? t(
                  "Rejoindre " + preview.circleName,
                  "Join " + preview.circleName,
                )
              : t(
                  "Devenir ami avec " + preview.senderName,
                  "Become friends with " + preview.senderName,
                )}
          </h2>
          <p>
            {t("Invitation de ", "Invited by ")}
            {preview.senderName}
          </p>
          {preview.outgoing ? (
            <p>
              {t(
                "C’est ton invitation : partage ce lien avec une autre personne.",
                "This is your invitation: share the link with someone else.",
              )}
            </p>
          ) : (
            <div className="social-buttons">
              <button
                disabled={busy}
                onClick={() => void run(() => respond(preview.token, true))}
              >
                {t("Accepter", "Accept")}
              </button>
              <button
                disabled={busy}
                onClick={() => void run(() => respond(preview.token, false))}
              >
                {t("Refuser", "Decline")}
              </button>
            </div>
          )}
          <button onClick={dismissPreview}>{t("Fermer", "Close")}</button>
        </section>
      )}
      <div
        className="social-tabs"
        role="tablist"
        aria-label={t("Cercles et amis", "Circles and friends")}
      >
        {(["circles", "friends"] as const).map((item, index) => (
          <button
            key={item}
            id={"social-tab-" + item}
            role="tab"
            aria-selected={tab === item}
            aria-controls={"social-panel-" + item}
            tabIndex={tab === item ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? "circles"
                    : e.key === "End"
                      ? "friends"
                      : index === 0
                        ? "friends"
                        : "circles";
                setTab(next);
                document.getElementById("social-tab-" + next)?.focus();
              }
            }}
            onClick={() => setTab(item)}
          >
            {item === "circles"
              ? t("Cercles", "Circles")
              : t("Amis", "Friends")}
          </button>
        ))}
      </div>
      {tab === "circles" ? (
        <div
          role="tabpanel"
          id="social-panel-circles"
          aria-labelledby="social-tab-circles"
        >
          <PrivateCircles
            key={circleVersion}
            locale={locale}
            onBack={onBack}
            onChanged={onChanged}
            embedded
            onInvite={(circle) => openInvite("circle", circle)}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="social-panel-friends"
          aria-labelledby="social-tab-friends"
        >
          <div className="social-section-head">
            <h2>{t("Mes amis", "My friends")}</h2>
            <button onClick={() => openInvite("friend")}>
              <AccountIcon name="users" />
              {t("Inviter un ami", "Invite a friend")}
            </button>
          </div>
          {!loading && !loadError && !data.friends.length && (
            <p>
              {t(
                "Ta liste commence par une invitation. Ajoute un proche par e-mail ou partage un lien.",
                "Start with an invitation. Add someone by email or share a link.",
              )}
            </p>
          )}
          <div className="social-list">
            {data.friends.map((friend) => (
              <article className="social-panel" key={friend.id}>
                <strong>{friend.name}</strong>
                <div className="social-buttons">
                  {onDuo && (
                    <button onClick={onDuo}>
                      {t("Créer un Duo", "Create a Duo")}
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            "Retirer " + friend.name + " de tes amis ?",
                            "Remove " + friend.name + " from your friends?",
                          ),
                        )
                      )
                        void run(() => removeFriend(friend.id));
                    }}
                  >
                    {t("Retirer", "Remove")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {target && (
        <div
          className="social-panel social-composer"
          ref={composer}
          tabIndex={-1}
        >
          <div className="social-section-head">
            <h2>
              {target.kind === "friend"
                ? t("Inviter un ami", "Invite a friend")
                : t("Inviter dans ", "Invite to ") + target.circle?.name}
            </h2>
            <button disabled={busy} onClick={() => setTarget(null)}>
              {t("Fermer", "Close")}
            </button>
          </div>
          <div className="social-buttons">
            <button
              aria-pressed={channel === "email"}
              disabled={busy || !!link}
              onClick={() => setChannel("email")}
            >
              {t("Par e-mail", "By email")}
            </button>
            <button
              aria-pressed={channel === "link"}
              disabled={busy || !!link}
              onClick={() => setChannel("link")}
            >
              {t("Par lien", "By link")}
            </button>
          </div>
          <form onSubmit={submit}>
            {channel === "email" && (
              <label>
                {t("Adresse e-mail", "Email address")}
                <input
                  type="email"
                  autoComplete="off"
                  required
                  maxLength={254}
                  value={email}
                  disabled={busy || !!link}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    request.current = crypto.randomUUID();
                  }}
                />
              </label>
            )}
            <p>
              {channel === "email"
                ? t(
                    "L’invitation sera réservée au compte utilisant cette adresse.",
                    "Only the account using this email can accept.",
                  )
                : t(
                    "Toute personne disposant du lien peut l’accepter. Le lien est à usage unique.",
                    "Anyone with this link can accept it. The link is single-use.",
                  )}
            </p>
            {!link && (
              <button className="primary" disabled={busy}>
                {busy
                  ? t("Préparation…", "Preparing…")
                  : channel === "email"
                    ? t("Envoyer l’invitation", "Send invitation")
                    : t("Créer le lien", "Create link")}
              </button>
            )}
          </form>
        </div>
      )}
      {link && (
        <div className="social-panel">
          <label>
            {t("Lien d’invitation", "Invitation link")}
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
          <button onClick={() => void share(link)}>
            {t("Partager ou copier le lien", "Share or copy link")}
          </button>
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section
        className="social-invitations"
        aria-labelledby="invitations-title"
      >
        <div className="social-section-head">
          <h2 id="invitations-title">{t("Invitations", "Invitations")}</h2>
          <button disabled={loading || busy} onClick={() => void refresh()}>
            {t("Actualiser", "Refresh")}
          </button>
        </div>
        {loading && <p role="status">{t("Chargement…", "Loading…")}</p>}
        {loadError && (
          <p role="alert">
            {t(
              "Impossible de charger les invitations. Réessaie avec Actualiser.",
              "Could not load invitations. Try Refresh.",
            )}
          </p>
        )}
        {!loading && !loadError && !data.invitations.length && (
          <p>
            {t(
              "Tes invitations envoyées et reçues apparaîtront ici.",
              "Sent and received invitations will appear here.",
            )}
          </p>
        )}
        <div className="social-list">
          {data.invitations.map((inv) => (
            <article key={inv.id} className="social-panel">
              <div>
                <strong>
                  {inv.kind === "circle"
                    ? inv.circleName
                    : t("Demande d’ami", "Friend request")}
                </strong>
                <p>
                  {inv.outgoing
                    ? (inv.email ?? t("Invitation par lien", "Link invitation"))
                    : t("De ", "From ") + inv.senderName}
                </p>
                <small>
                  {statuses[inv.status]} ·{" "}
                  {new Date(inv.createdAt).toLocaleDateString(locale)}
                </small>
                {inv.outgoing && inv.email && (
                  <p className="social-delivery">
                    {inv.delivery === "sent"
                      ? t("E-mail envoyé", "Email sent")
                      : inv.delivery === "sending"
                        ? t(
                            "Envoi en cours ou à vérifier",
                            "Sending or awaiting confirmation",
                          )
                        : t("E-mail non envoyé", "Email not sent")}
                  </p>
                )}
              </div>
              {inv.status === "pending" && (
                <div className="social-buttons">
                  {inv.outgoing ? (
                    <>
                      {inv.token && (
                        <button
                          onClick={() => void share(invitationLink(inv.token!))}
                        >
                          {t("Partager le lien", "Share link")}
                        </button>
                      )}
                      {inv.email && (
                        <button
                          disabled={busy}
                          onClick={() => void run(() => mail(inv.id))}
                        >
                          {inv.delivery === "sent"
                            ? t("Renvoyer", "Resend")
                            : t("Réessayer l’envoi", "Retry email")}
                        </button>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => void run(() => cancelInvitation(inv.id))}
                      >
                        {t("Annuler", "Cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      {inv.token && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(() => respond(inv.token!, true))
                            }
                          >
                            {t("Accepter", "Accept")}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(() => respond(inv.token!, false))
                            }
                          >
                            {t("Refuser", "Decline")}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
