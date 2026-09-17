import type { ComponentPropsWithoutRef } from "react";
import "../../styles/glow.css";

/** Palette-aware adaptation of the supplied GlowButton, using native CSS motion. */
export function GlowButton({
  children,
  className = "",
  disabled,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <span className="glow-button" data-disabled={disabled || undefined}>
      <span className="glow-button__halo" aria-hidden="true" />
      <button {...props} disabled={disabled} className={`primary ${className}`}>
        {children}
      </button>
    </span>
  );
}
