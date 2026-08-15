/**
 * The play surface on a phone.
 *
 * ## ⭐⭐ The rule: interleave what is causally related, switch what is
 * independent
 *
 * - **Cards are caused by what you just did**, so they render **inline
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
import { Card } from "./Card";
import { CardBody } from "./CardBodies";
import type { CardState } from "../../store/cardFeedSlice";

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

const InlineWrap = styled.div`
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
 * ⭐ Pinned cards are the ones you told the world to keep, so on a
 * phone — where a card cannot sit permanently beside the feed — they
 * keep a permanent handle instead of scrolling away with everything
 * else.
 */
export function PinnedChipRow({
  onSendCommand,
}: PinnedChipRowProps): React.ReactElement | null {
  const cards = useStore((s) => s.cards);
  /*
   * ⚠ **Deliberately NOT filtered by `visibleCards`.** This row is
   * chrome about your PINS, not a rendering of card content: under
   * `shell.result: terminal` the card's content is in the transcript
   * and the card itself is hidden, but the pin is still real and still
   * yours to release — and hiding the chip would strand it with no way
   * to un-pin. Verified at 390px.
   */
  const pinned = Object.values(cards).filter((c) => c.pinned);
  if (pinned.length === 0) return null;
  return (
    <Chips data-testid="pinned-chip-row">
      {pinned.map((card) => {
        const name =
          card.title ?? card.records[0]?.displayName ?? card.cardId;
        // ⚠ The KEY, not the catalogue id — two cards of one kind can be
        // open at once. See `Card.tsx`'s `cardRef`.
        const ref = /\s|"/.test(card.key)
          ? `"${card.key.replace(/(["\\])/g, "\\$1")}"`
          : card.key;
        return (
          <Chip
            key={card.instanceId}
            aria-label={`cockpit card auto ${ref}`}
            title={`Click to send: cockpit card auto ${ref}`}
            onClick={() => onSendCommand(`cockpit card auto ${ref}`)}
          >
            ⚲ {name}
          </Chip>
        );
      })}
    </Chips>
  );
}

export interface InlineCardProps {
  card: CardState;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

/** One card, rendered inline in the feed rather than in a rail. */
export function InlineCard({
  card,
  onSendCommand,
  onCommandPreview,
}: InlineCardProps): React.ReactElement {
  return (
    <InlineWrap data-testid={`inline-card-${card.instanceId}`}>
      <Card
        card={card}
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      >
        <CardBody
          card={card}
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
      </Card>
    </InlineWrap>
  );
}
