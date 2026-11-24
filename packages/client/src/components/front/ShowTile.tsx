/**
 * ShowTile — the front page's show band (stream arrival D14, D3).
 *
 * Reads the anonymous `/api/front` answer (the store's `front`). ⭐ Only a
 * program somebody filed and the Compact featured — or the one a link
 * named — is ever here, and only its PROVEN feeds:
 *
 * - **live, and the visitor came from a carrier it is on** → the one
 *   player's slot (`PlayerSlot`): the video plays right here, and follows
 *   them into select and creation docked;
 * - **live, otherwise** → the tile, and *Sign in to watch it inside
 *   Saxonberg.*;
 * - **off air** → the offline tile: the brand's `@` and the next show, or
 *   *Offline* alone.
 *
 * The whole band is absent when the answer carries no `show`.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store";
import { arrival, targetOfListing } from "../../services/arrival";
import { PlayerSlot } from "../embed/PlayerSlot";
import { tokens } from "../ui";
import { SectionLabel } from "./Bands";

const Tile = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  background: ${tokens.color.surfaceSunken};
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const At = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: 64px;
  line-height: 1;
  color: ${tokens.color.accent};
  text-shadow: 0 0 18px ${tokens.color.accent};
`;

const TileNote = styled.div`
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  margin-top: ${tokens.space.sm};
`;

const Title = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: 1.25rem;
  margin-top: ${tokens.space.sm};
`;

const Owner = styled.div`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

const Live = styled.span`
  color: ${tokens.color.accent};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  margin-left: ${tokens.space.sm};
`;

export function ShowTile(): JSX.Element | null {
  const show = useStore((s) => s.front?.show ?? null);
  const closed = useStore((s) => s.playerClosed);
  if (!show) return null;
  const playing = show.live && !closed && targetOfListing(show, arrival().carrier) !== null;
  return (
    <div>
      <SectionLabel>The show</SectionLabel>
      {playing ? (
        <Tile data-testid="show-tile" data-show-playing="true">
          <PlayerSlot />
        </Tile>
      ) : show.live ? (
        <Tile data-testid="show-tile">
          <div>
            <At aria-hidden="true">@</At>
            <TileNote>On the air now. Sign in to watch it inside Saxonberg.</TileNote>
          </div>
        </Tile>
      ) : (
        <Tile data-testid="show-offline">
          <div>
            <At aria-hidden="true">@</At>
            <TileNote>{show.nextShow ? `Next: ${show.nextShow}` : "Offline"}</TileNote>
          </div>
        </Tile>
      )}
      <Title>
        {show.title}
        {show.live ? <Live>● on the air</Live> : null}
      </Title>
      {show.ownerName ? <Owner>{show.ownerName}</Owner> : null}
    </div>
  );
}

/** Where a carrier shows a program's channel — the footer's links. */
export function carrierLinkOf(carrier: "twitch" | "youtube" | "kick", channel: string): string {
  if (carrier === "twitch") return `https://www.twitch.tv/${encodeURIComponent(channel)}`;
  if (carrier === "kick") return `https://kick.com/${encodeURIComponent(channel)}`;
  return `https://www.youtube.com/channel/${encodeURIComponent(channel)}`;
}
