/**
 * StreamEmbed — the platform-agnostic video embed for the livestream-
 * viewer layout.
 *
 * Renders the player-selected broadcast source as a sandboxed iframe.
 * Both platforms are wired: Twitch uses the Twitch player (with `parent`
 * derived from the host domain — correct-by-construction, never hard-
 * coded, satisfying the embed-safety constraint); YouTube uses the
 * standard `/embed/<videoId>` player. When both a Twitch and a YouTube
 * source are configured the picker lets the viewer choose which to
 * watch.
 *
 * When more than one source is configured the viewer picks the platform;
 * with one source the picker is suppressed (a no-op). Fixed-ratio (16:9)
 * content sizes first per the composition grammar — the box claims its
 * aspect and the surrounding panes fill the remainder.
 */

import React, { useState } from "react";
import styled from "styled-components";
import type { StreamSource } from "@saxonberg/types";
import { tokens } from "../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
`;

const PickerRow = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm};
`;

const PickerButton = styled.button<{ $active: boolean }>`
  padding: 0.15rem 0.6rem;
  background: ${(p) =>
    p.$active ? tokens.color.primary : tokens.color.actionBg};
  color: ${(p) => (p.$active ? "white" : tokens.color.fg)};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  cursor: pointer;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};

  &:hover {
    background: ${(p) =>
      p.$active ? tokens.color.primaryHover : tokens.color.actionBgHover};
  }
`;

/**
 * The black stage that fills the focal allotment. The 16:9 screen inside
 * is *contained* (letterboxed) within it — height-bound when the
 * allotment is wide, width-bound when it's tall — so the video is as big
 * as the focal split allows without ever cropping or overflowing.
 */
const Stage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
`;

const Screen = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  height: 100%;
  max-width: 100%;

  > iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
`;

const Placeholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  text-align: center;
  padding: ${tokens.space.xl};
`;

function platformLabel(source: StreamSource): string {
  return source.platform === "twitch"
    ? `Twitch · ${source.channel}`
    : `YouTube · ${source.videoId}`;
}

interface StreamEmbedProps {
  sources: StreamSource[];
}

export function StreamEmbed({ sources }: StreamEmbedProps): JSX.Element {
  const [selected, setSelected] = useState(0);

  if (sources.length === 0) {
    return (
      <Wrap>
        <Stage>
          <Screen>
            <Placeholder>No broadcast is live right now.</Placeholder>
          </Screen>
        </Stage>
      </Wrap>
    );
  }

  const source = sources[Math.min(selected, sources.length - 1)]!;

  return (
    <Wrap>
      {sources.length > 1 ? (
        <PickerRow>
          {sources.map((s, i) => (
            <PickerButton
              key={`${s.platform}-${i}`}
              $active={i === selected}
              onClick={() => setSelected(i)}
            >
              {platformLabel(s)}
            </PickerButton>
          ))}
        </PickerRow>
      ) : null}
      <Stage>
        <Screen>
          {source.platform === "twitch" ? (
            <iframe
              title="Twitch stream"
              src={`https://player.twitch.tv/?channel=${encodeURIComponent(
                source.channel,
              )}&parent=${window.location.hostname}`}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              allow="autoplay; fullscreen"
            />
          ) : (
            <iframe
              title="YouTube stream"
              src={`https://www.youtube.com/embed/${encodeURIComponent(
                source.videoId,
              )}`}
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            />
          )}
        </Screen>
      </Stage>
    </Wrap>
  );
}
