/**
 * KindMark — what class of thing a card is about, at a glance: an icon
 * in the kind's colour.
 *
 * ⭐ The colours are the design's (`docs/design/client-surface/`):
 * location teal, agent blue, thing brass, idea violet — `tokens.kind`,
 * so every theme carries them. The ICONS come from the one icon map
 * (`ui/icons`, keys `kind.<branch>`) — Lucide placeholders until the four
 * branch marks are drawn (`docs/slates/builds/iconography-slate.md`).
 */

import React from "react";
import type { StuffKind } from "@saxonberg/types";
import { Icon, tokens } from "../ui";

export const KIND_COLOR: Readonly<Record<StuffKind, string>> = tokens.kind;

const KIND_NAME: Readonly<Record<StuffKind, string>> = {
  location: "a place",
  agent: "someone",
  thing: "a thing",
  idea: "an idea",
};

export function KindMark({ kind, size = 16 }: { kind: StuffKind; size?: number }): React.ReactElement {
  return (
    <Icon
      name={`kind.${kind}`}
      label={KIND_NAME[kind]}
      size={size}
      color={KIND_COLOR[kind]}
      style={{ alignSelf: "center" }}
      data={{ testid: "kind-mark", kind }}
    />
  );
}
