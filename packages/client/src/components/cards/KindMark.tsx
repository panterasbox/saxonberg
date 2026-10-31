/**
 * KindMark — what class of thing a card is about, at a glance: an icon
 * in the kind's colour.
 *
 * ⭐ The colours are the design's (`docs/design/client-surface/`):
 * location teal, agent blue, thing brass, idea violet — `tokens.kind`,
 * so every theme carries them. The ICONS are
 * placeholders from Lucide (ISC) until the four branch marks are drawn
 * — see `docs/slates/builds/iconography-slate.md`, which names Lucide
 * the default-correct set for exactly this tier.
 */

import React from "react";
import { Box, Lightbulb, MapPin, User, type LucideIcon } from "lucide-react";
import type { StuffKind } from "@saxonberg/types";
import { tokens } from "../ui";

export const KIND_COLOR: Readonly<Record<StuffKind, string>> = tokens.kind;

const KIND_ICON: Readonly<Record<StuffKind, LucideIcon>> = {
  location: MapPin,
  agent: User,
  thing: Box,
  idea: Lightbulb,
};

const KIND_NAME: Readonly<Record<StuffKind, string>> = {
  location: "a place",
  agent: "someone",
  thing: "a thing",
  idea: "an idea",
};

export function KindMark({ kind, size = 16 }: { kind: StuffKind; size?: number }): React.ReactElement {
  const Icon = KIND_ICON[kind];
  return (
    <Icon
      data-testid="kind-mark"
      data-kind={kind}
      aria-label={KIND_NAME[kind]}
      role="img"
      size={size}
      // ⚠ Through CSS, never the `color` prop: Lucide writes that into the
      // SVG's `stroke=` attribute, where a `var()` token silently paints
      // nothing (the iconography slate's `fill:` vs `fill=` rule). The
      // stroke stays `currentColor` and this CSS colour feeds it.
      style={{ flex: "none", alignSelf: "center", color: KIND_COLOR[kind] }}
    />
  );
}
