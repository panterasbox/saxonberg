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
import {
  InspectionPane,
  useInspectionSubscriptions,
} from "../InspectionPane";

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
 * The in-focus card.
 *
 * ⭐ It wears the same frame as every other card — kind, then name —
 * so a mixture of kinds reads as one feed. What it does NOT get is a
 * pin: pinning is *keep this after its hold lapses*, and your focus has
 * no hold to lapse. A control that cannot do what it says is worse than
 * a missing one.
 *
 * ⚠ It keeps the existing inspection pane as its BODY — breadcrumb,
 * paint/clear policy, detail drill and all. Rebuilding that here to
 * make the feed look uniform would have thrown away a working surface
 * for a cosmetic win.
 */
const FocusCard = styled.article`
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
  padding: ${tokens.space.md};
  max-width: 100%;
  min-width: 0;
`;

const FocusHead = styled.header`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.sm};
`;

const FocusKind = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.color.fgMuted};
`;

const FocusTitle = styled.h3`
  margin: 0;
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
  font-weight: 500;
  color: ${tokens.color.fg};
  min-width: 0;
  overflow-wrap: anywhere;
`;

export interface PaneFeedProps {
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  /** True on a phone — the column stops being a fixed-width rail. */
  compact?: boolean;
}

/*
 * ⚠⚠ `usePaneFeed()` is NOT called here. It used to be, and that made
 * the entire phone surface dead: this column only renders on a desktop,
 * so on a phone nothing opened the `place` subscription and nothing
 * registered the three envelope handlers. Server-pushed arrangement
 * panes were dropped on the floor, and a card opened by the radial
 * never received a record.
 *
 * It lives in `WorldLayout` now — the one component that renders at
 * both form factors. Found by driving at 390px; every unit test in
 * `MobilePlaySurface.test.tsx` passed throughout, because they render
 * `InlinePane` with a hand-built card and never touch the wiring.
 */
export function PaneFeed({
  onSendCommand,
  onCommandPreview,
  compact = false,
}: PaneFeedProps): React.ReactElement {
  /*
   * ⚠⚠ Unconditional, and that is the whole point — see the hook's own
   * note. The focus CARD is conditional; the subscription that decides
   * whether there is anything to show must never be.
   */
  useInspectionSubscriptions();
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

  /*
   * ⚠⚠ **The focus card is suppressed when it would repeat the PLACE
   * card**, which at rest is almost always.
   *
   * The focus pane falls back to the room when nothing is focused, and
   * `place` is the room — so the default screen showed *the lounge*
   * twice, stacked, one directly above the other. Absorbing the pane
   * into the feed alone would not have fixed that; it would have made
   * the two copies look even more like each other.
   *
   * The rule is by SUBJECT, not by "is anything focused": after
   * `look` at the room the focus subject *is* the room, and a rule
   * keyed on focus-existence would let the duplicate straight back in.
   */
  const focusStuffId = useStore(
    (s) => s.paneLastResult?.[0]?.stuffId ?? null,
  );
  const focusName = useStore(
    (s) => s.paneFocusName ?? s.paneLastResult?.[0]?.displayName ?? null,
  );
  const placeCard = React.useMemo(
    () => cards.find((c) => c.paneId === "place" && !c.released),
    [cards],
  );
  const placeSubjectId = placeCard?.records[0]?.stuffId ?? null;
  /*
   * ⚠⚠ **Do not render a claim you cannot yet check.**
   *
   * The `place` card opens with no records and fills in when its
   * subscription resolves. The focus subscription resolves separately,
   * and on entry it usually wins — so for one beat `placeSubjectId` was
   * null, the dedupe had nothing to compare against, and a LOOKING AT
   * card for the room you are standing in appeared and then vanished
   * when place caught up. Reported exactly as it looks: *"I see flash
   * in the right side 'looking at' for a while and then it vanishes."*
   *
   * While place is open but unresolved the honest answer to "is this a
   * duplicate?" is *not yet known*, and the honest render is nothing.
   */
  const placeUnresolved = placeCard !== undefined && placeSubjectId === null;
  const showFocus =
    focusStuffId !== null &&
    focusStuffId !== placeSubjectId &&
    !placeUnresolved;

  return (
    <Column $compact={compact} data-testid="pane-feed">
      <Header>
        Cards <Direction>newest → oldest</Direction>
        <PinnedCount data-testid="pane-pinned-count">
          {pinned} pinned
        </PinnedCount>
      </Header>
      <List>
        {/*
          ⭐ The focus card sits FIRST, because the feed runs
          newest → oldest and looking at something is the most recent
          thing you did.
        */}
        {showFocus && (
          <FocusCard data-testid="pane-focus-card">
            <FocusHead>
              <FocusKind>looking at</FocusKind>
              <FocusTitle>{focusName ?? "something"}</FocusTitle>
            </FocusHead>
            <InspectionPane
              embedded
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          </FocusCard>
        )}
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
      </List>
    </Column>
  );
}
