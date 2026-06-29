/**
 * LivestreamPanes — the shared body of the livestream-viewer and streamer
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
import { Cockpit, LeftColumn, tokens } from "./primitives";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";

/** The livestream-chat relay topics the chat terminal allowlists. */
const CHAT_TOPICS = new Set(["world.twitch.message", "world.youtube.message"]);

function isChatFrame(f: ConsoleFrame): boolean {
  return CHAT_TOPICS.has(f.topic);
}

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  width: 22rem;
  min-width: 16rem;
  border-left: 1px solid ${tokens.color.border};
`;

const RailTitle = styled.div`
  padding: ${tokens.space.sm} ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  border-bottom: 1px solid ${tokens.color.border};
`;

/** The compressed game terminal — floored at a legible minimum height. */
const GameTerminal = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 8rem;
`;

interface LivestreamPanesProps extends LayoutProps {
  /** The focal pane — the video embed (viewer) or a stats placeholder. */
  focal: React.ReactNode;
}

export function LivestreamPanes({
  focal,
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
}: LivestreamPanesProps): JSX.Element {
  const chatFrames = frames.filter(isChatFrame);
  const gameFrames = frames.filter((f) => !isChatFrame(f));

  return (
    <Cockpit>
      <LeftColumn>
        {focal}
        <GameTerminal>
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
      <Rail>
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
      </Rail>
    </Cockpit>
  );
}
