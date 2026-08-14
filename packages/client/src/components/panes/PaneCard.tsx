/**
 * `PaneCard` — the one skeleton every pane kind wears.
 *
 * `KIND` (mono, dim) · **name** (serif) · the hold reason, right-aligned
 * · the pin. Five bodies hang off it and none of them re-implements the
 * frame, which is what keeps a mixture of kinds reading as one feed
 * rather than as five widgets that happen to be stacked.
 *
 * ## ⚠ The header states WHY, not how long
 *
 * *"held · owes a reply"*, *"held · still in the room"*, *"stale · they
 * left"*. Never an age. A pane's lifetime is a fact about the world —
 * is that person still here, is that thing still in reach — and a
 * duration in the same slot would invite the reader to believe recency
 * had something to do with it. It does not: **nothing still actionable
 * ever leaves**, and that is the property that makes the feed
 * tractable.
 *
 * ## ⚠ The pin sends a command
 *
 * `cockpit pane pin <id>` / `dismiss` / `auto`, dispatched through the
 * ordinary affordance path, previewing exactly what it sends. Not a
 * local toggle: the pane set is server-authoritative, so a local pin
 * would show the player a state the server had refused, and it would
 * not survive the tab.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { holdReason, type PaneCardState } from "../../store/paneFeedSlice";
import { PANE_LABEL } from "./usePaneFeed";

const Card = styled.article<{ $faded: boolean; $pinned: boolean }>`
  border: 1px solid
    ${(p) =>
      p.$pinned ? tokens.color.fgEmphasis : tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
  padding: ${tokens.space.md};
  opacity: ${(p) => (p.$faded ? 0.55 : 1)};
`;

const Head = styled.header`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.sm};
`;

const Kind = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.color.fgMuted};
`;

const Title = styled.h3`
  margin: 0;
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
  font-weight: 500;
  color: ${tokens.color.fg};
  min-width: 0;
  overflow-wrap: anywhere;
`;

/** Right-aligned, small, and never a duration. See the header note. */
const Reason = styled.span`
  margin-left: auto;
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  white-space: nowrap;
`;

const Pin = styled.button<{ $on: boolean }>`
  font: inherit;
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: transparent;
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.fgEmphasis : "transparent")};
  border-radius: ${tokens.radius.sm};
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fgMuted)};
  padding: 0 ${tokens.space.xs};
  /* 44px minimum touch target via min-height — never by shrinking the
     box the glyph sits in. */
  min-height: 44px;
  min-width: 30px;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

export interface PaneCardProps {
  card: PaneCardState;
  /** Outbound command sink — the affordance path, not the raw bar. */
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  children?: React.ReactNode;
}

/**
 * What the pin does next, and the command that does it.
 *
 * Three states cycle through two commands: an automatic pane pins; a
 * pinned pane hands the decision back. **Dismiss is not on this
 * control** — it is a different intent (*drop this even though it still
 * holds*) and putting it in the same cycle would make one accidental
 * extra click destroy a card the world says is still relevant.
 */
function pinAction(card: PaneCardState): { command: string; label: string } {
  const ref = card.paneId ?? card.subscriptionId;
  if (card.pinned === true) {
    return { command: `cockpit pane auto ${ref}`, label: "⚲ held" };
  }
  return { command: `cockpit pane pin ${ref}`, label: "⚲" };
}

export function PaneCard({
  card,
  onSendCommand,
  onCommandPreview,
  children,
}: PaneCardProps): React.ReactElement {
  const preview = onCommandPreview ?? (() => undefined);
  const { command, label } = pinAction(card);
  const faded = card.released !== undefined;
  /*
   * ⚠ Before the subject arrives, the title falls back to the pane's
   * LABEL, not its catalogue id. Found by driving: a freshly-opened
   * `place` card read `PLACE place`, which says nothing and looks like
   * a placeholder somebody forgot. "where you are" is true the whole
   * time and stops being needed the moment the room's name lands.
   */
  const title =
    card.records[0]?.displayName ||
    // A husk keeps the name it had — see `lastTitle` in the slice.
    card.lastTitle ||
    (card.paneId ? PANE_LABEL[card.paneId] : undefined) ||
    "a pane";

  return (
    <Card
      $faded={faded}
      $pinned={card.pinned === true}
      data-testid={`pane-${card.paneId ?? card.subscriptionId}`}
      data-pane-kind={card.kind}
      data-pane-released={card.released ?? ""}
    >
      <Head>
        <Kind>{card.kind}</Kind>
        <Title>{title}</Title>
        <Reason data-testid="pane-hold-reason">{holdReason(card)}</Reason>
        {/*
          ⚠ A released husk keeps no pin. Pinning something the world
          has already ended would promise to hold open a card whose
          subscription no longer exists — a control that cannot do what
          it says.
        */}
        {!faded && (
          <Pin
            $on={card.pinned === true}
            title={`Click to send: ${command}`}
            aria-label={command}
            onClick={() => onSendCommand(command)}
            onMouseEnter={() => preview(command)}
            onMouseLeave={() => preview(null)}
          >
            {label}
          </Pin>
        )}
      </Head>
      {children}
    </Card>
  );
}
