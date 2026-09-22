import { useState, type ReactNode } from "react";
import type { Locale, Localized } from "../../core/types";
import "../../styles/testimonials.css";

const reviews: { name: string; context: Localized; body: Localized }[] = [
  {
    name: "Camille",
    context: { fr: "Le choix impossible", en: "The impossible choice" },
    body: {
      fr: "Sauver 3 000 personnes en condamnant un innocent… J’avais une réponse. Puis j’ai imaginé être à sa place.",
      en: "Save 3,000 people by condemning someone innocent… I had an answer. Then I imagined being in their shoes.",
    },
  },
  {
    name: "Alex",
    context: { fr: "Entre amis", en: "With friends" },
    body: {
      fr: "On a choisi la même réponse, mais pour des raisons complètement opposées. C’est là que le débat a commencé.",
      en: "We picked the same answer for completely different reasons. That’s when the real conversation started.",
    },
  },
  {
    name: "Sam",
    context: { fr: "Face à soi-même", en: "A moment of reflection" },
    body: {
      fr: "Je pensais toujours choisir la justice. Jusqu’au dilemme où protéger un proche voulait dire trahir mes principes.",
      en: "I thought I’d always choose justice. Until protecting someone I loved meant betraying my principles.",
    },
  },
  {
    name: "Lou",
    context: { fr: "Le portrait final", en: "The final profile" },
    body: {
      fr: "Mon profil m’a surtout donné envie de revenir sur mes choix. Pourquoi j’accepte un sacrifice ici, mais pas là ?",
      en: "My profile made me want to revisit my choices. Why would I accept a sacrifice in one situation but not another?",
    },
  },
  {
    name: "Charlie",
    context: { fr: "Une soirée à six", en: "An evening with six friends" },
    body: {
      fr: "On croyait bien se connaître. Il a suffi d’un choix entre loyauté et vérité pour remettre ça en question.",
      en: "We thought we knew each other well. One choice between loyalty and truth was enough to make us think again.",
    },
  },
  {
    name: "Robin",
    context: { fr: "Encore une question", en: "Just one more question" },
    body: {
      fr: "Le plus dur, ce n’est pas de cliquer. C’est d’expliquer ensuite pourquoi on pourrait vivre avec cette décision.",
      en: "Clicking isn’t the hard part. It’s explaining afterwards why you could live with that decision.",
    },
  },
];

export function Marquee({
  children,
  reverse = false,
}: {
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`review-marquee${reverse ? " review-marquee--reverse" : ""}`}
    >
      {[0, 1].map((copy) => (
        <div
          className="review-track"
          key={copy}
          aria-hidden={copy === 1 ? true : undefined}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export function Testimonials({ locale }: { locale: Locale }) {
  const [paused, setPaused] = useState(false);
  const fr = locale === "fr";
  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="testimonials-intro">
        <span className="eyebrow">
          {fr
            ? "LE CHOIX N’EST QUE LE DÉBUT"
            : "THE CHOICE IS JUST THE BEGINNING"}
        </span>
        <h2 id="testimonials-title">
          {fr
            ? "Deux options. Mille conversations."
            : "Two options. A thousand conversations."}
        </h2>
        <p>
          {fr
            ? "Des décisions qui bousculent, des raisons qui surprennent. Et toi, comment défendrais-tu ton choix ?"
            : "Decisions that challenge you. Reasons you didn’t expect. How would you defend your choice?"}
        </p>
        <button
          className="text-button testimonials-pause"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused
            ? fr
              ? "Reprendre le défilement"
              : "Resume scrolling"
            : fr
              ? "Mettre en pause"
              : "Pause scrolling"}
        </button>
      </div>
      <div className="testimonials-stage" data-paused={paused}>
        <div className="testimonials-tilt">
          {[0, 1, 2].map((column) => (
            <Marquee key={column} reverse={column === 1}>
              {reviews
                .slice(column * 2, column * 2 + 2)
                .map((review, index) => (
                  <figure
                    className={`review-card review-color-${column * 2 + index}`}
                    key={review.name}
                  >
                    <figcaption>
                      <span className="review-avatar" aria-hidden="true">
                        {review.name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{review.name}</strong>
                        <small>{review.context[locale]}</small>
                      </span>
                    </figcaption>
                    <blockquote>{review.body[locale]}</blockquote>
                  </figure>
                ))}
            </Marquee>
          ))}
        </div>
      </div>
    </section>
  );
}
