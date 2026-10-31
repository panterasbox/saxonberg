/**
 * TerminalCardBody — a terminal is a card (client-surface D6).
 *
 * ⭐ **A filtered view of the one frame store, with its own command bar.**
 * The card's payload names its filter (a view, a channel, mutes, facets)
 * and its `barId`; the bar submits with that id, so the server applies
 * THIS terminal's input mode, and the prompts its commands raise wait
 * here and nowhere else. The primary terminal is the one the terminal
 * column holds; the others are ordinary cards — at line width, a ticker.
 */

import React from "react";
import styled from "styled-components";
import type { CardPayload, ConsoleTab } from "@saxonberg/types";
import { useStore } from "../../store/index";
import type { CardState } from "../../store/cardFeedSlice";
import { framesFor } from "../../store/frameFilter";
import { activeCardKinds } from "../../store/cardViewActions";
import { tokens } from "../ui";
import { Terminal } from "../Terminal";
import { PromptStrip } from "../PromptStrip";
import { CommandBar } from "../CommandBar";

type TerminalPayload = Extract<CardPayload, { kind: "terminal" }>;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
`;

const Ticker = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Unread = styled.span`
  margin-left: ${tokens.space.sm};
  color: ${tokens.color.fgMuted};
`;

/** Strip MML tags for the one-line ticker. */
function plain(body: string): string {
  return body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export interface TerminalCardBodyProps {
  card: CardState;
  onSendCommand: (text: string, barId?: string) => void;
  onSendPromptResponse: (promptId: string, response: string) => void;
  onCancelPrompt: (promptId: string) => void;
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
  onCommandSend?: (command: string) => void;
  resultDisplay?: "card" | "terminal" | "both";
}

/** The frames a terminal card's filter selects — the same rule everywhere. */
export function useTerminalFrames(
  payload: TerminalPayload | undefined,
  resultDisplay: "card" | "terminal" | "both" = "card",
) {
  const frames = useStore((s) => s.frames);
  const cards = useStore((s) => s.cards);
  const tabs = useStore(
    (s) => (s.clientState["console.tabs"] as ConsoleTab[] | undefined) ?? [],
  );
  const describe = useStore((s) => s.getTopicDescriptor);
  const alwaysAggregate = useStore(
    (s) =>
      (s.clientState["social.react.alwaysAggregate"] as boolean | undefined) === true,
  );
  const kinds = activeCardKinds();
  return React.useMemo(
    () =>
      payload
        ? framesFor(frames, payload.filter, {
            tabs,
            describe,
            resultDisplay,
            cards,
            kinds,
            alwaysAggregate,
          })
        : [],
    [payload, frames, tabs, describe, resultDisplay, cards, kinds, alwaysAggregate],
  );
}

export function TerminalCardBody({
  card,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
  onCommandSend,
  resultDisplay = "card",
}: TerminalCardBodyProps): React.ReactElement | null {
  const payload = card.payload?.kind === "terminal" ? card.payload : undefined;
  const frames = useTerminalFrames(payload, resultDisplay);
  const seen = React.useRef(frames.length);
  if (!payload) return null;

  // ⭐ At line width a terminal is a TICKER: the last line, and how many
  // arrived since you last opened it.
  if (card.size === "line") {
    const last = frames[frames.length - 1];
    const unread = Math.max(0, frames.length - seen.current);
    return (
      <Ticker data-testid="terminal-ticker">
        {last ? plain(last.body) : "—"}
        {unread > 0 ? <Unread>+{unread}</Unread> : null}
      </Ticker>
    );
  }
  seen.current = frames.length;

  return (
    <Column data-testid="terminal-card" data-bar-id={payload.barId}>
      <Terminal
        frames={frames}
        onCommandClick={onCommandClick}
        onCommandPreview={onCommandPreview}
        {...(onCommandSend ? { onCommandSend } : {})}
      />
      <PromptStrip
        barId={payload.barId}
        primary={payload.primary}
        onCancelPrompt={onCancelPrompt}
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
      <CommandBar
        barId={payload.barId}
        primary={payload.primary}
        onSendCommand={onSendCommand}
        onSendPromptResponse={onSendPromptResponse}
        onCancelPrompt={onCancelPrompt}
      />
    </Column>
  );
}
