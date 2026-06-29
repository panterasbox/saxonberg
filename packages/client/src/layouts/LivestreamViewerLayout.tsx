/**
 * LivestreamViewerLayout — watch a broadcast inside the cockpit.
 *
 * A Focal split: the 16:9 video embed sizes first and a compressed game
 * terminal fills beneath it (the never-blind law — live play stays
 * legible while you watch), with a livestream-chat terminal as the side
 * rail. The two terminals partition the one shared frame buffer by topic
 * — an allowlist for the chat relay topics (`world.twitch.message`,
 * `world.youtube.message`) and its complement for the game — entirely
 * client-side, no ingest-time routing.
 *
 * The broadcast sources come from the server (`broadcastSources`,
 * welcome snapshot + live push). The always-on minimum command bar sits
 * at the primary column's foot. (The chat terminal gains its own
 * command bar in Phase 4, when per-bar input mode + `barId` land.)
 */

import React from "react";
import styled from "styled-components";
import { useStore, type Frame as ConsoleFrame } from "../store/index";
import type { LayoutProps } from "./types";
import { Cockpit, LeftColumn, tokens } from "./primitives";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";
import { StreamEmbed } from "../components/embed/StreamEmbed";

/** The livestream-chat relay topics the chat terminal allowlists. */
const CHAT_TOPICS = new Set([
  "world.twitch.message",
  "world.youtube.message",
]);

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

export const LivestreamViewerLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
  baseValue,
  onBaseChange,
  flashing,
  previewing,
}) => {
  const sources = useStore((s) => s.broadcastSources);
  const chatFrames = frames.filter(isChatFrame);
  const gameFrames = frames.filter((f) => !isChatFrame(f));

  return (
    <Cockpit>
      <LeftColumn>
        <StreamEmbed sources={sources} />
        <GameTerminal>
          <Terminal
            frames={gameFrames}
            onCommandClick={onCommandClick}
            onCommandPreview={onCommandPreview}
          />
        </GameTerminal>
        <CommandBar
          baseValue={baseValue}
          onBaseChange={onBaseChange}
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
          flashing={flashing}
          previewing={previewing}
        />
      </LeftColumn>
      <Rail>
        <RailTitle>Stream chat</RailTitle>
        <Terminal
          frames={chatFrames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
      </Rail>
    </Cockpit>
  );
};
