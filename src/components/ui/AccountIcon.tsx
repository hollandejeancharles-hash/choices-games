import { Fragment, type CSSProperties } from "react";
import { accountIconPaths } from "./account-icon-paths";

export type AccountIconName = keyof typeof accountIconPaths;

/** Supplied icon paths with native CSS motion, shared by hover and keyboard focus.
 * Fingerprint: dmytro (@pqoqubbw), MIT.
 * Dashboard01 / Swords / SlidersHorizontal / Ticket: Avijit Dey, MIT.
 * Account: supplied by the project owner; corrected SVG nesting.
 * See docs/account-icons-LICENSE.txt. No additional animation runtime required.
 */
export function AccountIcon({
  name,
  size = 22,
}: {
  name: AccountIconName;
  size?: number;
}) {
  return (
    <span
      className="c-icon"
      data-icon={name}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        {accountIconPaths[name].map((d, i) => (
          <Fragment key={d}>
            {name === "fingerprint" && <path d={d} opacity=".25" />}
            <path
              d={d}
              pathLength={1}
              className={
                name === "dashboard"
                  ? undefined
                  : name === "sliders" && i >= 6
                    ? i === 7
                      ? "c-knob-reverse"
                      : "c-knob"
                    : "c-draw"
              }
              style={
                {
                  "--i": name === "ticket" && i > 0 ? i + 4 : i,
                } as CSSProperties
              }
            />
          </Fragment>
        ))}
      </svg>
    </span>
  );
}
