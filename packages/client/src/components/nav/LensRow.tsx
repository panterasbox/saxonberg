/**
 * LensRow — four toggles under the map (navigation card D11), each a lens
 * on its own drawing channel, so all four read at once: the frontier owns
 * the stub's end mark, the route the line overlay, refusals the edge's
 * midpoint ring, boundaries the cell border. Which are on is remembered
 * in `nav.card`.
 */

import React from "react";
import styled from "styled-components";
import type { TooltipDoc } from "@saxonberg/types";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import { LENSES, type LensName } from "./ZoneMap";

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  font-size: ${tokens.font.micro};
`;

const Toggle = styled.button<{ $on: boolean }>`
  font: inherit;
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$on ? tokens.color.accent : tokens.color.border)};
  background: ${(p) => (p.$on ? tokens.color.accentWash : "transparent")};
  color: ${(p) => (p.$on ? tokens.color.fg : tokens.color.fgMuted)};
  cursor: pointer;
`;

export const LENS_LABEL: Record<LensName, string> = {
  frontier: "frontier",
  route: "route",
  refusals: "refusals",
  boundaries: "boundaries",
};

export interface LensRowProps {
  on: ReadonlySet<LensName>;
  onToggle: (lens: LensName, on: boolean) => void;
  tipFor: (lens: LensName) => TooltipDoc;
}

export function LensRow({ on, onToggle, tipFor }: LensRowProps): React.ReactElement {
  return (
    <Row role="group" aria-label="map lenses" data-testid="nav-lenses">
      {LENSES.map((l) => (
        <Tip key={l} tip={tipFor(l)}>
          <Toggle
            type="button"
            $on={on.has(l)}
            aria-pressed={on.has(l)}
            data-testid={`nav-lens-${l}`}
            onClick={() => onToggle(l, !on.has(l))}
          >
            {LENS_LABEL[l]}
          </Toggle>
        </Tip>
      ))}
    </Row>
  );
}
