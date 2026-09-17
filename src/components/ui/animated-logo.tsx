import "../../styles/animated-logo.css";

/** The approved two-piece icon animation; decorative beside the game's text. */
export function AnimatedLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`animated-logo${compact ? " animated-logo--quick" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 320" focusable="false">
        <g className="animated-logo__assembly">
          <path
            className="animated-logo__navy"
            d="M35 44 Q35 20 59 20 H109 C185 20 229 82 229 161 C229 245 176 300 111 300 H60 Q35 300 35 273 Z"
          />
          <path
            className="animated-logo__coral"
            d="M145 166 C145 114 182 71 231 71 C287 71 320 115 320 174 C320 251 265 300 187 300 H115 Q145 300 145 271 Z"
          />
        </g>
      </svg>
    </span>
  );
}
