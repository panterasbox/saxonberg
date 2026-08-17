/**
 * LivestreamPanels — the shared body of the livestream-viewer and streamer
 * layouts.
 *
 * A Focal split: a caller-supplied `focal` node sizes first (the video
 * embed for the viewer; a stats placeholder for the streamer), a
 * compressed game terminal fills beneath it (never-blind), and a
 * livestream-chat terminal is the side rail. The two terminals partition
 * the one shared frame buffer by topic — an allowlist for the chat relay
 * topics and its complement for the game — entirely client-side.
 *
 * The always-on minimum command bar sits at the primary column's foot.
 * (The chat terminal gains its own bar in Phase 4, with per-bar mode.)
 */

import React from "react";
import styled from "styled-components";
import { type Frame as ConsoleFrame } from "../store/index";
import type { LayoutProps } from "./types";
import { Cockpit, LeftColumn, SideColumn, tokens } from "./primitives";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";
import { TunedRail } from "../components/social/TunedRail";

/**
 * The livestream-chat relay topics the chat terminal allowlists.
 *
 * ⚠ This held `"speech.relay"` TWICE — two distinct relay topics before
 * the S2 collapse folded them onto one name, and the duplicate outlived
 * the rename. A Set deduped it, so nothing failed; the literal simply
 * claimed a size it did not have. Same shape as the one in the server's
 * `REACTABLE_TOPICS`, and corrected for the same reason.
 */
const CHAT_TOPICS = new Set(["speech.relay"]);

function isChatFrame(f: ConsoleFrame): boolean {
  return CHAT_TOPICS.has(f.topic);
}

const RailTitle = styled.div`
  padding: ${tokens.space.sm} ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  border-bottom: 1px solid ${tokens.color.border};
`;

/**
 * How the reader splits the column between the embed and the world.
 *
 * ⭐ Every preset keeps the world feed on screen. `theater` shrinks it to
 * a floor, never to nothing — the never-blind law does not have a
 * "unless you are watching a stream" clause, and a player who cannot see
 * that they are on fire is not having a viewing experience.
 */
export const SPLIT_PRESETS = {
  reading: { focal: 1, feed: 2 },
  even: { focal: 1, feed: 1 },
  theater: { focal: 4, feed: 1 },
} as const;

export type SplitPreset = keyof typeof SPLIT_PRESETS;

export const SPLIT_ORDER: readonly SplitPreset[] = [
  "reading",
  "even",
  "theater",
];

/**
 * The focal card's vertical claim — the dominant share of the column
 * (composition grammar's Focal split). The video / stats sizes first;
 * `min-height: 0` lets the contained 16:9 letterbox within it.
 */
const Focal = styled.div<{ $grow: number }>`
  display: flex;
  flex: ${(p) => p.$grow} 1 0;
  min-height: 0;
`;

const SplitBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const SplitBtn = styled.button<{ $on: boolean }>`
  appearance: none;
  font: inherit;
  cursor: pointer;
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fgMuted)};
  background: ${(p) => (p.$on ? tokens.color.surfaceAlt : "transparent")};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.accent : tokens.color.border)};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.sm};
`;

/**
 * The compressed game terminal — the focal split's complement. Takes the
 * remaining share, floored at a legible minimum height (never-blind).
 */
const GameTerminal = styled.div<{ $grow: number }>`
  display: flex;
  flex-direction: column;
  flex: ${(p) => p.$grow} 1 0;
  /* ⭐ The floor that makes "the world keeps running under it" true in
     every preset, theater included. */
  min-height: 8rem;
`;

interface LivestreamPanelsProps extends LayoutProps {
  /** The focal card — the video embed (viewer) or the streamer deck. */
  focal: React.ReactNode;
  /** Widen the chat rail — the streamer lives in chat, so it gets more room. */
  railWide?: boolean;
}

export function LivestreamPanels({
  focal,
  railWide,
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
}: LivestreamPanelsProps): JSX.Element {
  const chatFrames = frames.filter(isChatFrame);
  const gameFrames = frames.filter((f) => !isChatFrame(f));
  const [split, setSplit] = React.useState<SplitPreset>("even");
  const ratio = SPLIT_PRESETS[split];

  return (
    <Cockpit>
      <LeftColumn>
        <SplitBar data-testid="split-presets">
          {SPLIT_ORDER.map((name) => (
            <SplitBtn
              key={name}
              data-split={name}
              $on={split === name}
              onClick={() => setSplit(name)}
            >
              {name}
            </SplitBtn>
          ))}
        </SplitBar>
        <Focal $grow={ratio.focal}>{focal}</Focal>
        <GameTerminal $grow={ratio.feed} data-testid="world-feed">
          <Terminal
            frames={gameFrames}
            onCommandClick={onCommandClick}
            onCommandPreview={onCommandPreview}
          />
        </GameTerminal>
        <CommandBar
          barId="stream-game"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </LeftColumn>
      <SideColumn $wide={railWide}>
        <TunedRail
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
        <RailTitle>Stream chat</RailTitle>
        <Terminal
          frames={chatFrames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        {/* The chat terminal's own bar — its own barId, so its mode is
            independent of the game bar (e.g. scoped to `twitch`). */}
        <CommandBar
          barId="stream-chat"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </SideColumn>
    </Cockpit>
  );
}
