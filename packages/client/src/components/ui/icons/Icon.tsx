/**
 * `<Icon name="…" label="…">` — the one way the client draws an icon.
 *
 * ⭐ The word is not optional. Every icon is a claim, and the label is
 * both its accessible name and its tooltip (a real one — tooltips W7), so the meaning survives a
 * missing or unfamiliar glyph (iconography-slate § 4.3).
 *
 * ⚠ Colour goes through CSS, never the `color` prop: Lucide writes that
 * into the SVG's `stroke=` attribute, where a `var()` token silently
 * paints nothing. The stroke stays `currentColor` and the CSS colour
 * feeds it.
 */

import React from "react";
import { FALLBACK_ICON, ICONS, type IconName } from "./iconMap";
import { Tip } from "../../tooltip/Tip";

export interface IconProps {
  /** A name in our vocabulary. An unmapped one draws the fallback glyph. */
  name: IconName | (string & Record<never, never>);
  /** The word for it — accessible name and tooltip. */
  label: string;
  size?: number;
  /** A CSS colour (a token); default inherits. */
  color?: string;
  /** Decorative beside its own visible word: hidden from the a11y tree. */
  decorative?: boolean;
  style?: React.CSSProperties;
  /** `data-*` hooks for tests and styling (e.g. `{ testid: "kind-mark" }`). */
  data?: Record<string, string>;
}

export function Icon({ name, label, size = 16, color, decorative, style, data }: IconProps): React.ReactElement {
  const mapped = (ICONS as Record<string, (typeof ICONS)[IconName]>)[name];
  const Glyph = mapped ?? FALLBACK_ICON;
  const glyph = (
    <Glyph
      {...Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]))}
      data-icon={name}
      {...(mapped ? {} : { "data-icon-fallback": "true" })}
      size={size}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label })}
      style={{ flex: "none", ...(color ? { color } : {}), ...style }}
    />
  );
  // ⭐ The label is the accessible name always, and — for an icon that
  // stands alone — its tooltip (tooltips W7; never a native SVG title element).
  return decorative ? glyph : <Tip tip={{ header: { name: label } }}>{glyph}</Tip>;
}
