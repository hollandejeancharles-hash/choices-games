import { archetypes } from "../data/archetypes";
import type { Locale } from "../core/types";
import "../styles/community.css";

export function Gallery({
  locale,
  onBack,
  onPlay,
}: {
  locale: Locale;
  onBack: () => void;
  onPlay: () => void;
}) {
  const fr = locale === "fr";
  return (
    <section className="gallery page-in">
      <button className="text-button" onClick={onBack}>
        ← {fr ? "Accueil" : "Home"}
      </button>
      <span className="eyebrow">
        {fr ? "DIX FAÇONS DE FAIRE FACE AU CHOIX" : "TEN WAYS TO FACE A CHOICE"}
      </span>
      <h1>
        {fr
          ? "Des personnages. Toutes tes nuances."
          : "Meet the characters. Explore your nuances."}
      </h1>
      <p className="lead">
        {fr
          ? "Découvre les dix portraits de Dilemme. Aucun n’est meilleur qu’un autre : chaque personnage raconte une façon d’arbitrer entre des valeurs qui comptent."
          : "Discover Dilemma’s ten portraits. None is better than another: each character reflects a way of weighing values that matter."}
      </p>
      <div className="character-grid">
        {archetypes.map((character, index) => (
          <article
            className={`character-card character-tone-${index % 5}`}
            key={character.id}
          >
            <img
              src={`./avatars/${character.id}.png`}
              alt=""
              width={240}
              height={240}
              loading="lazy"
              decoding="async"
            />
            <span className="eyebrow">
              {String(index + 1).padStart(2, "0")} / 10
            </span>
            <h2>{character.name[locale]}</h2>
            <p>{character.description[locale]}</p>
          </article>
        ))}
      </div>
      <div className="gallery-end">
        <p>
          {fr
            ? "Et toi, quel portrait tes choix dessineront-ils ?"
            : "Which portrait will your choices reveal?"}
        </p>
        <button className="primary" onClick={onPlay}>
          {fr ? "Découvrir mon portrait" : "Discover my portrait"}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
