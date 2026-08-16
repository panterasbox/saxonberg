/**
 * `Card` — the one skeleton every card kind wears.
 *
 **name** (serif) · why it is still here, right-aligned · the controls.
 *
 * ⭐ There is one body, and it shows the sections its subject HAS — a
 * room has exits, a lamp does not. So the frame carries no kind label:
 * a word that never varies costs a column that is already the
 * constraint.
 *
 * ## ⭐⭐ The honesty rule: a static card looks static
 *
 * **A static card renders its timestamp and a refresh control; a live
 * card renders neither** (AC 6). A static card that looked live would
 * be a lie, and a refresh button on a LIVE card is worse than
 * redundant — it is a bandage over a wake that does not fire, and it is
 * how nobody finds out. A `here` card was immortal through eleven
 * passing tests because every one of them refreshed by hand.
 *
 * ⭐ The refresh control's label, preview and payload are the card's
 * own **`key`** — the normalized command that produced it. So the
 * control previews exactly what it sends, and "refresh" is not a new
 * concept or an API: it re-issues the command through the ordinary
 * command bus (AC 7).
 *
 * ## ⚠ The pin sends a command
 *
 * `cockpit card pin <id>` / `dismiss` / `auto`, dispatched through the
 * ordinary affordance path, previewing exactly what it sends. Not a
 * local toggle: the card set is server-authoritative, so a local pin
 * would show the player a state the server had refused, and it would
 * not survive the tab.
 */

import React from "react";
import styled from "styled-components";
import type { CardId } from "@saxonberg/types";
import { tokens } from "../ui";
import { cardReason, type CardState } from "../../store/cardFeedSlice";
import { CARD_LABEL } from "./useCardFeed";

const Shell = styled.article<{ $faded: boolean; $pinned: boolean }>`
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

const Title = styled.h3`
  margin: 0;
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
  font-weight: 500;
  color: ${tokens.color.fg};
  min-width: 0;
  overflow-wrap: anywhere;
`;

/**
 * ⭐ *taken 14:32* — a static card's honesty stamp, beside the title.
 *
 * ⚠ A TIME, not an age. "3 minutes ago" is a duration that keeps
 * changing without the content changing, which invites the reader to
 * believe recency is the lifetime rule. It is not: pinned-ness is.
 */
const Taken = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  white-space: nowrap;
`;

/** Right-aligned, small, and never a duration. See the header note. */
const Reason = styled.span`
  margin-left: auto;
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  white-space: nowrap;
`;

/**
 * The card's controls: refresh · pin · close, top right, on every card.
 *
 * ⚠ Glyphs for now, and they are placeholders for a real icon set —
 * the shapes are the decision, the typeface is not.
 *
 * ⚠ Refresh is absent when there is nothing to look at yet. A control
 * that cannot do what it says is worse than a missing one, and a card
 * whose subject has not resolved has no keyword to name.
 */
const Controls = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  flex: none;
`;

/*
 * ⚠ They read as BUTTONS, not as faint marks. A borderless glyph in a
 * dim colour is discoverable only to someone already looking for it,
 * and these are the three things you do to a card.
 */
const IconButton = styled.button<{ $on?: boolean }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  line-height: 1;
  cursor: pointer;
  background: ${(p) =>
    p.$on ? tokens.color.accentWash : tokens.color.surfaceAlt};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fg)};
  padding: 0 ${tokens.space.sm};
  /* 44px minimum touch target via min-height — never by shrinking the
     box the glyph sits in. */
  min-height: 44px;
  min-width: 34px;

  &:hover {
    border-color: ${tokens.color.fgEmphasis};
    color: ${tokens.color.fgEmphasis};
  }
`;

export interface CardProps {
  card: CardState;
  /** Outbound command sink — the affordance path, not the raw bar. */
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  children?: React.ReactNode;
}

/**
 * ⚠⚠ **The card's ref is its KEY, not its catalogue id** — and that is
 * a defect found by driving.
 *
 * Two `who` cards can be open at once (`who` and `who --here` are
 * different commands, so they are different cards). Keyed on `cardId`,
 * both rendered `cockpit card pin who` and the server acted on
 * whichever it found first: **two controls, identical labels, acting on
 * one thing.** A control that does not act on the card it is on is
 * worse than a missing one.
 *
 * The key is quoted when it contains whitespace, because
 * `cockpit card pin who --here` would bind `--here` as an option of
 * `cockpit` rather than as part of the name.
 */
