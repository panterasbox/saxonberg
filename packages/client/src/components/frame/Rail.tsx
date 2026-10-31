/**
 * Rail — the mode rail down the left edge, under the top bar.
 *
 * The modes are buttons here, each a real `cockpit mode <m>` (and the
 * status bar previews it on hover); a collapsed panel's cards sit as
 * icons under the modes. Identity, connection, the shelf, Views and
 * Settings are the top bar's (`Frame`) — the rail never repeats them.
 *
 * ⚠ Plain words, not glyphs: a rail of initials is a quiz. The words fit
 * the 3.5rem rail at the label size.
 */

import React from "react";
import styled from "styled-components";
import { COCKPIT_MODES, type CockpitMode } from "@saxonberg/types";
import { tokens } from "../ui";

const Column = styled.nav`
  flex: none;
  width: ${tokens.width.rail}rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.sm} 0;
  background: ${tokens.color.surface};
  border-right: 1px solid ${tokens.color.borderMuted};
  min-height: 0;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  font: inherit;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.label};
  letter-spacing: 0.02em;
  padding: ${tokens.space.sm} 0;
  background: transparent;
  border: none;
  border-left: 2px solid
    ${(p) => (p.$active ? tokens.color.accent : "transparent")};
  color: ${(p) => (p.$active ? tokens.color.accent : tokens.color.fgMuted)};
  cursor: pointer;
  text-align: center;

  &:hover {
    color: ${tokens.color.fgEmphasis};
    background: ${tokens.color.surfaceMuted};
  }
`;

const Divider = styled.div`
  height: 1px;
  margin: ${tokens.space.xs} ${tokens.space.sm};
  background: ${tokens.color.borderMuted};
`;

const PanelIcon = styled.button`
  font: inherit;
  font-size: ${tokens.font.label};
  margin: 0 ${tokens.space.xs};
  padding: ${tokens.space.xs} 0;
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: transparent;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: ${tokens.color.fgEmphasis};
  }
`;

const LABEL: Readonly<Record<CockpitMode, string>> = {
  chat: "Chat",
  explore: "Explore",
  watch: "Watch",
  build: "Build",
  govern: "Govern",
};

export interface RailPanelCard {
  instanceId: string;
  title: string;
}

interface RailProps {
  /** The active cockpit mode. */
  mode: CockpitMode;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick: (command: string) => void;
  /** Hover-preview a command in the status bar (`null` = stop). */
  onCommandPreview: (command: string | null) => void;
  /** A collapsed panel's cards, shown as icons; clicking opens the panel. */
  panelCards?: readonly RailPanelCard[];
  onOpenPanel?: () => void;
}

export function Rail({
  mode,
  onCommandClick,
  onCommandPreview,
  panelCards = [],
  onOpenPanel,
}: RailProps): JSX.Element {
  const hover = (cmd: string) => ({
    onMouseEnter: () => onCommandPreview(cmd),
    onMouseLeave: () => onCommandPreview(null),
    onFocus: () => onCommandPreview(cmd),
    onBlur: () => onCommandPreview(null),
  });
  return (
    <Column data-testid="nav-rail" aria-label="modes">
      {COCKPIT_MODES.map((m) => {
        const cmd = `cockpit mode ${m}`;
        return (
          <ModeButton
            key={m}
            type="button"
            $active={m === mode}
            aria-current={m === mode ? "page" : undefined}
            aria-label={cmd}
            data-testid={`rail-mode-${m}`}
            onClick={() => onCommandClick(cmd)}
            {...hover(cmd)}
          >
            {LABEL[m]}
          </ModeButton>
        );
      })}
      {panelCards.length > 0 ? (
        <>
          <Divider aria-hidden="true" />
          {panelCards.map((c) => (
            <PanelIcon
              key={c.instanceId}
              type="button"
              title={c.title}
              data-testid="rail-panel-card"
              onClick={onOpenPanel}
            >
              {c.title}
            </PanelIcon>
          ))}
        </>
      ) : null}
    </Column>
  );
}
