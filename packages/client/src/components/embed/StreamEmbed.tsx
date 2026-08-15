/**
 * StreamEmbed — the platform-agnostic video embed for the livestream-
 * viewer layout.
 *
 * Renders the viewer's `watch`-selected target as a sandboxed iframe. The
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
 * box claims its aspect and the surrounding panes fill the remainder.
 */

import React from "react";
import styled from "styled-components";
import type { WatchTarget } from "@saxonberg/types";
import { tokens } from "../ui";

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

const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

interface StreamEmbedProps {
  target: WatchTarget | null;
}

function iframeFor(target: WatchTarget): JSX.Element {
  if (target.platform === "twitch") {
    return (
      <iframe
        title="Twitch stream"
        src={`https://player.twitch.tv/?channel=${encodeURIComponent(
          target.channel,
        )}&parent=${window.location.hostname}`}
        sandbox={IFRAME_SANDBOX}
        allow="autoplay; fullscreen"
      />
    );
  }
  if (target.platform === "kick") {
    // Muted autoplay so the embed starts under every browser autoplay
    // policy; the Kick player renders offline channels gracefully.
    return (
      <iframe
        title="Kick stream"
        src={`https://player.kick.com/${encodeURIComponent(
          target.channel,
        )}?autoplay=true&muted=true`}
        sandbox={IFRAME_SANDBOX}
        allow="autoplay; fullscreen"
      />
    );
  }
  const src =
    "videoId" in target
      ? `https://www.youtube.com/embed/${encodeURIComponent(target.videoId)}`
      : `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(
          target.channelId,
        )}`;
  return (
    <iframe
      title="YouTube stream"
      src={src}
      sandbox={IFRAME_SANDBOX}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
    />
  );
}

export function StreamEmbed({ target }: StreamEmbedProps): JSX.Element {
  return (
    <Wrap>
      <Stage>
        <Screen>
          {target ? (
            iframeFor(target)
          ) : (
            <Placeholder>
              Nothing on the screen — use the watch command to put a
              broadcast here.
            </Placeholder>
          )}
        </Screen>
      </Stage>
    </Wrap>
  );
}