function cardRef(card: CardState): string {
  if (!/\s|"/.test(card.key)) return card.key;
  return `"${card.key.replace(/(["\\])/g, "\\$1")}"`;
}

/**
 * What the pin does next, and the command that does it.
 *
 * A pinned card hands the decision back to the catalogue's own default;
 * an unpinned one pins. **Dismiss is not on this control** — it is a
 * different intent (*drop this now*) and putting it in the same cycle
 * would make one accidental extra click destroy a card the player was
 * holding.
 */
function pinAction(card: CardState): { command: string; label: string } {
  const ref = cardRef(card);
  if (card.pinned) {
    return { command: `cockpit card auto ${ref}`, label: "⚲" };
  }
  return { command: `cockpit card pin ${ref}`, label: "⚲" };
}

/** `taken 14:32` — short, local, and never a duration. */
function takenLabel(takenAt: number): string {
  const d = new Date(takenAt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `taken ${hh}:${mm}`;
}

export function Card({
  card,
  onSendCommand,
  onCommandPreview,
  children,
}: CardProps): React.ReactElement {
  const preview = onCommandPreview ?? (() => undefined);
  const { command, label } = pinAction(card);
  const faded = card.closed !== undefined;
  const close = `cockpit card dismiss ${cardRef(card)}`;
  /*
   * ⭐⭐ **Refresh re-issues the card's own key** — the normalized
   * command that produced it. Not a new concept, not an API: the
   * ordinary command bus, previewing exactly what it sends.
   *
   * ⚠ **Only on a STATIC card.** See the header note: a refresh on a
   * live card is a bandage over a wake that does not fire.
   *
   * ⚠⚠ **And never on a prompt card**, which is static but is not a
   * re-issuable READING — it is a question. Its key carries a
   * `promptId`, so "refresh" would send a uuid at the parser; and the
   * thing a waiting question wants is an answer, not another copy of
   * itself.
   */
  const refresh = card.live || card.promptId !== undefined ? null : card.key;
  /*
   * ⚠ Before the subject arrives, the title falls back to the card's
   * LABEL, not its catalogue id. Found by driving: a freshly-opened
   * `place` card read `PLACE place`, which says nothing and looks like
   * a placeholder somebody forgot. "where you are" is true the whole
   * time and stops being needed the moment the room's name lands.
   */
  /*
   * ⚠⚠ **The BODY names the card, and the opening envelope only fills
   * in until it arrives.** The other order — `title` first — is stale by
   * construction on a live card: `card.title` is stamped once, at open,
   * and a delta rewrites the records without ever touching it, so a
   * `place` card kept the name of the room you left while showing the
   * one you were standing in. One name, taken from the thing being
   * shown.
   */
  const title =
    card.records[0]?.displayName ||
    card.title ||
    // A husk keeps the name it had — see `lastTitle` in the slice.
    card.lastTitle ||
    CARD_LABEL[card.cardId] ||
    "a card";

  return (
    <Shell
      $faded={faded}
      $pinned={card.pinned === true}
      data-testid={`card-${card.cardId}`}
      data-card-kind={card.cardId}
      data-card-key={card.key}
      data-card-live={card.live ? "true" : "false"}
      data-card-closed={card.closed ?? ""}
    >
      <Head>
        {/*
          ⚠ No kind chip. Every card is the same kind now — *what I am
          looking at* — so a label saying so on every one is a word that
          never varies, in a column where space is the constraint. What
          differs between a room and a lamp is the sections in the body,
          which is where the reader can actually see it.
        */}
        <Title>{title}</Title>
        {/*
          ⭐ The honesty stamp. A static card says WHEN its answer was
          taken; a live card has no stale answer to stamp, so it says
          nothing here rather than something reassuring.
        */}
        {!faded && card.takenAt !== undefined && (
          <Taken data-testid="card-taken">{takenLabel(card.takenAt)}</Taken>
        )}
        <Reason data-testid="card-hold-reason">{cardReason(card)}</Reason>
        {/*
          ⚠ A released husk keeps no controls. Pinning or refreshing
          something the world has already ended would promise to act on
          a subscription that no longer exists — a control that cannot
          do what it says. Close stays, because dismissing the husk is
          still a thing you can do to it.
        */}
        <Controls>
          {!faded && refresh && (
            <IconButton
              data-testid="card-refresh"
              title={`Click to send: ${refresh}`}
              aria-label={refresh}
              onClick={() => onSendCommand(refresh)}
              onMouseEnter={() => preview(refresh)}
              onMouseLeave={() => preview(null)}
            >
              ↻
            </IconButton>
          )}
          {!faded && (
            <IconButton
              $on={card.pinned}
              title={`Click to send: ${command}`}
              aria-label={command}
              onClick={() => onSendCommand(command)}
              onMouseEnter={() => preview(command)}
              onMouseLeave={() => preview(null)}
            >
              {label}
            </IconButton>
          )}
          <IconButton
            data-testid="card-close"
            title={`Click to send: ${close}`}
            aria-label={close}
            onClick={() => onSendCommand(close)}
            onMouseEnter={() => preview(close)}
            onMouseLeave={() => preview(null)}
          >
            ×
          </IconButton>
        </Controls>
      </Head>
      <CardBodyBoundary cardId={card.cardId}>{children}</CardBodyBoundary>
    </Shell>
  );
}

const BodyFailure = styled.div`
  padding: ${tokens.space.sm} ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

/**
 * ⚠⚠ **One card's body must never be able to blank the whole app.**
 *
 * The feed renders bodies this build does not own — Monaco, the git
 * panel, the Studio catalogue — and React's default for a throwing
 * component is to unmount the entire tree. That is not a hypothetical:
 * opening a file in the CMS card threw inside Monaco's `defineTheme`
 * and took the **whole client to a white screen**, with the server fine
 * and the socket still open. There was no error boundary anywhere in
 * the client at all.
 *
 * ⭐ The failure a card can survive is a card that says it broke. The
 * head — the name, the timestamp, pin, close — is rendered OUTSIDE this
 * boundary on purpose, so a card whose body died can still be read and
 * still be dismissed.
 */
class CardBodyBoundary extends React.Component<
  { cardId: CardId; children?: React.ReactNode },
  { failed: boolean }
> {
  public constructor(props: { cardId: CardId; children?: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  public componentDidCatch(error: Error): void {
    // Loud in the console, quiet in the feed: an author needs the stack,
    // a player needs the rest of the page.
    console.error(`card body '${this.props.cardId}' failed to render`, error);
  }

  public render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <BodyFailure data-testid="card-body-failed">
          This card&rsquo;s contents could not be shown. Nothing else is
          affected — close it, or try the command again.
        </BodyFailure>
      );
    }
    return this.props.children;
  }
}
