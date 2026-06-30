/**
 * StreamerDeck — the broadcaster's control deck (the streamer layout's
 * focal pane).
 *
 * NOT a stats readout: while live, a streamer mostly needs quick-action
 * shortcuts to the commands they fire at the community — moderation,
 * rewards/penalties, community prompts, broadcast state — plus a small
 * live readout (viewers, uptime). This is the *frame* for that: a live
 * strip + grouped cards of command shortcuts.
 *
 * Honest scaffold. The streamer command set isn't built yet, so the
 * chips are illustrative: hovering one previews the command it WOULD run
 * in the ghost line (the same learn-the-CLI affordance as everywhere
 * else), but they don't send — they light up for real as each streamer
 * verb lands. The cards/groupings are the design under review; the exact
 * actions will firm up with the verbs. Per the cockpit through-line the
 * client still owns zero command semantics: every chip is just a
 * command-bus affordance.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "./ui";

interface StreamerDeckProps {
  /** Hover-preview a command in the ghost line (`null` = stop). */
  onCommandPreview: (command: string | null) => void;
}

/** One illustrative shortcut: a label + the command it would preview. */
interface DeckAction {
  label: string;
  command: string;
}

interface DeckGroup {
  title: string;
  actions: DeckAction[];
}

/**
 * Illustrative groupings — the design under review, not a committed
 * command set. Commands are shown verbatim in the ghost line on hover so
 * the spatial design reads honestly even before the verbs exist.
 */
const GROUPS: DeckGroup[] = [
  {
    title: "Moderation",
    actions: [
      { label: "Timeout", command: "timeout <viewer> 10m" },
      { label: "Ban", command: "ban <viewer>" },
      { label: "Slow mode", command: "chatmode slow 30s" },
      { label: "Clear chat", command: "chatclear" },
    ],
  },
  {
    title: "Rewards & recognition",
    actions: [
      { label: "Shout-out", command: "shoutout <viewer>" },
      { label: "Award", command: "award <viewer> <token>" },
      { label: "Highlight", command: "highlight <message>" },
    ],
  },
  {
    title: "Penalties",
    actions: [
      { label: "Warn", command: "warn <viewer>" },
      { label: "Mute", command: "mute <viewer>" },
      { label: "Purge", command: "purge <viewer>" },
    ],
  },
  {
    title: "Community",
    actions: [
      { label: "Poll", command: "poll <question>" },
      { label: "Announce", command: "announce <message>" },
      { label: "Raid", command: "raid <channel>" },
    ],
  },
  {
    title: "Broadcast",
    actions: [
      { label: "Away", command: "stream away" },
      { label: "Back", command: "stream back" },
      { label: "Scene", command: "scene <name>" },
    ],
  },
];

const Deck = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: ${tokens.color.surfaceMuted};
  border-bottom: 1px solid ${tokens.color.border};
`;

/** The slim live readout — placeholder values until the stats wire lands. */
const Readout = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const LiveDot = styled.span`
  color: ${tokens.color.danger};
  font-weight: 700;
`;

const Caption = styled.div`
  padding: ${tokens.space.xs} ${tokens.space.md};
  font-size: ${tokens.font.micro};
  font-style: italic;
  color: ${tokens.color.fgMuted};
`;

const Cards = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: ${tokens.space.md};
  padding: ${tokens.space.md};
  align-content: start;
`;

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

const CardTitle = styled.div`
  font-size: ${tokens.font.small};
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

/**
 * A shortcut chip. Dimmed because it's not wired yet — it previews its
 * command on hover but doesn't send (no `onClick` dispatch). The
 * `not-allowed` cursor + reduced opacity read it honestly as "coming
 * soon" without hiding the design.
 */
const Chip = styled.button`
  padding: 0.2rem 0.6rem;
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  font: inherit;
  font-size: ${tokens.font.small};
  opacity: 0.65;
  cursor: not-allowed;

  &:hover {
    opacity: 1;
    background: ${tokens.color.actionBgHover};
  }
`;

export function StreamerDeck({
  onCommandPreview,
}: StreamerDeckProps): JSX.Element {
  return (
    <Deck>
      <Readout>
        <span>
          <LiveDot>●</LiveDot> LIVE
        </span>
        <span>— viewers</span>
        <span>uptime 00:00</span>
      </Readout>
      <Caption>
        Streamer controls — illustrative shortcuts; hover previews the
        command. Buttons light up as each streamer verb ships.
      </Caption>
      <Cards>
        {GROUPS.map((group) => (
          <Card key={group.title}>
            <CardTitle>{group.title}</CardTitle>
            <Chips>
              {group.actions.map((action) => (
                <Chip
                  key={action.label}
                  type="button"
                  onMouseEnter={() => onCommandPreview(action.command)}
                  onMouseLeave={() => onCommandPreview(null)}
                  title={action.command}
                >
                  {action.label}
                </Chip>
              ))}
            </Chips>
          </Card>
        ))}
      </Cards>
    </Deck>
  );
}
