import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Locale } from "../core/types";
import {
  circleHistory,
  createCircle,
  joinCircle,
  listCircles,
  type Circle,
  type CircleDuel,
} from "../services/player-features";

export function PrivateCircles({
  locale,
  onBack,
  onChanged,
}: {
  locale: Locale;
  onBack: () => void;
  onChanged?: (circles: Circle[]) => void;
}) {
  const fr = locale === "fr";
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selected, setSelected] = useState<Circle | null>(null);
  const [history, setHistory] = useState<CircleDuel[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function refresh() {
    const next = await listCircles();
    setCircles(next);
    onChanged?.(next);
  }
  useEffect(() => {
    void refresh().catch(() =>
      setError(
        fr
          ? "Connecte-toi pour voir tes cercles."
          : "Sign in to view your circles.",
      ),
    );
  }, [fr]);
  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: "create" | "join",
  ) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(form);
    try {
      if (action === "create") {
        const code = await createCircle(String(data.get("name")));
        setMessage(`${fr ? "Cercle créé" : "Circle created"} · ${code}`);
      } else {
        await joinCircle(String(data.get("code")));
        setMessage(fr ? "Cercle rejoint." : "Circle joined.");
      }
      form.reset();
      await refresh();
    } catch {
      setError(
        fr
          ? "Impossible de modifier tes cercles."
          : "Could not update your circles.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function open(circle: Circle) {
    setSelected(circle);
    try {
      setHistory(await circleHistory(circle.id));
    } catch {
      setHistory([]);
    }
  }
  return (
    <section className="circles-page page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Retour" : "Back"}
      </button>
      <span className="eyebrow">
        {fr ? "Cercles privés" : "Private circles"}
      </span>
      <h1>
        {fr ? "Retrouve les mêmes personnes." : "Come back to the same people."}
      </h1>
      <p>
        {fr
          ? "Un cercle conserve le nombre de membres et l’historique de vos duos, jamais vos réponses détaillées."
          : "A circle keeps its member count and duo history, never your detailed answers."}
      </p>
      <div className="circle-actions">
        <form onSubmit={(event) => void submit(event, "create")}>
          <label>
            {fr ? "Nom du cercle" : "Circle name"}
            <input name="name" minLength={2} maxLength={40} required />
          </label>
          <button disabled={busy}>{fr ? "Créer" : "Create"}</button>
        </form>
        <form onSubmit={(event) => void submit(event, "join")}>
          <label>
            {fr ? "Code d’invitation" : "Invite code"}
            <input name="code" minLength={8} maxLength={8} required />
          </label>
          <button disabled={busy}>{fr ? "Rejoindre" : "Join"}</button>
        </form>
      </div>
      {message && <p className="notice">{message}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="circle-list">
        {circles.map((circle) => (
          <button key={circle.id} onClick={() => void open(circle)}>
            <strong>{circle.name}</strong>
            <span>
              {circle.members} {fr ? "membres" : "members"} · {circle.duels}{" "}
              duos
            </span>
            <code>{circle.code}</code>
          </button>
        ))}
      </div>
      {selected && (
        <div className="circle-history">
          <h2>{selected.name}</h2>
          {history.length ? (
            history.map((duel) => (
              <p key={duel.code}>
                <strong>{duel.agreements}/5</strong>{" "}
                {fr ? "accords" : "agreements"} ·{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(new Date(duel.completedAt))}
              </p>
            ))
          ) : (
            <p>
              {fr
                ? "Aucun duo terminé dans ce cercle."
                : "No completed duo in this circle."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
