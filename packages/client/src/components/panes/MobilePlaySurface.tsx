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
import type { FeedDestination } from "@saxonberg/types";
import { useStore, type Frame } from "../../store/index";
import { frameFeeds } from "../../store/routingActions";
import { tokens } from "../ui";
import { PaneCard } from "./PaneCard";
import { PaneBody } from "./PaneBodies";
import type { PaneCardState } from "../../store/paneFeedSlice";

const Stub = styled.div`
  border: 1px dashed ${tokens.color.borderMuted};
  border-left: 2px solid ${tokens.color.info};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.sm};
  margin: ${tokens.space.xs} 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgDim};
  max-width: 100%;
`;

const StubActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  margin-top: ${tokens.space.xs};
`;

const StubAction = styled.button`
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  min-height: 44px;
  padding: 0 ${tokens.space.sm};
`;

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

/**
 * The stubs a feed switch leaves behind.
 *
 * ⚠ A frame **copied** to the feed you are watching is not out of view,
 * so it leaves nothing — which is what makes copy-to-Attention the
 * safety net rather than a source of doubles.
 */
export function leftBehind(
  frames: readonly Frame[],
  active: FeedDestination,
  weightOf: (topic: string) => string,
): Array<{ frame: Frame; feed: FeedDestination }> {
  const out: Array<{ frame: Frame; feed: FeedDestination }> = [];
  for (const frame of frames) {
    const feeds = frameFeeds(frame.feeds);
    if (feeds.includes(active)) continue;
    if (weightOf(frame.topic) === "diagnostic") continue;
    const elsewhere = feeds[0];
    if (elsewhere) out.push({ frame, feed: elsewhere });
  }
  return out;
}

export interface LeftBehindCardProps {
  frame: Frame;
  feed: FeedDestination;
  /** Switch the terminal to `feed`. A viewport act — see below. */
  onOpenFeed: (feed: FeedDestination) => void;
}

export function LeftBehindCard({
  frame,
  feed,
  onOpenFeed,
}: LeftBehindCardProps): React.ReactElement {
  const setDraft = useStore((s) => s.setDraft);
  return (
    <Stub data-testid={`left-behind-${frame.id}`}>
      <div>
        one {frame.topic} went to <strong>{feed}</strong>
      </div>
      <StubActions>
        {/*
          ⚠ **Neither of these claims to be a command, because neither
          is one.**

          `open <feed>` is a VIEWPORT act, like a scroll position: what
          feeds exist and what lands in them is the server's business
          (the routing table), but which one you happen to be looking at
          is not — the same line `rightPane` and the tab strip already
          sit on. Dressing it as a command would be a fake claim, which
          is the honesty failure one level up from a fake figure.

          `reply here` PREFILLS rather than sends, because `reply`
          takes a message and a button that dispatched a bare verb would
          promise a reply it has no words for.
        */}
        <StubAction
          aria-label={`open ${feed}`}
          onClick={() => onOpenFeed(feed)}
        >
          open {feed}
        </StubAction>
        <StubAction
          aria-label="reply here"
          onClick={() => setDraft("base", "reply ")}
        >
          reply here
        </StubAction>
      </StubActions>
    </Stub>
  );
}

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
