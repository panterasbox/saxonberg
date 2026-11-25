/**
 * ShowTile — the front page's show, in the DOCK (stream arrival D14, D3;
 * reworked in review 11-24: *"the video screen on the homepage is supposed
 * to be small"*).
 *
 * Reads the anonymous `/api/front` answer (the store's `front`). ⭐ Only a
 * program somebody filed and the Compact featured — or the one a link
 * named — is ever here, and only its PROVEN feeds. It sits at the hero's
 * top right, at the dock's size — the same place the video holds on the
 * roster and in creation:
 *
 * - **live, and the visitor came from a carrier it is on** → the video;
 * - **live, otherwise** → the `@` tile and *Sign in to watch it inside
 *   Saxonberg.*;
 * - **off air** → the `@` tile and the next show, or *Offline* alone.
 *
 * The whole tile is absent when the answer carries no `show`.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store";
import { arrival } from "../../services/arrival";
import { PlayerDock } from "../embed/PlayerDock";
import { tokens } from "../ui";

const Section = styled.section`
  width: 100%;
`;

/** The thumbnail when the video is not playing here: black, as the design. */
const Thumb = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: ${tokens.color.terminal};
  border: 1px solid ${tokens.color.border};
  border-radius: 3px;
  color: ${tokens.color.terminalFg};
  font-family: ${tokens.font.mono};
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  padding: 12px;
`;

const LiveBadge = styled.span`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 1px 6px;
  background: ${tokens.color.seal};
  color: ${tokens.color.sealInk};
  border: 1px solid ${tokens.color.sealInk};
  border-radius: 3px;
  font-family: ${tokens.font.family};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Byline = styled.div`
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding-top: 9px;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 13.5px;
  line-height: 1.3;
`;

const Owner = styled.div`
  font-size: 12.5px;
  color: ${tokens.color.fgDim};
`;

const TileAction = styled.p`
  margin: 6px 0 0;
  font-size: 12px;
  color: ${tokens.color.fgMuted};
`;

/** The `@` in phosphor pixels — the design's off-air glyph and avatar. */
function PixelAt({ size, glow = false }: { size: number; glow?: boolean }): JSX.Element {
  const rows: Array<[number, number, number]> = [
    [9.5, 5.925, 5], [8.5, 7.275, 2], [13.5, 7.275, 2], [8.5, 8.625, 2], [13.5, 8.625, 2],
    [8.5, 9.975, 2], [11.5, 9.975, 4], [8.5, 11.325, 2], [11.5, 11.325, 4], [8.5, 12.675, 2],
    [11.5, 12.675, 4], [8.5, 14.025, 2], [11.5, 14.025, 3], [8.5, 15.375, 2], [9.5, 16.725, 5],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges">
      {glow ? (
        <defs>
          <filter id="fp-phosphor" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      ) : null}
      <g fill={tokens.color.terminalFg} filter={glow ? "url(#fp-phosphor)" : undefined}>
        {rows.map(([x, y, w]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1.35} />
        ))}
      </g>
    </svg>
  );
}

const Avatar = styled.span<{ $live: boolean }>`
  flex: none;
  display: inline-flex;
  border-radius: 50%;
  background: ${tokens.color.terminal};
  border: 2px solid ${(p) => (p.$live ? tokens.color.seal : tokens.color.border)};
  overflow: hidden;
`;

const VIA = { twitch: "Twitch", youtube: "Google", kick: "Kick" } as const;

export function ShowTile(): JSX.Element | null {
  const show = useStore((s) => s.front?.show ?? null);
  if (!show) return null;
  const carrier = arrival().carrier;
  const thumb = show.live ? (
    <Thumb data-testid="show-tile">
      <LiveBadge>Live</LiveBadge>
      <PixelAt size={56} glow />
      <span>On the air now</span>
    </Thumb>
  ) : (
    <Thumb data-testid="show-offline">
      <PixelAt size={72} glow />
      <span>{show.nextShow ? `Offline · next show ${show.nextShow}` : "Offline"}</span>
    </Thumb>
  );
  return (
    <Section aria-labelledby="fp-show" data-testid="show-band">
      <PlayerDock fallback={thumb} />
      <Byline>
        <Avatar $live={show.live}>
          <PixelAt size={28} />
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Title id="fp-show">{show.title}</Title>
          {show.ownerName ? <Owner>{show.ownerName}</Owner> : null}
        </div>
      </Byline>
      <TileAction>
        {carrier
          ? `Sign in with ${VIA[carrier]} and keep watching inside Saxonberg.`
          : "Sign in to watch it inside Saxonberg."}
      </TileAction>
    </Section>
  );
}

/** Where a carrier shows a program's channel — the footer's links. */
export function carrierLinkOf(carrier: "twitch" | "youtube" | "kick", channel: string): string {
  if (carrier === "twitch") return `https://www.twitch.tv/${encodeURIComponent(channel)}`;
  if (carrier === "kick") return `https://kick.com/${encodeURIComponent(channel)}`;
  return `https://www.youtube.com/channel/${encodeURIComponent(channel)}`;
}
