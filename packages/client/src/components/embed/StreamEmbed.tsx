/**
 * StreamEmbed — the platform-agnostic video embed for the livestream-
 * viewer layout.
 *
 * Renders the stage for the viewer's `watch`-selected target. ⭐ The iframe
 * itself is the one `StreamPlayer` above every screen (stream arrival D3);
 * this registers its `PlayerSlot` where the video goes. The
 * target is a single server-authoritative `WatchTarget` (the per-viewer
 * `cockpit.watch` clientState) — there is no picker; the `watch` verb is
 * the one control.
 *
 * ⚠ **All THREE platforms are wired.** This paragraph read "Both
 * platforms are wired" above a three-way switch for a whole build after
 * Kick landed, and an audit believed the comment over the code and
 * reported Kick as a gap. A stale comment is worse than no comment: it
 * is confidently actionable and false.
 *
 *  - **Twitch** — the Twitch player, with `parent` derived from the host
 *    domain (correct-by-construction, never hard-coded, which is what
 *    satisfies the embed-safety constraint).
 *  - **YouTube** — `/embed/<videoId>`, or `/embed/live_stream?channel=
 *    <channelId>` for the durable channel form.
 *  - **Kick** — `player.kick.com/<slug>`, which renders an offline
 *    channel gracefully.
 *
 * Fixed-ratio (16:9) content sizes first per the composition grammar — the
 * box claims its aspect and the surrounding cards fill the remainder.
 */

import React from "react";
import styled from "styled-components";
import type { WatchTarget } from "@saxonberg/types";
import { tokens } from "../ui";
import { PlayerSlot } from "./PlayerSlot";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
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
  background: ${tokens.color.surfaceSunken};
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

/**
 * The shared-display caption: "on <label>" under a screen that is not the
 * viewer's own `watch`. The server wrote the target for everyone who can
 * see the screen; whoever holds the remote clears it, not `watch off`.
 */
const Caption = styled.div`
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.sm};
`;

interface StreamEmbedProps {
  target: WatchTarget | null;
}

export function StreamEmbed({ target }: StreamEmbedProps): JSX.Element {
  const display = target?.display ?? null;
  return (
    <Wrap>
      <Stage>
        <Screen>
          {target ? (
            // ⭐ The slot, not the iframe (stream arrival D3): the one
            // player above every screen follows this box, so changing
            // layout never reloads the video.
            <PlayerSlot />
          ) : (
            <Placeholder>
              Nothing on the screen — use the watch command to put a
              broadcast here.
            </Placeholder>
          )}
        </Screen>
      </Stage>
      {display ? (
        <Caption data-testid="display-caption">
          on {display.label} — whoever holds the remote switches it off
        </Caption>
      ) : null}
    </Wrap>
  );
}
