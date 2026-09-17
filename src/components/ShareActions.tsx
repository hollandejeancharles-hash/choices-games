import { useState } from "react";
import type { Locale } from "../core/types";
import type { Portrait } from "./Profile";
import { resultUrl } from "../services/share";
import { downloadPortrait } from "../services/export";
import { copy } from "../i18n";
export function ShareActions({
  portrait,
  locale,
  onReplay,
}: {
  portrait: Portrait;
  locale: Locale;
  onReplay: () => void;
}) {
  const [status, setStatus] = useState<
      "copied" | "downloaded" | "shareError" | "exportError" | null
    >(null),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false);
  const t = copy[locale];
  async function share() {
    const url = resultUrl({
      profile: portrait.profile,
      locale,
      length: portrait.length,
    });
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setLink("");
    } catch {
      setStatus("shareError");
      setLink(url);
    }
  }
  async function download() {
    setBusy(true);
    try {
      await downloadPortrait(portrait.profile, locale);
      setStatus("downloaded");
      setLink("");
    } catch {
      setStatus("exportError");
      setLink("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="profile-actions">
        <button className="primary" onClick={share}>
          {t.share}
          <span>↗</span>
        </button>
        <button className="secondary-button" disabled={busy} onClick={download}>
          {busy ? t.loading : t.download} ↓
        </button>
        <button className="text-button" onClick={onReplay}>
          {t.replay} ↻
        </button>
      </div>
      <div role="status" className="share-feedback">
        {status && t[status]}
      </div>
      {link && (
        <input
          className="share-link"
          aria-label={t.share}
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      <p className="fine-print">
        {locale === "fr"
          ? "Le lien contient uniquement le portrait et ses nuances, sans prénom ni réponses détaillées. Il est lisible et modifiable : aucun résultat n’est certifié."
          : "The link contains only the portrait and its nuances, with no name or individual answers. It is readable and editable: results are not certified."}
      </p>
    </>
  );
}
