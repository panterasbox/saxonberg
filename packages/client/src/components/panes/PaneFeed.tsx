/**
 * `PaneFeed` — the right column, as a **feed**.
 *
 * ## ⭐ Two feeds, and they scroll in opposite directions
 *
 * The terminal runs `oldest → newest`; this runs `newest → oldest`.
 * Both headers say so, and the headers exist **because** of the
 * asymmetry rather than in spite of it: it is a real design fact (the
 * transcript is a record you read forward, the pane feed is a set of
 * things you are currently dealing with) and a reader who is not told
 * will read it as a bug the first time a new card appears at the top.
 *
 * ## ⚠ `N pinned` is counted, never tracked
 *
 * From the card set itself. A count kept beside a list is a second
 * source of truth for the list's own size and the two disagree the
 * first time one path forgets to update — the rule the last sweep
 * caught a test breaking.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import { PaneCard } from "./PaneCard";
import { PaneBody } from "./PaneBodies";
import { usePaneFeed } from "./usePaneFeed";
import { InspectionPane } from "../InspectionPane";

const Column = styled.aside<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: ${tokens.color.surfaceMuted};
  color: ${tokens.color.fg};
  border-left: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};

  /*
   * ⚠⚠ **The fixed width is the mobile viewport trap.** A fixed-width
   * pane inside an overflowing document widens the initial containing
   * block, which is what position:fixed resolves against — so the
   * shell's own fixed surfaces (the shelf screen, the command sheet)
   * render off-screen and unreachable. Verified at 390px in a real
   * browser; jsdom performs no layout and cannot see it.
   */
  ${(p) =>
    p.$compact
      ? `
    width: 100%;
    max-width: 100%;
    min-width: 0;
  `
      : `
    width: 360px;
    min-width: 360px;
    max-width: 360px;
  `}
`;

const Header = styled.header`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

/** The direction note. Lower-case and unemphasised — a fact, not a label. */
const Direction = styled.span`
  font-family: ${tokens.font.mono};
  letter-spacing: normal;
  text-transform: none;
  color: ${tokens.color.fgMuted};
`;

const PinnedCount = styled.span`
  margin-left: auto;
  font-family: ${tokens.font.mono};
  letter-spacing: normal;
  text-transform: none;
  color: ${tokens.color.fgMuted};
`;

const List = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm};
`;

/**
 * The in-focus card keeps the existing inspection pane as its body —
 * breadcrumb, paint/clear policy, detail drill and all. It is the one
 * pane whose behaviour is not "a card about a subject", and rebuilding
 * it here would have thrown away a working surface to make the feed
 * look uniform.
 */
const FocusSlot = styled.div`
  min-height: 0;
  display: flex;

  /* The pane declares its own 360px; inside the feed it is the column. */
  & > * {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    border-left: none;
  }
`;

export interface PaneFeedProps {
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  /** True on a phone — the column stops being a fixed-width rail. */
  compact?: boolean;
}

export function PaneFeed({
  onSendCommand,
  onCommandPreview,
  compact = false,
}: PaneFeedProps): React.ReactElement {
  usePaneFeed();
  const paneCards = useStore((s) => s.paneCards);

  // Derived here rather than read from state: see the header note.
  const cards = React.useMemo(
    () => Object.values(paneCards).sort((a, b) => b.openedAt - a.openedAt),
    [paneCards],
  );
  const pinned = React.useMemo(
    () => cards.filter((c) => c.pinned === true).length,
    [cards],
  );

  return (
    <Column $compact={compact} data-testid="pane-feed">
      <Header>
        Panes <Direction>newest → oldest</Direction>
        <PinnedCount data-testid="pane-pinned-count">
          {pinned} pinned
        </PinnedCount>
      </Header>
      <List>
        {cards.map((card) => (
          <PaneCard
            key={card.subscriptionId}
            card={card}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          >
            <PaneBody
              card={card}
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          </PaneCard>
        ))}
        <FocusSlot>
          <InspectionPane
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
        </FocusSlot>
      </List>
    </Column>
  );
}
