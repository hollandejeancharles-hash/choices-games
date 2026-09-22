import { useEffect, useState } from "react";
import type { Locale } from "../core/types";
import {
  disableDailyPush,
  enableDailyPush,
  readPushPreference,
  type PushPreference as State,
} from "../services/push-notifications";

export function PushPreference({
  locale,
  contextual = false,
}: {
  locale: Locale;
  contextual?: boolean;
}) {
  const fr = locale === "fr";
  const copy = (a: string, b: string) => (fr ? a : b);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void readPushPreference()
      .then(setState)
      .catch(() => setState(null));
  }, []);
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      setState(
        state?.enabled ? await disableDailyPush() : await enableDailyPush(),
      );
    } catch {
      setError(
        copy(
          "Impossible de modifier les notifications.",
          "Could not change notifications.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  if (state?.availability === "ios-install-required")
    return (
      <div className={contextual ? "push-prompt" : "c-settingrow"}>
        <div>
          <h3>{copy("Reçois le prochain dilemme", "Get the next dilemma")}</h3>
          <p>
            {copy(
              "Sur iPhone ou iPad, touche Partager puis « Sur l’écran d’accueil ». Ouvre ensuite Dilemme depuis son icône pour activer les notifications.",
              "On iPhone or iPad, tap Share, then “Add to Home Screen”. Open Dilemme from its icon to enable notifications.",
            )}
          </p>
        </div>
      </div>
    );
  if (state?.availability === "unsupported") return null;
  return (
    <div className={contextual ? "push-prompt" : "c-settingrow"}>
      <div>
        <h3>
          {contextual
            ? copy(
                "Reçois le prochain dilemme du jour",
                "Get tomorrow’s daily dilemma",
              )
            : copy("Dilemme du jour", "Daily dilemma")}
        </h3>
        <p>
          {state?.permission === "denied"
            ? copy(
                "Les notifications sont bloquées dans les réglages de ton navigateur.",
                "Notifications are blocked in your browser settings.",
              )
            : copy(
                "Une notification quotidienne à 18 h, uniquement si tu n’as pas encore répondu.",
                "One daily notification at 6 PM, only if you have not answered yet.",
              )}
        </p>
        {error && <small className="form-error">{error}</small>}
      </div>
      <button
        className={state?.enabled ? "c-button" : "c-button c-primary"}
        disabled={busy || state?.permission === "denied"}
        onClick={() => void toggle()}
      >
        {busy
          ? copy("Enregistrement…", "Saving…")
          : state?.enabled
            ? copy("Désactiver", "Disable")
            : copy("Me prévenir", "Notify me")}
      </button>
    </div>
  );
}
