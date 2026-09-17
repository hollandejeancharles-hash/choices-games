import type { ComponentPropsWithoutRef, ReactNode } from "react";
import "../../styles/aurora.css";

export interface AuroraBackgroundProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  enabled?: boolean;
  showRadialGradient?: boolean;
}

/** Decorative adaptation of the supplied AuroraBackground for Dilemme.
 * Uses the existing palette and data-theme instead of Tailwind v3 color plugins.
 * No extra main landmark, fixed viewport height, or pointer interception.
 */
export function AuroraBackground({
  children,
  className = "",
  enabled = true,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div {...props} className={`aurora-background ${className}`}>
      {enabled && (
        <div
          className={`aurora-background__veil${showRadialGradient ? " aurora-background__veil--masked" : ""}`}
          aria-hidden="true"
        >
          <div className="aurora-background__ribbons" />
        </div>
      )}
      <div className="aurora-background__content">{children}</div>
    </div>
  );
}
