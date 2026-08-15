/**
 * The play surface on a phone.
 *
 * ## ⭐⭐ The rule: interleave what is causally related, switch what is
 * independent
 *
 * - **Panes are caused by what you just did**, so they render **inline
 *   in the feed**, in causal position — not in a second column, not in
 *   a drawer. You analysed the forge; the forge's card belongs where
 *   that happened.
 * - **Routed feeds are independent of each other**, so they get a
 *   SWITCHER. There is no causal reason a channel message should sit
 *   between two room descriptions.
 *
 * Getting this backwards produces the two familiar mobile failures: a
 * drawer you forget exists, and a single stream where unrelated things
 * fight for the same position.
 *
 * ## ⭐ A frame routed out of view leaves something behind
 *
 * On a desktop the frame is in World anyway. On a phone World may not
 * be the feed you are looking at, so a routed-away frame leaves a
 * bordered card naming the destination and offering to open it.
 *
 * ⚠ **Except diagnostics.** Leaving a card behind for each of a hundred
 * log lines would recreate exactly the noise the routing rule was
 * written to remove — the stub would be worse than the thing it stands
 * for.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import { PaneCard } from "./PaneCard";
import { PaneBody } from "./PaneBodies";
import type { PaneCardState } from "../../store/paneFeedSlice";

const Chips = styled.div`
  display: flex;
  gap: ${tokens.space.xs};
  overflow-x: auto;
  max-width: 100%;
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-top: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceMuted};
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Chip = styled.button`
  font: inherit;
  font-size: ${tokens.font.label};
  white-space: nowrap;
  cursor: pointer;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.fgEmphasis};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgEmphasis};
  min-height: 44px;
  padding: 0 ${tokens.space.sm};
`;

const InlineCard = styled.div`
  margin: ${tokens.space.sm} 0;
  max-width: 100%;
`;

/*
 * ⚠ `leftBehind` / `LeftBehindCard` were removed with the feeds.
 *
 * A stub naming "the feed this went to instead" only means anything
 * when feeds are exclusive buckets. Every tab is a view over the whole
 * buffer now, so a frame is never routed out of view — it is in every
 * view whose predicate it satisfies, and switching views re-sorts your
 * whole history rather than moving anything.
 */

export interface PinnedChipRowProps {
  onSendCommand: (text: string) => void;
}

/**
 * The pinned chips, above the command bar.
 *
 * ⭐ Pinned panes are the ones you told the world to keep, so on a
 * phone — where a pane cannot sit permanently beside the feed — they
 * keep a permanent handle instead of scrolling away with everything
 * else.
 */
export function PinnedChipRow({
  onSendCommand,
}: PinnedChipRowProps): React.ReactElement | null {
  const paneCards = useStore((s) => s.paneCards);
  const pinned = Object.values(paneCards).filter((c) => c.pinned === true);
  if (pinned.length === 0) return null;
  return (
    <Chips data-testid="pinned-chip-row">
      {pinned.map((card) => {
        const name = card.records[0]?.displayName ?? card.paneId ?? "a pane";
        const ref = card.paneId ?? card.subscriptionId;
        return (
          <Chip
            key={card.subscriptionId}
            aria-label={`cockpit pane auto ${ref}`}
            title={`Click to send: cockpit pane auto ${ref}`}
            onClick={() => onSendCommand(`cockpit pane auto ${ref}`)}
          >
            ⚲ {name}
          </Chip>
        );
      })}
    </Chips>
  );
}

export interface InlinePaneProps {
  card: PaneCardState;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

/** One pane, rendered inline in the feed rather than in a rail. */
export function InlinePane({
  card,
  onSendCommand,
  onCommandPreview,
}: InlinePaneProps): React.ReactElement {
  return (
    <InlineCard data-testid={`inline-pane-${card.subscriptionId}`}>
      <PaneCard
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
    </InlineCard>
  );
}
