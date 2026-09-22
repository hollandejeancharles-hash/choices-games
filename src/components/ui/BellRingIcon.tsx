import type { HTMLAttributes } from "react";

// Bell Ring — AnimateIcons / Lucide
// Author: Avijit Dey (@avijit07x)
// License: MIT — https://github.com/Avijit07x/animateicons
export function BellRingIcon({
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`bell-ring-icon ${className}`.trim()}
      aria-hidden="true"
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="bell-ring-body">
          <path className="bell-ring-clapper" d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path
            className="bell-ring-wave bell-ring-wave-right"
            d="M22 8c0-2.3-.8-4.3-2-6"
          />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
          <path
            className="bell-ring-wave bell-ring-wave-left"
            d="M4 2C2.8 3.7 2 5.7 2 8"
          />
        </g>
      </svg>
    </span>
  );
}
