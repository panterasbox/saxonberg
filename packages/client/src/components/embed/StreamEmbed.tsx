/**
 * StreamEmbed — the platform-agnostic video embed for the livestream-
 * viewer layout.
 *
 * Renders the player-selected broadcast source as a sandboxed iframe.
 * Twitch is wired (the Twitch player, with `parent` derived from the
 * host domain — correct-by-construction, never hard-coded, satisfying
 * the embed-safety constraint). YouTube's shape is defined and the
 * picker accommodates it, but the iframe is a "coming soon" placeholder
 * this cycle.
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
  min-width: 0;
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

/** 16:9 fixed-ratio frame; the iframe / placeholder fills it absolutely. */
const Stage = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;

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
          <Placeholder>No broadcast is live right now.</Placeholder>
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
          <Placeholder>
            YouTube embeds are coming soon ({source.videoId}).
          </Placeholder>
        )}
      </Stage>
    </Wrap>
  );
}
