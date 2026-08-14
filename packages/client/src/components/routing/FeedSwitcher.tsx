/**
 * `FeedSwitcher` — one stream, four destinations, each carrying its own
 * count.
 *
 * ⚠⚠ **Every count is DERIVED from the frames it names.** `World 1077`
 * is `frames.filter(inWorld).length`, computed where it is rendered. A
 * count tracked beside a list is a second source of truth for that
 * list's size, and the two disagree the first time one path forgets to
 * update — which is a lie about how much you have missed.
 *
 * ⭐ On a phone this is the primary navigation: routed feeds are
 * INDEPENDENT of each other (unlike panes, which are caused by what you
 * just did), so they switch rather than interleave.
 */

import React from "react";
import styled from "styled-components";
import type { FeedDestination } from "@saxonberg/types";
import { FEED_DESTINATIONS } from "@saxonberg/types";
import type { Frame } from "../../store/index";
import { frameFeeds } from "../../store/routingActions";
import { tokens } from "../ui";

/** How each destination reads. Title-case, because it is a place. */
const FEED_LABEL: Readonly<Record<FeedDestination, string>> = {
  world: "World",
  attention: "Attention",
  channels: "Channels",
  diagnostics: "Diag",
};

const Strip = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${tokens.space.xs};
  /* ⚠ Horizontally scrollable, and the container must be the thing
     that scrolls — a strip that grew the document would widen the
     initial containing block and push every position:fixed surface
     off-screen at 390px. */
  overflow-x: auto;
  max-width: 100%;
  background: ${tokens.color.surfaceMuted};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  padding: ${tokens.space.xs} ${tokens.space.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  white-space: nowrap;
  font: inherit;
  cursor: pointer;
  min-height: 44px;
  padding: 0 ${tokens.space.md};
  background: ${(p) =>
    p.$active ? tokens.color.surface : tokens.color.surfaceAlt};
  color: ${(p) => (p.$active ? tokens.color.fgEmphasis : tokens.color.fg)};
  border: 1px solid
    ${(p) =>
      p.$active ? tokens.color.borderEmphasis : tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
`;

const Count = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

/** Group the buffer by the destinations the server stamped. */
export function countByFeed(
  frames: readonly Frame[],
): Record<FeedDestination, number> {
  const out: Record<FeedDestination, number> = {
    world: 0,
    attention: 0,
    channels: 0,
    diagnostics: 0,
  };
  for (const frame of frames) {
    for (const feed of frameFeeds(frame.feeds)) out[feed] += 1;
  }
  return out;
}

/** The frames in one feed. */
export function framesInFeed(
  frames: readonly Frame[],
  feed: FeedDestination,
): Frame[] {
  return frames.filter((f) => frameFeeds(f.feeds).includes(feed));
}

export interface FeedSwitcherProps {
  frames: readonly Frame[];
  active: FeedDestination;
  onSelect: (feed: FeedDestination) => void;
}

export function FeedSwitcher({
  frames,
  active,
  onSelect,
}: FeedSwitcherProps): React.ReactElement {
  // Derived at render, from the list beside it. See the header note.
  const counts = React.useMemo(() => countByFeed(frames), [frames]);
  return (
    <Strip data-testid="feed-switcher" role="tablist">
      {FEED_DESTINATIONS.map((feed) => (
        <Tab
          key={feed}
          role="tab"
          aria-selected={feed === active}
          $active={feed === active}
          data-feed={feed}
          onClick={() => onSelect(feed)}
        >
          {FEED_LABEL[feed]}
          <Count data-testid={`feed-count-${feed}`}>{counts[feed]}</Count>
        </Tab>
      ))}
    </Strip>
  );
}
