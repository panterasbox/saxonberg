/**
 * PlayerDock — the DOCK: the one place the video sits on every screen before
 * the world (stream arrival D3, reworked in review 11-24).
 *
 * ⭐ "Docked" means the SAME PLACE on every page, and the page makes room for
 * it — never a box floating over content. Each pre-world screen (the front
 * page, the roster, creation) lays this out at its top right, at one size,
 * and its own content flows around it. The one `StreamPlayer` follows the
 * slot inside; a screen with no dock shows no video.
 *
 * When the arrival has nothing to play (no carrier, off air, closed), the
 * box shows its `fallback` instead (the front page's `@` tile), or nothing.
 */

import React from "react";
import styled from "styled-components";
import type { WatchTarget } from "@saxonberg/types";
import { useStore } from "../../store";
import { arrival, targetOfListing } from "../../services/arrival";
import { tokens } from "../ui";
import { PlayerSlot } from "./PlayerSlot";

/** The dock's width: small, the same on every screen; a phone gets its width. */
export const DOCK_WIDTH_REM = 22;

const Box = styled.div`
  position: relative;
  flex: none;
  width: 100%;
  max-width: ${DOCK_WIDTH_REM}rem;
  aspect-ratio: 16 / 9;
  background: ${tokens.color.surfaceSunken};
  border-radius: 6px;
  overflow: hidden;
`;

/** What the arrival plays before the world, or null. */
export function useArrivalTarget(): WatchTarget | null {
  const front = useStore((s) => s.front);
  const closed = useStore((s) => s.playerClosed);
  const show = front?.show;
  if (closed || !show?.live) return null;
  return targetOfListing(show, arrival().carrier);
}

export function PlayerDock({ fallback = null }: { fallback?: React.ReactNode }): JSX.Element | null {
  const target = useArrivalTarget();
  if (!target && !fallback) return null;
  return (
    <Box data-testid="player-dock" data-show-playing={target ? "true" : undefined}>
      {target ? <PlayerSlot place="dock" /> : fallback}
    </Box>
  );
}
