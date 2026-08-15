/**
 * `Frame` — the civic top bar. One row, every mode, rebuilt from the
 * reference art rather than restyled.
 *
 *     [seal] [ConnectionChip] │ [AccountMenu] │ [──── Shelf ────] [Views] [Settings]
 *
 * ## What sits where, and why
 *
 * **Identity and connection are anchored LEFT, together.** They are
 * *the two things that must be true at a glance whatever else was
 * removed* — you are logged in as somebody, and the bus is alive. The
 * shelf is everything else, and everything else is negotiable.
 *
 * ⚠ The requirements also say "the account menu at the right", and the
 * art puts the `who` chip at the left. `AccountMenu` is ONE component
 * that is both the identity chip and its dropdown, so it cannot be in
 * two places; the left reading wins on the requirements' own stronger
 * sentence. If a split was intended — identity chip left, account
 * actions right — that is two components and a second identity
 * rendering, and it is a design call rather than an implementation one.
 *
 * **`ViewsMenu` and Settings survive.** Neither is mentioned in the
 * requirements, and migrating the frame off `cockpit.layout` is an
 * explicit Wave 4 non-goal — so a "full rebuild" that dropped them
 * would regress two shipped surfaces. They hold the right-hand cluster
 * the art gives to a notification bell, which is **not built, not
 * hatched, and not placeholdered**: what belongs in that tray is
 * whatever the receiver SAID they wanted, which wants `NotifyPolicy`
 * read first. A stub would be an interface promising a model that does
 * not exist.
 *
 * ⭐ **Identity and connection cannot be unpinned** — not because a
 * rule protects them, but because they are not shelf rows at all.
 * `cockpit shelf unpin identity` refuses with "unknown shelf row",
 * which is a stronger guarantee than a rule somebody could edit.
 *
 * The seal is the real Saxonberg mark (`components/frame/Seal.tsx`),
 * applied — a white rim, a struck red field, and the three Borromean
 * rings. ⚠ **The rim is the flag rule, not decoration**: *red never
 * touches blue*, white is the separator, and the bar's ground is navy.
 * A first cut here drew a red block with a red border straight onto
 * that navy, which is the one thing the system forbids. `--sx-red` is
 * exempt from the contrast floor precisely because it is reserved for
 * surfaces that carry white separation — so it has to actually carry
 * it.
 */

import React from "react";
import styled from "styled-components";
import type { CockpitMode } from "@saxonberg/types";
import { tokens } from "../ui";
import { Seal } from "./Seal";
import { ConnectionChip } from "./ConnectionChip";
import { AccountMenu } from "./AccountMenu";
import { Shelf } from "./Shelf";
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

const Divider = styled.span`
  flex: none;
  width: 1px;
  align-self: stretch;
  background: ${tokens.color.borderMuted};
  margin: 0 ${tokens.space.xs};
`;

const SettingsButton = styled.button<{ $active: boolean }>`
  flex: none;
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
  /** The active cockpit mode; enables the Views switcher. */
  mode?: CockpitMode;
  /** The active arrangement within that mode. */
  arrangement?: string;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick?: (command: string) => void;
  /** Hover-preview a command in the status bar (`null` = stop). */
  onCommandPreview?: (command: string | null) => void;
  /** Whether the settings pane is currently open. */
  settingsActive?: boolean;
  /** Toggle the settings pane; absent → the affordance is hidden. */
  onToggleSettings?: () => void;
}

export const Frame: React.FC<FrameProps> = ({
  mode,
  arrangement,
  onCommandClick,
  onCommandPreview,
  settingsActive,
  onToggleSettings,
}) => (
  <Bar data-testid="top-bar">
    <Seal size={22} title="Saxonberg" />
    <ConnectionChip />
    <Divider aria-hidden="true" />
    <AccountMenu />
    <Divider aria-hidden="true" />
    <Shelf
      {...(onCommandClick ? { onCommandClick } : {})}
      {...(onCommandPreview ? { onCommandPreview } : {})}
    />
    {mode && onCommandClick && onCommandPreview ? (
      <ViewsMenu
        currentMode={mode}
        currentArrangement={arrangement ?? "default"}
        onCommandClick={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
    ) : null}
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
