/**
 * Frame — the single in-world top bar. One row holding all the always-on
 * chrome: bus-health indicator + identity on the left, the "Views" layout
 * switcher beside them, and the settings affordance pinned right. Folding
 * the layout switcher + settings into this one bar (they used to sit on a
 * second `ChromeBar` row) keeps the chrome to a single strip — the content
 * area gets the reclaimed vertical space.
 *
 * The layout-switcher + settings props are optional so the bar still
 * renders as bare identity chrome in pre-world phases that have no layout.
 *
 * Reserved seams (rendered as nothing until their own cycles): a
 * mode-status region (game vitals), a mode indicator, and search.
 */

import React from "react";
import styled from "styled-components";
import type { LayoutName } from "@saxonberg/types";
import { tokens } from "../ui";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { AccountMenu } from "./AccountMenu";
import { ViewsMenu } from "../ViewsMenu";

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.md};
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  flex: none;
`;

const Spacer = styled.div`
  flex: 1;
`;

const SettingsButton = styled.button<{ $active: boolean }>`
  background: ${(p) =>
    p.$active ? tokens.color.surfaceMuted : "transparent"};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgEmphasis};
  cursor: pointer;
  padding: 0.15rem 0.6rem;
  font: inherit;
  font-size: ${tokens.font.small};

  &:hover {
    background: ${tokens.color.surfaceMuted};
  }
`;

interface FrameProps {
  /** The active layout (`cockpit.layout`); enables the Views switcher. */
  layout?: LayoutName;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick?: (command: string) => void;
  /** Hover-preview a command in the ghost line (`null` = stop). */
  onCommandPreview?: (command: string | null) => void;
  /** Whether the settings pane is currently open. */
  settingsActive?: boolean;
  /** Toggle the settings pane; absent → the affordance is hidden. */
  onToggleSettings?: () => void;
}

export const Frame: React.FC<FrameProps> = ({
  layout,
  onCommandClick,
  onCommandPreview,
  settingsActive,
  onToggleSettings,
}) => (
  <Bar>
    <ConnectionIndicator />
    <AccountMenu />
    {layout && onCommandClick && onCommandPreview ? (
      <ViewsMenu
        current={layout}
        onCommandClick={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
    ) : null}
    <Spacer />
    {onToggleSettings ? (
      <SettingsButton
        $active={settingsActive ?? false}
        aria-label="Toggle settings pane"
        onClick={onToggleSettings}
      >
        Settings
      </SettingsButton>
    ) : null}
  </Bar>
);
