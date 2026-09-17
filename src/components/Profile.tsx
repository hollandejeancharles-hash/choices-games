import { useEffect, useRef, useState, useId } from "react";
import { fictionReferences } from "../data/fiction";
import { BonusPortraits } from "./BonusPortraits";
import type { Locale, Profile as ProfileData } from "../core/types";
import { AXES } from "../core/types";
import { rankArchetypes } from "../core/engine";
import { archetypes, axisCopy } from "../data/archetypes";
import { copy } from "../i18n";
export interface Portrait {
  profile: ProfileData;
  name: string;
  length: number;
}
export function radarPoint(
  index: number,
  ratio: number,
  cx = 180,
  cy = 165,
  radius = 112,
): [number, number] {
  const angle = (index * Math.PI) / 3 - Math.PI / 2;
  return [
    cx + Math.cos(angle) * radius * ratio,
    cy + Math.sin(angle) * radius * ratio,
  ];
}
export function Radar({
  profile,
  locale,
}: {
  profile: ProfileData;
  locale: Locale;
}) {
  const t = copy[locale];
  const points = (ratio: number) =>
    AXES.map((_, i) => radarPoint(i, ratio).join(",")).join(" ");
  return (
    <svg
      viewBox="0 0 360 330"
      className="radar"
      role="img"
      aria-label={`${t.radar}. ${AXES.map((axis) => `${axisCopy[axis].negative[locale]} / ${axisCopy[axis].positive[locale]}: ${profile.axes[axis].count ? Math.round(profile.vector[axis]) : t.unmeasured}`).join("; ")}`}
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          points={points(r)}
          fill="none"
          stroke="currentColor"
          opacity={r === 0.5 ? 0.5 : 0.18}
          strokeDasharray={r === 0.5 ? "4 4" : undefined}
        />
      ))}
      {AXES.map((axis, i) => {
        const [x, y] = radarPoint(i, 1);
        return (
          <line
            key={axis}
            x1="180"
            y1="165"
            x2={x}
            y2={y}
            stroke="currentColor"
            opacity=".15"
          />
        );
      })}
      <polygon
        points={AXES.map((axis, i) =>
          radarPoint(i, (profile.vector[axis] + 100) / 200).join(","),
        ).join(" ")}
        fill="var(--accent)"
        fillOpacity=".19"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      {AXES.map((axis, i) => {
        const [x, y] = radarPoint(i, (profile.vector[axis] + 100) / 200);
        const [lx, ly] = radarPoint(i, 1.24);
        return (
          <g key={axis}>
            <circle
              cx={x}
              cy={y}
              r="3"
              fill={profile.axes[axis].count ? "var(--accent)" : "var(--muted)"}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="currentColor"
            >
              {axisCopy[axis].positive[locale]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function ProfileView({
  portrait,
  locale,
  children,
}: {
  portrait: Portrait;
  locale: Locale;
  children?: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const [tab, setTab] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const revealButton = useRef<HTMLButtonElement>(null);
  const uid = useId();
  useEffect(() => {
    if (!revealed) {
      revealButton.current?.focus({ preventScroll: true });
      return;
    }
    const timer = setTimeout(
      () => heading.current?.focus({ preventScroll: true }),
      1050,
    );
    return () => clearTimeout(timer);
  }, [revealed]);
  const { profile, name, length } = portrait,
    t = copy[locale];
  const ranking = rankArchetypes(profile.vector, archetypes),
    primary = ranking[0]!,
    secondary = ranking[1]!;
  const dominant = [...AXES]
    .filter((axis) => profile.axes[axis].count > 0)
    .sort((a, b) => Math.abs(profile.vector[b]) - Math.abs(profile.vector[a]))
    .slice(0, 3);
  const nuanced = [
    ...new Set([
      ...profile.contradictions,
      ...AXES.filter((axis) => profile.axes[axis].conflicted),
    ]),
  ];
  const fiction = fictionReferences[primary.archetype.id];
  const tabs =
    locale === "fr"
      ? ["Ton portrait", "Tes nuances", "Ton dark side"]
      : ["Your portrait", "Your nuances", "Your dark side"];
  return (
    <section
      className={`profile-page portrait-redesign ${revealed ? "portrait-revealed" : ""}`}
    >
      <div
        className="portrait-reveal-stage"
        inert={revealed}
        aria-hidden={revealed}
      >
        <div className="portrait-reveal-cluster">
          <button
            ref={revealButton}
            className="portrait-reveal-orb"
            onClick={() => setRevealed(true)}
            aria-label={`${locale === "fr" ? "Ouvrir le portrait" : "Open the portrait"} : ${primary.archetype.name[locale]}`}
          >
            <span className="portrait-orb-inner">
              <img src={`./avatars/${primary.archetype.id}.png`} alt="" />
              <strong>{primary.archetype.name[locale]}</strong>
            </span>
          </button>
          <p>
            {name && <strong>{name} · </strong>}
            {locale === "fr"
              ? "Ton portrait se cache ici."
              : "Your portrait is waiting here."}{" "}
            <span aria-hidden="true">↗</span>
          </p>
        </div>
      </div>
      <div
        className="portrait-content"
        inert={!revealed}
        aria-hidden={!revealed}
      >
        <div className="portrait-topline">
          <span className="eyebrow">
            {t.result}
            {name && ` · ${name}`}
          </span>
          <button
            className="portrait-replay"
            onClick={() => {
              setRevealed(false);
              window.scrollTo({ top: 0 });
            }}
          >
            {locale === "fr" ? "↺ Revoir la révélation" : "↺ Replay the reveal"}
          </button>
        </div>
        <div className="profile-heading">
          <span className="eyebrow">
            {t.result}
            {name && ` · ${name}`}
          </span>
          <div className="profile-title">
            <div>
              <h1 ref={heading} tabIndex={-1}>
                {primary.archetype.name[locale]}
                <span>.</span>
              </h1>
              <p className="secondary-archetype">
                {t.nuance} <strong>{secondary.archetype.name[locale]}</strong>
              </p>
            </div>
            <img
              className="portrait-chibi"
              src={`./avatars/${primary.archetype.id}.png`}
              alt={`${locale === "fr" ? "Avatar chibi" : "Chibi avatar"} · ${primary.archetype.name[locale]}`}
              width={240}
              height={240}
            />
          </div>
          <p className="profile-description">
            {primary.archetype.description[locale]}
          </p>
        </div>
        <div
          className="portrait-tabs"
          role="tablist"
          aria-label={
            locale === "fr" ? "Explorer le portrait" : "Explore the portrait"
          }
        >
          {tabs.map((label, i) => (
            <button
              key={label}
              role="tab"
              id={`${uid}-tab-${i}`}
              aria-controls={`${uid}-panel-${i}`}
              aria-selected={tab === i}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                let next: number | undefined;
                if (e.key === "ArrowRight") next = (i + 1) % 3;
                if (e.key === "ArrowLeft") next = (i + 2) % 3;
                if (e.key === "Home") next = 0;
                if (e.key === "End") next = 2;
                if (next !== undefined) {
                  e.preventDefault();
                  setTab(next);
                  document.getElementById(`${uid}-tab-${next}`)?.focus();
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-0`}
          aria-labelledby={`${uid}-tab-0`}
          hidden={tab !== 0}
        >
          <div className="profile-grid">
            <section className="profile-panel radar-panel">
              <span className="eyebrow">01 / {t.radar}</span>
              <Radar profile={profile} locale={locale} />
              <p className="fine-print">{t.radarNote}</p>
              <div className="axis-list">
                {AXES.map((axis) => {
                  const state = profile.axes[axis];
                  return (
                    <div className="axis-row" key={axis}>
                      <div>
                        <span>{axisCopy[axis].negative[locale]}</span>
                        <span>{axisCopy[axis].positive[locale]}</span>
                      </div>
                      <div className="axis-track">
                        <span className="axis-middle" />
                        <span
                          className="axis-position"
                          style={{
                            left: `${(profile.vector[axis] + 100) / 2}%`,
                            opacity: state.count ? 1 : 0.3,
                          }}
                        />
                      </div>
                      <small>
                        {state.count
                          ? `${state.count} ${state.count === 1 ? (locale === "fr" ? "réponse sur cet axe" : "answer on this axis") : t.measured} · ${Math.round(state.score) > 0 ? "+" : ""}${Math.round(state.score)}`
                          : t.unmeasured}
                      </small>
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="profile-text-panels">
              <section className="profile-panel">
                <span className="eyebrow">02 / {t.traits}</span>
                <div className="traits">
                  {dominant.map((axis, i) => {
                    const value = profile.vector[axis],
                      a = axisCopy[axis],
                      neutral = Math.abs(value) < 15;
                    return (
                      <article key={axis}>
                        <span>0{i + 1}</span>
                        <div>
                          <h3>
                            {neutral
                              ? `${a.negative[locale]} / ${a.positive[locale]}`
                              : (value > 0 ? a.positive : a.negative)[locale]}
                          </h3>
                          <p>
                            {
                              (neutral
                                ? a.balanced
                                : value > 0
                                  ? a.high
                                  : a.low)[locale]
                            }
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-1`}
          aria-labelledby={`${uid}-tab-1`}
          hidden={tab !== 1}
        >
          <div className="portrait-nuances">
            <section className="profile-panel">
              <span className="eyebrow">03 / {t.contradictions}</span>
              {nuanced.length ? (
                <>
                  <div className="pills">
                    {nuanced.map((axis) => (
                      <span key={axis}>
                        {axisCopy[axis].negative[locale]} /{" "}
                        {axisCopy[axis].positive[locale]}
                      </span>
                    ))}
                  </div>
                  <p>{t.contradictionsText}</p>
                </>
              ) : (
                <p>{t.contradictionsEmpty}</p>
              )}
            </section>
            <section className="profile-panel">
              <span className="eyebrow">04 / {t.hesitation}</span>
              {profile.hesitations.length ? (
                <>
                  <div className="pills">
                    {profile.hesitations.map((axis) => (
                      <span key={axis}>
                        {axisCopy[axis].negative[locale]} /{" "}
                        {axisCopy[axis].positive[locale]}
                      </span>
                    ))}
                  </div>
                  <p>{t.hesitationText}</p>
                </>
              ) : (
                <p>{t.hesitationEmpty}</p>
              )}
            </section>
            <div className="rarity">
              <strong>
                {primary.fictionalRarity.toLocaleString(locale)} %
              </strong>
              <span>{t.rarity}</span>
            </div>
            <small className="muted">{t.rarityNote}</small>
          </div>
          <BonusPortraits profile={profile} locale={locale} section="values" />
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-2`}
          aria-labelledby={`${uid}-tab-2`}
          hidden={tab !== 2}
          className="portrait-dark-grid"
        >
          <BonusPortraits profile={profile} locale={locale} section="dark" />
          {fiction && (
            <section className="profile-panel fiction-card">
              <span className="eyebrow">
                {locale === "fr"
                  ? "TON DOUBLE DE FICTION"
                  : "YOUR FICTIONAL DOUBLE"}
              </span>
              <h2>{fiction.name}</h2>
              <span className="fiction-universe">
                {fiction.universe[locale]}
              </span>
              <p className="fiction-traits">{fiction.traits[locale]}</p>
              <p>{fiction.resemblance[locale]}</p>
              <div className="fiction-downside">
                <strong>
                  {locale === "fr"
                    ? "Le revers de la médaille"
                    : "The flip side"}
                </strong>
                <p>{fiction.downside[locale]}</p>
              </div>
              <small>
                {locale === "fr"
                  ? "Un clin d’œil à quelques traits du personnage, pas à toute son histoire."
                  : "A playful nod to a few character traits, not their entire story."}
              </small>
            </section>
          )}
        </div>
        <p className="profile-disclaimer">
          {length === 10 && <>{t.few} </>}
          {t.disclaimer}
        </p>
        {children}
      </div>
    </section>
  );
}
