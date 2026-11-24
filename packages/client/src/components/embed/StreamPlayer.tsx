/**
 * StreamPlayer — the ONE carrier iframe in the client (stream arrival D3).
 *
 * ⭐ Mounted once, above the phase switch (a sibling of `App`'s screen), and
 * its parent never changes — so no phase, layout or slot change reloads the
 * video. It is a `position: fixed` box that takes its rectangle from the slot
 * a `PlayerSlot` registered (the front page's show tile, watch mode's stage,
 * the phone's video box), or, with none, the DOCK in the bottom-right corner.
 * The iframe is keyed by its `src`, and `src` is one function of (target,
 * muted): only a different video or our sound control ever reloads it.
 *
 * What it plays:
 * - **before the world** — the arrival target: the tab's carrier × the
 *   front page's program's feed on it, only while the program is live and
 *   the visitor has not closed it;
 * - **in the world** — `cockpit.watch`, and only where there is somewhere
 *   to show it: a registered slot, or watch mode with no slot yet (the
 *   frames before the stage's slot registers). There is no dock while
 *   exploring (watch-slate § 8 is the open question).
 */

import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import type { WatchTarget } from "@saxonberg/types";
import { useStore } from "../../store";
import { arrival, targetOfListing } from "../../services/arrival";
import { tokens } from "../ui";

const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

/** The dock's width on a desktop; a phone gets what its screen allows. */
const DOCK_WIDTH = 400;
const DOCK_GAP = 16;

/**
 * ⭐ The embed URL — one function of (target, muted). Twitch and YouTube
 * take mute and autoplay flags; Kick's player always starts muted.
 */
export function srcFor(target: WatchTarget, muted: boolean, host = window.location.hostname): string {
  if (target.platform === "twitch") {
    return `https://player.twitch.tv/?channel=${encodeURIComponent(target.channel)}&parent=${host}&autoplay=true&muted=${muted ? "true" : "false"}`;
  }
  if (target.platform === "kick") {
    return `https://player.kick.com/${encodeURIComponent(target.channel)}?autoplay=true&muted=${muted ? "true" : "false"}`;
  }
  const base =
    "videoId" in target
      ? `https://www.youtube.com/embed/${encodeURIComponent(target.videoId)}`
      : `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(target.channelId)}`;
  return `${base}${base.includes("?") ? "&" : "?"}autoplay=1&mute=${muted ? "1" : "0"}`;
}

/** The title an iframe reads (accessibility), per carrier. */
function titleOf(target: WatchTarget): string {
  return target.platform === "twitch"
    ? "Twitch stream"
    : target.platform === "kick"
      ? "Kick stream"
      : "YouTube stream";
}

const Box = styled.div`
  position: fixed;
  z-index: 40;
  background: ${tokens.color.surfaceSunken};
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
  border-radius: 6px;
  overflow: hidden;

  > iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
  &[data-player-place="slot"] {
    border-radius: 0;
    box-shadow: none;
  }
`;

const Controls = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 6px;
  z-index: 1;
`;

const Control = styled.button`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
`;

/** What the player plays right now, and whether it may sit in the dock. */
function useWhat(): { target: WatchTarget | null; mayDock: boolean } {
  const phase = useStore((s) => s.connectionPhase);
  const front = useStore((s) => s.front);
  const closed = useStore((s) => s.playerClosed);
  const watch = useStore((s) => (s.clientState["cockpit.watch"] as WatchTarget | null | undefined) ?? null);
  const mode = useStore((s) => s.clientState["cockpit.mode"] as string | null | undefined);
  if (phase === "in-world") {
    return { target: watch, mayDock: mode === "watch" };
  }
  const show = front?.show;
  if (closed || !show?.live) return { target: null, mayDock: false };
  return { target: targetOfListing(show, arrival().carrier), mayDock: true };
}

export function StreamPlayer(): JSX.Element | null {
  const { target, mayDock } = useWhat();
  const slot = useStore((s) => s.playerSlot);
  const muted = useStore((s) => s.playerMuted);
  const setMuted = useStore((s) => s.setPlayerMuted);
  const close = useStore((s) => s.closePlayer);
  const phase = useStore((s) => s.connectionPhase);

  // ⭐ A NEW in-world target the player typed (`watch …`) is heard: it is
  // not the arrival's video, so it unmutes. The arrival's target equals the
  // one playing, so arriving changes nothing.
  const lastSrcTarget = useRef<string | null>(null);
  const key = target ? JSON.stringify({ ...target, display: undefined }) : null;
  useEffect(() => {
    if (phase === "in-world" && key !== null && lastSrcTarget.current !== null && key !== lastSrcTarget.current) {
      setMuted(false);
    }
    if (key !== null) lastSrcTarget.current = key;
  }, [key, phase, setMuted]);

  // ⭐ `watch off` in the world (the server clearing a PERSONAL
  // `cockpit.watch` the player was on — never a shared display's marker)
  // closes the video for the visit (D3).
  const personal = useStore((s) => {
    const w = s.clientState["cockpit.watch"] as WatchTarget | null | undefined;
    return w ? (w.display ? "display" : "personal") : "none";
  });
  const closePlayer = useStore((s) => s.closePlayer);
  const wasPersonal = useRef(false);
  useEffect(() => {
    if (phase !== "in-world") return;
    if (wasPersonal.current && personal === "none") closePlayer();
    wasPersonal.current = personal === "personal";
  }, [personal, phase, closePlayer]);

  // ⭐ Docked before the world, the page keeps the dock's height free at its
  // foot, so the video never covers the last control (`chargen-confirm`).
  const docked = target !== null && slot === null && mayDock && phase !== "in-world";
  useEffect(() => {
    if (!docked) return;
    const prev = document.body.style.paddingBottom;
    const w = Math.min(DOCK_WIDTH, window.innerWidth - 2 * DOCK_GAP);
    document.body.style.paddingBottom = `${Math.round((w * 9) / 16) + 2 * DOCK_GAP}px`;
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [docked]);

  if (!target) return null;
  if (!slot && !mayDock) return null;

  const width = Math.min(DOCK_WIDTH, window.innerWidth - 2 * DOCK_GAP);
  const rect = slot ?? {
    width,
    height: Math.round((width * 9) / 16),
    left: window.innerWidth - width - DOCK_GAP,
    top: window.innerHeight - Math.round((width * 9) / 16) - DOCK_GAP,
  };
  const src = srcFor(target, muted);
  return (
    <Box
      data-testid="stream-player"
      data-player-place={slot ? "slot" : "dock"}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <iframe
        key={src}
        title={titleOf(target)}
        src={src}
        sandbox={IFRAME_SANDBOX}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      />
      <Controls>
        {muted ? (
          <Control type="button" data-testid="stream-player-unmute" onClick={() => setMuted(false)}>
            sound on
          </Control>
        ) : null}
        {phase !== "in-world" ? (
          <Control type="button" data-testid="stream-player-close" aria-label="Close the video" onClick={close}>
            ✕
          </Control>
        ) : null}
      </Controls>
    </Box>
  );
}
